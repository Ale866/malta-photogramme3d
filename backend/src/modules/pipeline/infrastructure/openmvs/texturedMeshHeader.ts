import fs from "fs";

export function readTextureFileComments(meshPath: string): string[] {
  const fileDescriptor = fs.openSync(meshPath, "r");
  const chunkSize = 4096;
  let headerBuffer = Buffer.alloc(0);
  let offset = 0;

  try {
    while (true) {
      const chunk = Buffer.alloc(chunkSize);
      const bytesRead = fs.readSync(fileDescriptor, chunk, 0, chunk.length, offset);
      if (bytesRead <= 0) {
        throw new Error(`Unexpected EOF while reading PLY header: ${meshPath}`);
      }

      headerBuffer = Buffer.concat([headerBuffer, chunk.subarray(0, bytesRead)]);
      offset += bytesRead;

      const headerEnd = headerBuffer.indexOf("end_header\n");
      const headerEndWithCarriageReturn = headerBuffer.indexOf("end_header\r\n");
      const endIndex = headerEnd >= 0 ? headerEnd + "end_header\n".length : (
        headerEndWithCarriageReturn >= 0 ? headerEndWithCarriageReturn + "end_header\r\n".length : -1
      );

      if (endIndex >= 0) {
        const headerText = headerBuffer.subarray(0, endIndex).toString("utf8");
        const atlasFileNames = headerText
          .split(/\r?\n/)
          .map((line) => line.match(/^comment\s+TextureFile\s+(.+)$/u)?.[1]?.trim() ?? "")
          .filter((fileName) => fileName.length > 0);

        return [...new Set(atlasFileNames)];
      }
    }
  } finally {
    fs.closeSync(fileDescriptor);
  }
}
