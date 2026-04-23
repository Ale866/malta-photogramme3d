import argparse
import sys
from pathlib import Path

import bpy


def parse_args():
    parser = argparse.ArgumentParser(description="Create a simplified Draco-compressed terrain GLB.")
    parser.add_argument("input_glb", type=Path)
    parser.add_argument("output_glb", type=Path)
    parser.add_argument("--ratio", type=float, default=0.28)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    return parser.parse_args(argv)


def main():
    args = parse_args()
    input_glb = args.input_glb.resolve()
    output_glb = args.output_glb.resolve()
    ratio = max(0.02, min(args.ratio, 1.0))

    if not input_glb.exists():
        raise RuntimeError(f"Input GLB does not exist: {input_glb}")

    output_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(input_glb))

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError(f"No mesh objects found in {input_glb}")

    for obj in mesh_objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name="Mobile terrain decimation", type="DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        export_materials="NONE",
        export_texcoords=False,
        export_normals=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_generic_quantization=12,
    )

    if not output_glb.exists() or output_glb.stat().st_size <= 0:
        raise RuntimeError(f"Export did not create a valid GLB: {output_glb}")

    print(f"Wrote {output_glb}")
    print(f"Input size: {input_glb.stat().st_size:,} bytes")
    print(f"Output size: {output_glb.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
