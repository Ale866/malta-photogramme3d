import argparse
import os
import sys


def log(message: str) -> None:
    print(f"[convert_textured_ply_to_glb] {message}", flush=True)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description="Convert textured PLY artifacts to GLB")
    parser.add_argument("--mesh", required=True, help="Path to the published mesh.ply")
    parser.add_argument("--textured-folder", required=True, help="Path to the published dense/textured folder")
    parser.add_argument("--output", required=True, help="Path to the output model.glb")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    mesh_path = os.path.abspath(args.mesh)
    textured_folder = os.path.abspath(args.textured_folder)
    output_path = os.path.abspath(args.output)

    if not os.path.isfile(mesh_path):
        raise RuntimeError(f"Mesh input not found: {mesh_path}")
    if not os.path.isdir(textured_folder):
        raise RuntimeError(f"Textured folder not found: {textured_folder}")

    log(f"Placeholder GLB conversion hook invoked")
    log(f"Mesh: {mesh_path}")
    log(f"Textured folder: {textured_folder}")
    log(f"Output GLB: {output_path}")
    raise RuntimeError("GLB conversion script placeholder only; implement Blender import/export workflow after manual prototype")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log(f"ERROR: {exc}")
        sys.exit(1)
