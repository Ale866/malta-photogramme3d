import argparse
import math
import os
import sys

import numpy as np
import trimesh
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree


def log(message: str) -> None:
    print(f"[mesh_focus_cleanup] {message}", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mesh focus cleanup")
    parser.add_argument("--input", required=True, help="Path to the raw mesh")
    parser.add_argument("--output", required=True, help="Path to the cleaned mesh")
    return parser.parse_args()


def load_mesh(mesh_path: str) -> trimesh.Trimesh:
    loaded = trimesh.load(mesh_path, force="mesh", process=False, skip_materials=True)

    if isinstance(loaded, trimesh.Scene):
        geometries = [
            trimesh.Trimesh(vertices=geometry.vertices, faces=geometry.faces, process=False)
            for geometry in loaded.geometry.values()
            if isinstance(geometry, trimesh.Trimesh) and len(geometry.vertices) > 0 and len(geometry.faces) > 0
        ]
        if not geometries:
            raise RuntimeError("No mesh geometry found in input scene")
        loaded = trimesh.util.concatenate(geometries)

    if not isinstance(loaded, trimesh.Trimesh):
        raise RuntimeError("Input is not a mesh")

    mesh = trimesh.Trimesh(vertices=loaded.vertices, faces=loaded.faces, process=False)
    if len(mesh.vertices) == 0 or len(mesh.faces) == 0:
        raise RuntimeError("Input mesh is empty")
    return mesh


def bbox_diagonal(bounds: np.ndarray) -> float:
    extents = np.maximum(bounds[1] - bounds[0], 0.0)
    return float(np.linalg.norm(extents))


def bbox_volume_proxy(extents: np.ndarray, scale: float) -> float:
    safe_extents = np.maximum(extents, max(scale, 1e-9))
    return float(np.prod(safe_extents))


def main() -> int:
    args = parse_args()
    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)

    mesh = load_mesh(input_path)

    vertex_count = int(len(mesh.vertices))
    face_count = int(len(mesh.faces))
    log(f"Original mesh: vertices={vertex_count}, faces={face_count}")

    if vertex_count < 9:
        raise RuntimeError("Mesh requires at least 9 vertices for local scale estimation")

    global_bounds = mesh.bounds
    global_center = global_bounds.mean(axis=0)
    global_diag = max(bbox_diagonal(global_bounds), 1e-9)

    tree = cKDTree(mesh.vertices)
    scale_distances = tree.query(mesh.vertices, k=9, workers=-1)[0][:, 8]
    d = float(np.median(scale_distances[np.isfinite(scale_distances)]))
    if not np.isfinite(d) or d <= 0:
        raise RuntimeError("Failed to estimate local geometric scale")
    adaptive_eps = 6.0 * d
    log(f"Estimated local scale d={d:.6f}")
    log(f"Adaptive eps={adaptive_eps:.6f}")

    knn_distances, knn_indices = tree.query(mesh.vertices, k=17, workers=-1)
    neighbor_distances = knn_distances[:, 1:]
    neighbor_indices = knn_indices[:, 1:]
    valid_mask = np.isfinite(neighbor_distances) & (neighbor_distances <= adaptive_eps)

    row_indices = np.repeat(np.arange(vertex_count), 16)[valid_mask.reshape(-1)]
    col_indices = neighbor_indices.reshape(-1)[valid_mask.reshape(-1)]
    data = np.ones(len(row_indices), dtype=np.int8)
    graph = coo_matrix((data, (row_indices, col_indices)), shape=(vertex_count, vertex_count))
    graph = graph.maximum(graph.transpose()).tocsr()

    component_count, labels = connected_components(graph, directed=False, return_labels=True)
    min_cluster_size = int(max(100, math.ceil(0.002 * vertex_count)))
    log(f"Min cluster threshold={min_cluster_size}")

    surviving_clusters = []
    for component_index in range(component_count):
        component_vertices = np.flatnonzero(labels == component_index)
        component_size = int(len(component_vertices))
        if component_size < min_cluster_size:
            continue

        cluster_points = mesh.vertices[component_vertices]
        cluster_min = cluster_points.min(axis=0)
        cluster_max = cluster_points.max(axis=0)
        cluster_extents = cluster_max - cluster_min
        cluster_bounds = np.vstack([cluster_min, cluster_max])
        cluster_diag = bbox_diagonal(cluster_bounds)
        centroid = cluster_points.mean(axis=0)
        center_distance = float(np.linalg.norm(centroid - global_center))
        compactness = component_size / max(bbox_volume_proxy(cluster_extents, d), 1e-9)
        score = (
            2.0 * math.log(component_size)
            - 1.5 * (cluster_diag / global_diag)
            - 0.75 * (center_distance / global_diag)
            + 0.25 * math.log(max(compactness, 1e-9))
        )

        surviving_clusters.append({
            "index": component_index,
            "size": component_size,
            "bounds_min": cluster_min,
            "bounds_max": cluster_max,
            "extents": cluster_extents,
            "centroid": centroid,
            "diag": cluster_diag,
            "center_distance": center_distance,
            "compactness": compactness,
            "score": score,
        })

    log(f"Surviving clusters={len(surviving_clusters)}")
    if not surviving_clusters:
        raise RuntimeError("No surviving clusters after focus seed filtering")

    best_cluster = max(surviving_clusters, key=lambda cluster: cluster["score"])
    log(
        "Chosen cluster: "
        f"index={best_cluster['index']}, "
        f"size={best_cluster['size']}, "
        f"score={best_cluster['score']:.6f}, "
        f"diag={best_cluster['diag']:.6f}, "
        f"center_distance={best_cluster['center_distance']:.6f}, "
        f"compactness={best_cluster['compactness']:.6f}"
    )

    expansion = 0.20 * best_cluster["extents"] + 12.0 * d
    focus_min = best_cluster["bounds_min"] - expansion
    focus_max = best_cluster["bounds_max"] + expansion

    face_centroids = mesh.triangles_center
    inside_focus = np.all((face_centroids >= focus_min) & (face_centroids <= focus_max), axis=1)
    kept_faces = mesh.faces[inside_focus]
    cleaned_mesh = trimesh.Trimesh(vertices=mesh.vertices.copy(), faces=kept_faces, process=False)
    cleaned_mesh.remove_unreferenced_vertices()

    cleaned_vertex_count = int(len(cleaned_mesh.vertices))
    cleaned_face_count = int(len(cleaned_mesh.faces))
    log(f"Cleaned mesh: vertices={cleaned_vertex_count}, faces={cleaned_face_count}")

    fallback_triggered = cleaned_vertex_count <= 0 or cleaned_face_count <= 0 or cleaned_face_count < face_count * 0.2
    log(f"Fallback to raw triggered={str(fallback_triggered).lower()}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cleaned_mesh.export(output_path)
    log(f"Wrote cleaned mesh to {output_path}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log(f"ERROR: {exc}")
        sys.exit(1)
