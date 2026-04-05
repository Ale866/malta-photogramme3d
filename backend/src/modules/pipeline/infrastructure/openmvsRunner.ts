import path from "path";
import { config } from "../../../shared/config/env";
import { verifyExecutable } from "./colmapRunner";

export function verifyOpenMvsBinaries(): void {
  verifyExecutable(config.OPENMVS_INTERFACE_COLMAP_BIN, ["--help"], "OPENMVS_INTERFACE_COLMAP_BIN");
  verifyExecutable(config.OPENMVS_DENSIFY_POINT_CLOUD_BIN, ["--help"], "OPENMVS_DENSIFY_POINT_CLOUD_BIN");
  verifyExecutable(config.OPENMVS_RECONSTRUCT_MESH_BIN, ["--help"], "OPENMVS_RECONSTRUCT_MESH_BIN");
  verifyExecutable(config.OPENMVS_TEXTURE_MESH_BIN, ["--help"], "OPENMVS_TEXTURE_MESH_BIN");
}

export function relativePathFrom(basePath: string, targetPath: string) {
  const relative = path.relative(basePath, targetPath);
  return relative || ".";
}
