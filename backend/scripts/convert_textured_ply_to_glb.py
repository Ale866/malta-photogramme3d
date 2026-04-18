import bpy
import struct
import sys
from pathlib import Path


def parse_header(handle):
    texture_files = []
    vertex_count = None
    face_count = None
    fmt = None

    while True:
        line = handle.readline()
        if not line:
            raise RuntimeError("Unexpected EOF while reading PLY header")
        s = line.decode("utf-8", errors="ignore").rstrip()

        if s.startswith("format "):
            if "binary_little_endian" in s:
                fmt = "<"
            elif "binary_big_endian" in s:
                fmt = ">"
            else:
                raise RuntimeError(f"Unsupported PLY format: {s}")
        elif s.startswith("comment TextureFile "):
            texture_files.append(s[len("comment TextureFile "):].strip())
        elif s.startswith("element vertex "):
            vertex_count = int(s.split()[-1])
        elif s.startswith("element face "):
            face_count = int(s.split()[-1])
        elif s == "end_header":
            break

    if fmt is None:
        raise RuntimeError("PLY format not found")
    if vertex_count is None or face_count is None:
        raise RuntimeError("Vertex/face counts missing from header")

    return fmt, texture_files, vertex_count, face_count


def read_vertices(handle, fmt, vertex_count):
    verts = []
    for _ in range(vertex_count):
        data = handle.read(12)
        if len(data) != 12:
            raise RuntimeError("Unexpected EOF while reading vertices")
        verts.append(struct.unpack(fmt + "fff", data))
    return verts


def read_faces(handle, fmt, face_count):
    faces = []
    face_uvs = []
    face_texnums = []

    for _ in range(face_count):
        raw = handle.read(1)
        if len(raw) != 1:
            raise RuntimeError("Unexpected EOF while reading face index count")
        n_idx = struct.unpack(fmt + "B", raw)[0]

        raw = handle.read(4 * n_idx)
        if len(raw) != 4 * n_idx:
            raise RuntimeError("Unexpected EOF while reading face indices")
        indices = list(struct.unpack(fmt + ("I" * n_idx), raw))

        raw = handle.read(1)
        if len(raw) != 1:
            raise RuntimeError("Unexpected EOF while reading texcoord count")
        n_tc = struct.unpack(fmt + "B", raw)[0]

        raw = handle.read(4 * n_tc)
        if len(raw) != 4 * n_tc:
            raise RuntimeError("Unexpected EOF while reading texcoords")
        texcoords = list(struct.unpack(fmt + ("f" * n_tc), raw))

        raw = handle.read(4)
        if len(raw) != 4:
            raise RuntimeError("Unexpected EOF while reading texnumber")
        texnumber = struct.unpack(fmt + "i", raw)[0]

        if n_tc % 2 != 0:
            raise RuntimeError(f"Face texcoord list has odd length: {n_tc}")

        uv_pairs = [(texcoords[i], texcoords[i + 1]) for i in range(0, n_tc, 2)]
        if len(uv_pairs) != len(indices):
            raise RuntimeError(
                f"Face has {len(indices)} indices but {len(uv_pairs)} UV pairs"
            )

        faces.append(indices)
        face_uvs.append(uv_pairs)
        face_texnums.append(texnumber)

    return faces, face_uvs, face_texnums


def make_materials(base_dir: Path, texture_files):
    materials = []

    for tex_name in texture_files:
        tex_path = base_dir / tex_name
        if not tex_path.exists():
            raise RuntimeError(f"Missing atlas file: {tex_path}")

        mat = bpy.data.materials.new(name=tex_name)
        mat.use_nodes = True

        nt = mat.node_tree
        for node in list(nt.nodes):
            nt.nodes.remove(node)

        out = nt.nodes.new("ShaderNodeOutputMaterial")
        out.location = (400, 0)

        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (100, 0)

        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.location = (-250, 0)
        tex.image = bpy.data.images.load(str(tex_path), check_existing=True)

        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

        materials.append(mat)

    return materials


def build_mesh_object(name, verts, faces, face_uvs, face_texnums, materials):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    for mat in materials:
        obj.data.materials.append(mat)

    uv_layer = mesh.uv_layers.new(name="UVMap")

    for poly in mesh.polygons:
        poly.material_index = max(0, min(face_texnums[poly.index], len(materials) - 1))
        uv_pairs = face_uvs[poly.index]
        loop_indices = poly.loop_indices

        if len(loop_indices) != len(uv_pairs):
            raise RuntimeError(
                f"Polygon loop count {len(loop_indices)} != UV pair count {len(uv_pairs)}"
            )

        for loop_idx, (u, v) in zip(loop_indices, uv_pairs):
            uv_layer.data[loop_idx].uv = (u, v)

    return obj


def main():
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Usage: blender -b -P convert_textured_ply_to_glb.py -- <input.ply> <output.glb>")

    argv = argv[argv.index("--") + 1:]
    if len(argv) < 2:
        raise RuntimeError("Usage: blender -b -P convert_textured_ply_to_glb.py -- <input.ply> <output.glb>")

    input_ply = Path(argv[0]).resolve()
    output_glb = Path(argv[1]).resolve()
    output_glb.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)

    with open(input_ply, "rb") as handle:
        fmt, texture_files, vertex_count, face_count = parse_header(handle)
        print("Texture files:", texture_files)
        print("Vertices:", vertex_count)
        print("Faces:", face_count)

        verts = read_vertices(handle, fmt, vertex_count)
        faces, face_uvs, face_texnums = read_faces(handle, fmt, face_count)

    if not texture_files:
        raise RuntimeError("No TextureFile comments found in PLY header")

    materials = make_materials(input_ply.parent, texture_files)
    obj = build_mesh_object("OpenMVSModel", verts, faces, face_uvs, face_texnums, materials)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    export_glb(output_glb)

    print(f"Wrote GLB to {output_glb}")


def export_glb(output_glb: Path):
    export_kwargs = {
        "filepath": str(output_glb),
        "export_format": "GLB",
        "export_materials": "EXPORT",
        "export_texcoords": True,
        "export_normals": True,
    }

    try:
        bpy.ops.export_scene.gltf(
            **export_kwargs,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=6,
            export_draco_position_quantization=14,
            export_draco_normal_quantization=10,
            export_draco_texcoord_quantization=12,
            export_draco_generic_quantization=12,
        )
        print("Exported GLB with Draco compression enabled")
    except Exception as exc:
        print(f"Draco export failed, retrying without Draco compression: {exc}")
        bpy.ops.export_scene.gltf(
            **export_kwargs,
            export_draco_mesh_compression_enable=False,
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", flush=True)
        raise
