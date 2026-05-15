import argparse
import csv
import json
import os
import sys
from typing import Dict, List, Tuple

import numpy as np
import trimesh
from scipy.spatial import cKDTree

try:
    import open3d as o3d
except ImportError as exc:
    raise RuntimeError(
        "This script requires open3d. Install it on wisp with: "
        ".mesh_cleanup_venv/bin/python -m pip install open3d"
    ) from exc


def log(message: str) -> None:
    print(f"[mesh_evaluation] {message}", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Globally align and evaluate two reconstructed meshes")
    parser.add_argument("--reference", required=True, help="Reference mesh path")
    parser.add_argument("--candidate", required=True, help="Candidate mesh path")
    parser.add_argument("--out", required=True, help="Output folder")
    parser.add_argument("--samples", type=int, default=200000, help="Surface sample count for final metrics")
    parser.add_argument("--alignment-samples", type=int, default=120000, help="Surface sample count for registration")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--align", choices=["similarity", "rigid"], default="similarity")
    parser.add_argument("--alignment-geometry", choices=["largest-component", "full"], default="largest-component")
    parser.add_argument("--voxel-sizes", default="0.025,0.035,0.05,0.07")
    parser.add_argument("--ransac-iterations", type=int, default=250000)
    parser.add_argument("--icp-iterations", type=int, default=120)
    parser.add_argument("--trim-fraction", type=float, default=0.70)
    parser.add_argument("--no-outlier-removal", action="store_true")
    return parser.parse_args()


def load_mesh(mesh_path: str, label: str) -> trimesh.Trimesh:
    if not os.path.isfile(mesh_path):
        raise RuntimeError(f"{label} mesh does not exist: {mesh_path}")

    loaded = trimesh.load(mesh_path, force="mesh", process=False, skip_materials=True)
    if isinstance(loaded, trimesh.Scene):
        geometries = [
            trimesh.Trimesh(vertices=geometry.vertices, faces=geometry.faces, process=False)
            for geometry in loaded.geometry.values()
            if isinstance(geometry, trimesh.Trimesh) and len(geometry.vertices) > 0 and len(geometry.faces) > 0
        ]
        if not geometries:
            raise RuntimeError(f"{label} scene contains no mesh geometry")
        loaded = trimesh.util.concatenate(geometries)

    if not isinstance(loaded, trimesh.Trimesh):
        raise RuntimeError(f"{label} input is not a mesh")

    mesh = trimesh.Trimesh(vertices=loaded.vertices, faces=loaded.faces, process=False)
    if len(mesh.vertices) == 0 or len(mesh.faces) == 0:
        raise RuntimeError(f"{label} mesh is empty")
    return mesh


def largest_component(mesh: trimesh.Trimesh, label: str) -> trimesh.Trimesh:
    components = [
        component
        for component in mesh.split(only_watertight=False)
        if isinstance(component, trimesh.Trimesh) and len(component.vertices) > 0 and len(component.faces) > 0
    ]
    if not components:
        raise RuntimeError(f"{label} mesh produced no connected components")

    largest = max(components, key=lambda component: len(component.vertices))
    log(
        f"{label} alignment component: vertices={len(largest.vertices)}/{len(mesh.vertices)}, "
        f"triangles={len(largest.faces)}/{len(mesh.faces)}, components={len(components)}"
    )
    return largest


def alignment_mesh(mesh: trimesh.Trimesh, label: str, mode: str) -> trimesh.Trimesh:
    if mode == "full":
        return mesh
    return largest_component(mesh, label)


def sample_surface(mesh: trimesh.Trimesh, count: int, label: str) -> np.ndarray:
    if count < 100:
        raise RuntimeError("Sample count must be at least 100")
    points, _ = trimesh.sample.sample_surface(mesh, count)
    points = np.asarray(points, dtype=np.float64)
    if len(points) < 100:
        raise RuntimeError(f"{label} mesh produced too few sampled points")
    return points


def normalize_points(points: np.ndarray, scale_mode: str, shared_scale: float = 1.0) -> Tuple[np.ndarray, np.ndarray, float]:
    center = points.mean(axis=0)
    if scale_mode == "shared":
        scale = shared_scale
    else:
        radius = np.linalg.norm(points - center, axis=1)
        scale = float(np.sqrt(np.mean(radius * radius)))
    scale = max(scale, 1e-12)
    return (points - center) / scale, center, scale


def make_cloud(points: np.ndarray) -> o3d.geometry.PointCloud:
    cloud = o3d.geometry.PointCloud()
    cloud.points = o3d.utility.Vector3dVector(points)
    return cloud


def remove_outliers(points: np.ndarray, label: str, enabled: bool) -> np.ndarray:
    if not enabled:
        return points
    cloud = make_cloud(points)
    filtered, _ = cloud.remove_statistical_outlier(nb_neighbors=24, std_ratio=2.0)
    filtered_points = np.asarray(filtered.points)
    if len(filtered_points) < 100:
        log(f"{label} outlier removal skipped because it removed too much")
        return points
    log(f"{label} outlier removal: kept={len(filtered_points)}/{len(points)}")
    return filtered_points


def prepare_features(points: np.ndarray, voxel_size: float) -> Tuple[o3d.geometry.PointCloud, o3d.pipelines.registration.Feature]:
    cloud = make_cloud(points)
    down = cloud.voxel_down_sample(voxel_size)
    if len(down.points) < 50:
        raise RuntimeError(f"Voxel size {voxel_size} left too few alignment points")

    down.estimate_normals(
        o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size * 2.5, max_nn=40)
    )
    features = o3d.pipelines.registration.compute_fpfh_feature(
        down,
        o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size * 6.0, max_nn=120),
    )
    return down, features


