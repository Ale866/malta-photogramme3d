import bpy
import struct
import sys
from pathlib import Path

SCALAR_FORMATS = {
    "char": "b",
    "int8": "b",
    "uchar": "B",
    "uint8": "B",
    "short": "h",
    "int16": "h",
    "ushort": "H",
    "uint16": "H",
    "int": "i",
    "int32": "i",
    "uint": "I",
    "uint32": "I",
    "float": "f",
    "float32": "f",
    "double": "d",
    "float64": "d",
}

SCALAR_SIZES = {
    "char": 1,
    "int8": 1,
    "uchar": 1,
    "uint8": 1,
    "short": 2,
    "int16": 2,
    "ushort": 2,
    "uint16": 2,
    "int": 4,
    "int32": 4,
    "uint": 4,
    "uint32": 4,
    "float": 4,
    "float32": 4,
    "double": 8,
    "float64": 8,
}


def parse_header(handle):
    texture_files = []
    vertex_count = None
    face_count = None
    fmt = None
    current_element = None
    vertex_properties = []
    face_properties = []

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
            current_element = "vertex"
        elif s.startswith("element face "):
            face_count = int(s.split()[-1])
            current_element = "face"
        elif s.startswith("element "):
            current_element = s.split()[1] if len(s.split()) > 1 else None
        elif s.startswith("property ") and current_element == "vertex":
            parts = s.split()
            if len(parts) < 3 or parts[1] == "list":
                raise RuntimeError(f"Unsupported vertex property declaration: {s}")
            vertex_properties.append((parts[2], parts[1]))
        elif s.startswith("property ") and current_element == "face":
            parts = s.split()
            if len(parts) >= 5 and parts[1] == "list":
                face_properties.append({
                    "kind": "list",
                    "name": parts[4],
                    "count_type": parts[2],
                    "value_type": parts[3],
                })
            elif len(parts) >= 3:
                face_properties.append({
                    "kind": "scalar",
                    "name": parts[2],
                    "value_type": parts[1],
                })
            else:
                raise RuntimeError(f"Unsupported face property declaration: {s}")
        elif s == "end_header":
            break

    if fmt is None:
        raise RuntimeError("PLY format not found")
    if vertex_count is None or face_count is None:
        raise RuntimeError("Vertex/face counts missing from header")
    if not vertex_properties:
        raise RuntimeError("Vertex properties missing from header")
    if not face_properties:
        raise RuntimeError("Face properties missing from header")

    return fmt, texture_files, vertex_count, face_count, vertex_properties, face_properties


def read_vertices(handle, fmt, vertex_count, vertex_properties):
    verts = []
    property_formats = []
    for name, value_type in vertex_properties:
        scalar_format = SCALAR_FORMATS.get(value_type)
        if scalar_format is None:
            raise RuntimeError(f"Unsupported vertex property type: {value_type}")
        property_formats.append((name, scalar_format, SCALAR_SIZES[value_type]))

    for _ in range(vertex_count):
        values = {}
        for name, scalar_format, size in property_formats:
            data = handle.read(size)
            if len(data) != size:
                raise RuntimeError("Unexpected EOF while reading vertices")
            values[name] = struct.unpack(fmt + scalar_format, data)[0]

        try:
            verts.append((float(values["x"]), float(values["y"]), float(values["z"])))
        except KeyError as exc:
            raise RuntimeError(f"Required vertex coordinate property missing: {exc}") from exc
    return verts