def trimmed_mean(distances: np.ndarray, fraction: float) -> float:
    if not 0.0 < fraction <= 1.0:
        raise RuntimeError("--trim-fraction must be greater than 0 and at most 1")
    keep_count = max(3, min(len(distances), int(len(distances) * fraction)))
    return float(np.mean(np.partition(distances, keep_count - 1)[:keep_count]))


def score_transform(source_points: np.ndarray, target_points: np.ndarray, transform: np.ndarray, trim_fraction: float) -> float:
    transformed = apply_transform(source_points, transform)
    source_to_target = cKDTree(target_points).query(transformed, workers=-1)[0]
    target_to_source = cKDTree(transformed).query(target_points, workers=-1)[0]
    return float((trimmed_mean(source_to_target, trim_fraction) + trimmed_mean(target_to_source, trim_fraction)) / 2.0)


def strict_overlap_score(
    source_points: np.ndarray,
    target_points: np.ndarray,
    transform: np.ndarray,
    trim_fraction: float,
    threshold: float,
) -> Tuple[float, float, float]:
    transformed = apply_transform(source_points, transform)
    source_to_target = cKDTree(target_points).query(transformed, workers=-1)[0]
    target_to_source = cKDTree(transformed).query(target_points, workers=-1)[0]
    symmetric = np.concatenate([source_to_target, target_to_source])

    trimmed = float((trimmed_mean(source_to_target, trim_fraction) + trimmed_mean(target_to_source, trim_fraction)) / 2.0)
    percentile_90 = float(np.percentile(symmetric, 90))
    overlap = float(np.mean(symmetric <= threshold))
    score = trimmed + 0.25 * percentile_90 + 0.25 * threshold * (1.0 - overlap)
    return score, trimmed, overlap


def principal_axis(points: np.ndarray) -> np.ndarray:
    centered = points - points.mean(axis=0)
    covariance = np.cov(centered, rowvar=False)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    axis = eigenvectors[:, int(np.argmax(eigenvalues))]
    norm = np.linalg.norm(axis)
    if norm < 1e-12:
        return np.array([0.0, 0.0, 1.0], dtype=np.float64)
    return axis / norm


def axis_angle_matrix(axis: np.ndarray, angle_degrees: float) -> np.ndarray:
    axis = axis / max(np.linalg.norm(axis), 1e-12)
    angle = np.deg2rad(angle_degrees)
    x, y, z = axis
    skew = np.array(
        [
            [0.0, -z, y],
            [z, 0.0, -x],
            [-y, x, 0.0],
        ],
        dtype=np.float64,
    )
    return np.eye(3) + np.sin(angle) * skew + (1.0 - np.cos(angle)) * (skew @ skew)


def compose_target_space_rotation(transform: np.ndarray, axis: np.ndarray, angle_degrees: float) -> np.ndarray:
    rotation = axis_angle_matrix(axis, angle_degrees)
    yaw_transform = np.eye(4)
    yaw_transform[:3, :3] = rotation
    return yaw_transform @ transform


def run_registration_for_voxel(
    source_points: np.ndarray,
    target_points: np.ndarray,
    voxel_size: float,
    ransac_iterations: int,
    icp_iterations: int,
    trim_fraction: float,
) -> Tuple[np.ndarray, Dict[str, float]]:
    source_down, source_features = prepare_features(source_points, voxel_size)
    target_down, target_features = prepare_features(target_points, voxel_size)

    distance_threshold = voxel_size * 2.0
    ransac = o3d.pipelines.registration.registration_ransac_based_on_feature_matching(
        source_down,
        target_down,
        source_features,
        target_features,
        True,
        distance_threshold,
        o3d.pipelines.registration.TransformationEstimationPointToPoint(False),
        4,
        [
            o3d.pipelines.registration.CorrespondenceCheckerBasedOnEdgeLength(0.9),
            o3d.pipelines.registration.CorrespondenceCheckerBasedOnDistance(distance_threshold),
        ],
        o3d.pipelines.registration.RANSACConvergenceCriteria(ransac_iterations, 0.999),
    )

    source_cloud = make_cloud(source_points)
    target_cloud = make_cloud(target_points)
    source_cloud.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size * 2.5, max_nn=40))
    target_cloud.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size * 2.5, max_nn=40))

    target_axis = principal_axis(target_points)
    overlap_threshold = voxel_size * 1.5
    best_transform = np.eye(4)
    best_metadata: Dict[str, float] = {"strict_score": float("inf")}
    orientation_attempts = []

    for angle_degrees in (0.0, 90.0, 180.0, 270.0):
        initial_transform = compose_target_space_rotation(ransac.transformation, target_axis, angle_degrees)
        icp = o3d.pipelines.registration.registration_icp(
            source_cloud,
            target_cloud,
            voxel_size * 1.5,
            initial_transform,
            o3d.pipelines.registration.TransformationEstimationPointToPlane(),
            o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=icp_iterations),
        )

        strict_score, trimmed_score, overlap_ratio = strict_overlap_score(
            source_points,
            target_points,
            icp.transformation,
            trim_fraction,
            overlap_threshold,
        )
        attempt = {
            "orientation_degrees": float(angle_degrees),
            "icp_fitness": float(icp.fitness),
            "icp_rmse": float(icp.inlier_rmse),
            "trimmed_score": float(trimmed_score),
            "strict_score": float(strict_score),
            "overlap_ratio": float(overlap_ratio),
        }
        orientation_attempts.append(attempt)

        if strict_score < float(best_metadata["strict_score"]):
            best_transform = icp.transformation
            best_metadata = dict(attempt)

    metadata = {
        "voxel_size": float(voxel_size),
        "selected_orientation_degrees": float(best_metadata["orientation_degrees"]),
        "ransac_fitness": float(ransac.fitness),
        "ransac_rmse": float(ransac.inlier_rmse),
        "icp_fitness": float(best_metadata["icp_fitness"]),
        "icp_rmse": float(best_metadata["icp_rmse"]),
        "trimmed_score": float(best_metadata["trimmed_score"]),
        "strict_score": float(best_metadata["strict_score"]),
        "overlap_ratio": float(best_metadata["overlap_ratio"]),
        "source_down_points": int(len(source_down.points)),
        "target_down_points": int(len(target_down.points)),
        "target_principal_axis": target_axis.tolist(),
        "orientation_attempts": orientation_attempts,
    }
    return best_transform, metadata


def apply_transform(points: np.ndarray, transform: np.ndarray) -> np.ndarray:
    homogeneous = np.column_stack([points, np.ones(len(points))])
    return (transform @ homogeneous.T).T[:, :3]


def original_space_transform(
    normalized_transform: np.ndarray,
    reference_center: np.ndarray,
    reference_scale: float,
    candidate_center: np.ndarray,
    candidate_scale: float,
    align_mode: str,
) -> Tuple[np.ndarray, float, np.ndarray, np.ndarray]:
    rotation = normalized_transform[:3, :3]
    normalized_translation = normalized_transform[:3, 3]
    scale = reference_scale / candidate_scale if align_mode == "similarity" else 1.0

    transform = np.eye(4)
    transform[:3, :3] = scale * rotation
    transform[:3, 3] = reference_scale * normalized_translation + reference_center - scale * (rotation @ candidate_center)
    return transform, scale, rotation, transform[:3, 3]