def read_faces(handle, fmt, face_count, face_properties):
    faces = []
    face_uvs = []
    face_texnums = []
    skipped_faces = 0
    incomplete_face_index = None

    for face_index in range(face_count):
        try:
            values = read_face_property_values(handle, fmt, face_properties)
        except EOFError:
            incomplete_face_index = face_index
            break

        indices = get_first_property(values, [
            "vertex_indices",
            "vertex_index",
            "vertex_indexes",
            "vertex_indices0",
        ])
        texcoords = get_first_property(values, [
            "texcoord",
            "texcoords",
            "texture_coordinates",
            "texture_uv",
        ])
        texnumber = get_first_property(values, [
            "texnumber",
            "tex_number",
            "texture_number",
            "tex_index",
        ], default=0)

        if not isinstance(indices, list) or not isinstance(texcoords, list):
            skipped_faces += 1
            continue

        n_idx = len(indices)
        n_tc = len(texcoords)
        if n_tc % 2 != 0:
            skipped_faces += 1
            continue

        uv_pairs = [(texcoords[i], texcoords[i + 1]) for i in range(0, n_tc, 2)]
        if n_idx < 3 or len(set(indices)) < 3 or len(uv_pairs) != len(indices):
            skipped_faces += 1
            continue

        faces.append(indices)
        face_uvs.append(uv_pairs)
        face_texnums.append(texnumber)

    if skipped_faces:
        print(f"Skipped invalid textured faces: {skipped_faces} / {face_count}")

    if incomplete_face_index is not None:
        recovered_ratio = len(faces) / max(face_count, 1)
        print(
            f"Stopped at incomplete face record {incomplete_face_index + 1} / {face_count}; "
            f"recovered valid faces: {len(faces)} ({recovered_ratio:.2%})"
        )
        if recovered_ratio < 0.9:
            raise RuntimeError(
                f"PLY face data ended too early: recovered {len(faces)} valid faces out of {face_count}"
            )

    if not faces:
        raise RuntimeError("No valid textured faces found in PLY")

    return faces, face_uvs, face_texnums


def read_face_property_values(handle, fmt, face_properties):
    values = {}
    for prop in face_properties:
        if prop["kind"] == "list":
            count = read_scalar(handle, fmt, prop["count_type"])
            values[prop["name"]] = [
                read_scalar(handle, fmt, prop["value_type"])
                for _ in range(count)
            ]
        else:
            values[prop["name"]] = read_scalar(handle, fmt, prop["value_type"])
    return values


def get_first_property(values, names, default=None):
    for name in names:
        if name in values:
            return values[name]
    return default


def read_scalar(handle, fmt, value_type):
    scalar_format = SCALAR_FORMATS.get(value_type)
    size = SCALAR_SIZES.get(value_type)
    if scalar_format is None or size is None:
        raise RuntimeError(f"Unsupported PLY scalar type: {value_type}")

    data = handle.read(size)
    if len(data) != size:
        raise EOFError
    return struct.unpack(fmt + scalar_format, data)[0]


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
        fmt, texture_files, vertex_count, face_count, vertex_properties, face_properties = parse_header(handle)
        print("Texture files:", texture_files)
        print("Vertices:", vertex_count)
        print("Faces:", face_count)
        print("Vertex properties:", [name for name, _ in vertex_properties])
        print("Face properties:", [prop["name"] for prop in face_properties])

        verts = read_vertices(handle, fmt, vertex_count, vertex_properties)
        faces, face_uvs, face_texnums = read_faces(handle, fmt, face_count, face_properties)

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
        result = bpy.ops.export_scene.gltf(
            **export_kwargs,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=6,
            export_draco_position_quantization=14,
            export_draco_normal_quantization=10,
            export_draco_texcoord_quantization=12,
            export_draco_generic_quantization=12,
        )
        ensure_export_finished(result, output_glb, "Draco")
        print("Exported GLB with Draco compression enabled")
    except Exception as exc:
        print(f"Draco export failed, retrying without Draco compression: {exc}")
        result = bpy.ops.export_scene.gltf(
            **export_kwargs,
            export_draco_mesh_compression_enable=False,
        )
        ensure_export_finished(result, output_glb, "uncompressed")


def ensure_export_finished(result, output_glb: Path, label: str):
    if "FINISHED" not in result:
        raise RuntimeError(f"{label} GLB export did not finish: {result}")
    if not output_glb.exists():
        raise RuntimeError(f"{label} GLB export finished but did not create {output_glb}")
    if output_glb.stat().st_size <= 0:
        raise RuntimeError(f"{label} GLB export created an empty file: {output_glb}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", flush=True)
        raise