def align_candidate(
    reference_points: np.ndarray,
    candidate_points: np.ndarray,
    align_mode: str,
    voxel_sizes: List[float],
    ransac_iterations: int,
    icp_iterations: int,
    trim_fraction: float,
) -> Tuple[np.ndarray, Dict[str, object]]:
    if align_mode == "similarity":
        normalized_reference, reference_center, reference_scale = normalize_points(reference_points, "own")
        normalized_candidate, candidate_center, candidate_scale = normalize_points(candidate_points, "own")
    else:
        normalized_reference, reference_center, reference_scale = normalize_points(reference_points, "own")
        normalized_candidate, candidate_center, candidate_scale = normalize_points(candidate_points, "shared", reference_scale)

    best_transform = np.eye(4)
    best_metadata: Dict[str, object] = {"trimmed_score": float("inf")}
    attempts = []

    for voxel_size in voxel_sizes:
        try:
            log(f"Trying global registration with normalized voxel size={voxel_size}")
            transform, metadata = run_registration_for_voxel(
                normalized_candidate,
                normalized_reference,
                voxel_size,
                ransac_iterations,
                icp_iterations,
                trim_fraction,
            )
            attempts.append(metadata)
            log(
                f"voxel={voxel_size}: strict={metadata['strict_score']:.6f}, "
                f"trimmed={metadata['trimmed_score']:.6f}, "
                f"orientation={metadata['selected_orientation_degrees']:.0f}, "
                f"ransac_fitness={metadata['ransac_fitness']:.4f}, icp_fitness={metadata['icp_fitness']:.4f}"
            )
            if float(metadata["strict_score"]) < float(best_metadata.get("strict_score", float("inf"))):
                best_transform = transform
                best_metadata = dict(metadata)
        except Exception as exc:
            log(f"voxel={voxel_size} failed: {exc}")

    if not attempts:
        raise RuntimeError("All global registration attempts failed")

    original_transform, scale, rotation, translation = original_space_transform(
        best_transform,
        reference_center,
        reference_scale,
        candidate_center,
        candidate_scale,
        align_mode,
    )
    best_metadata["attempts"] = attempts
    best_metadata["scale"] = float(scale)
    best_metadata["rotation"] = rotation.tolist()
    best_metadata["translation"] = translation.tolist()
    best_metadata["selected_voxel_size"] = float(best_metadata["voxel_size"])
    best_metadata["reference_normalization_scale"] = float(reference_scale)
    best_metadata["candidate_normalization_scale"] = float(candidate_scale)
    return original_transform, best_metadata


def directed_distances(source_points: np.ndarray, target_points: np.ndarray) -> np.ndarray:
    return cKDTree(target_points).query(source_points, workers=-1)[0]


def build_metrics(
    reference_mesh: trimesh.Trimesh,
    candidate_mesh: trimesh.Trimesh,
    reference_points: np.ndarray,
    aligned_candidate_points: np.ndarray,
    alignment: Dict[str, object],
) -> Dict[str, object]:
    accuracy_distances = directed_distances(aligned_candidate_points, reference_points)
    completeness_distances = directed_distances(reference_points, aligned_candidate_points)
    symmetric_distances = np.concatenate([accuracy_distances, completeness_distances])

    mean_accuracy = float(np.mean(accuracy_distances))
    mean_completeness = float(np.mean(completeness_distances))
    return {
        "mean_accuracy": mean_accuracy,
        "mean_completeness": mean_completeness,
        "chamfer_distance": float((mean_accuracy + mean_completeness) / 2.0),
        "hausdorff_distance": float(max(np.max(accuracy_distances), np.max(completeness_distances))),
        "percentile_95_distance": float(np.percentile(symmetric_distances, 95)),
        "reference_vertices": int(len(reference_mesh.vertices)),
        "reference_triangles": int(len(reference_mesh.faces)),
        "candidate_vertices": int(len(candidate_mesh.vertices)),
        "candidate_triangles": int(len(candidate_mesh.faces)),
        "sampled_points_per_mesh": int(len(reference_points)),
        "alignment": alignment,
    }


def color_mesh(mesh: trimesh.Trimesh, color: Tuple[int, int, int, int]) -> trimesh.Trimesh:
    colored = mesh.copy()
    colored.visual.vertex_colors = np.tile(np.array(color, dtype=np.uint8), (len(colored.vertices), 1))
    return colored


def flatten_metrics(metrics: Dict[str, object]) -> Dict[str, object]:
    flat: Dict[str, object] = {}
    for key, value in metrics.items():
        if isinstance(value, dict):
            for nested_key, nested_value in value.items():
                flat[f"{key}_{nested_key}"] = json.dumps(nested_value) if isinstance(nested_value, list) else nested_value
        else:
            flat[key] = value
    return flat


def write_outputs(
    out_dir: str,
    reference_mesh: trimesh.Trimesh,
    aligned_candidate_mesh: trimesh.Trimesh,
    metrics: Dict[str, object],
) -> None:
    os.makedirs(out_dir, exist_ok=True)
    aligned_candidate_path = os.path.join(out_dir, "aligned_candidate.ply")
    overlay_path = os.path.join(out_dir, "overlay_reference_candidate.ply")
    metrics_json_path = os.path.join(out_dir, "metrics.json")
    metrics_csv_path = os.path.join(out_dir, "metrics.csv")

    aligned_candidate_mesh.export(aligned_candidate_path)
    overlay = trimesh.util.concatenate([
        color_mesh(reference_mesh, (46, 125, 255, 180)),
        color_mesh(aligned_candidate_mesh, (255, 92, 64, 180)),
    ])
    overlay.export(overlay_path)

    with open(metrics_json_path, "w", encoding="utf8") as handle:
        json.dump(metrics, handle, indent=2)
        handle.write("\n")

    flat_metrics = flatten_metrics(metrics)
    with open(metrics_csv_path, "w", newline="", encoding="utf8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(flat_metrics.keys()))
        writer.writeheader()
        writer.writerow(flat_metrics)

    log(f"Wrote aligned candidate to {aligned_candidate_path}")
    log(f"Wrote overlay mesh to {overlay_path}")
    log(f"Wrote metrics to {metrics_json_path} and {metrics_csv_path}")


def parse_voxel_sizes(raw_value: str) -> List[float]:
    values = [float(value.strip()) for value in raw_value.split(",") if value.strip()]
    if not values:
        raise RuntimeError("--voxel-sizes must contain at least one value")
    return values


def main() -> int:
    args = parse_args()
    np.random.seed(args.seed)

    reference_path = os.path.abspath(args.reference)
    candidate_path = os.path.abspath(args.candidate)
    out_dir = os.path.abspath(args.out)

    log(f"Loading reference mesh: {reference_path}")
    reference_mesh = load_mesh(reference_path, "Reference")
    log(f"Loading candidate mesh: {candidate_path}")
    candidate_mesh = load_mesh(candidate_path, "Candidate")
    log(f"Reference counts: vertices={len(reference_mesh.vertices)}, triangles={len(reference_mesh.faces)}")
    log(f"Candidate counts: vertices={len(candidate_mesh.vertices)}, triangles={len(candidate_mesh.faces)}")

    reference_alignment_mesh = alignment_mesh(reference_mesh, "Reference", args.alignment_geometry)
    candidate_alignment_mesh = alignment_mesh(candidate_mesh, "Candidate", args.alignment_geometry)

    log(f"Sampling {args.alignment_samples} alignment points")
    reference_alignment_points = sample_surface(reference_alignment_mesh, args.alignment_samples, "Reference alignment")
    candidate_alignment_points = sample_surface(candidate_alignment_mesh, args.alignment_samples, "Candidate alignment")
    reference_alignment_points = remove_outliers(reference_alignment_points, "Reference alignment", not args.no_outlier_removal)
    candidate_alignment_points = remove_outliers(candidate_alignment_points, "Candidate alignment", not args.no_outlier_removal)

    transform, alignment = align_candidate(
        reference_alignment_points,
        candidate_alignment_points,
        args.align,
        parse_voxel_sizes(args.voxel_sizes),
        args.ransac_iterations,
        args.icp_iterations,
        args.trim_fraction,
    )
    alignment["mode"] = args.align
    alignment["alignment_geometry"] = args.alignment_geometry
    alignment["alignment_sampled_points"] = int(args.alignment_samples)
    alignment["trim_fraction"] = float(args.trim_fraction)

    aligned_candidate_mesh = candidate_mesh.copy()
    aligned_candidate_mesh.apply_transform(transform)

    log(f"Sampling {args.samples} metric points")
    reference_points = sample_surface(reference_mesh, args.samples, "Reference")
    candidate_points = sample_surface(candidate_mesh, args.samples, "Candidate")
    aligned_candidate_points = apply_transform(candidate_points, transform)

    metrics = build_metrics(reference_mesh, candidate_mesh, reference_points, aligned_candidate_points, alignment)
    log(f"Mean accuracy={metrics['mean_accuracy']:.6f}")
    log(f"Mean completeness={metrics['mean_completeness']:.6f}")
    log(f"Chamfer distance={metrics['chamfer_distance']:.6f}")
    log(f"Hausdorff distance={metrics['hausdorff_distance']:.6f}")
    log(f"95th percentile distance={metrics['percentile_95_distance']:.6f}")

    write_outputs(out_dir, reference_mesh, aligned_candidate_mesh, metrics)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log(f"ERROR: {exc}")
        sys.exit(1)
