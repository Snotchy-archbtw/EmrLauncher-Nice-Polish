export enum GrfCompressionLevel {
  None = 0,
  Compressed = 1,
  CompressedRle = 2,
  CompressedRleCrc = 3,
}

export enum GrfCompressionType {
  Unknown = -1,
  Zlib = 0,
  Deflate = 1,
  XMem = 2,
}

export interface GrfHeader {
  compressionLevel: GrfCompressionLevel;
  crc: number;
  compressionType: GrfCompressionType;
  unknownData: Uint8Array;
}

export interface GrfFileEntry {
  filename: string;
  data: Uint8Array;
}

export interface GrfParameter {
  name: string;
  value: string;
}

export interface GrfNode {
  name: string;
  parameters: GrfParameter[];
  children: GrfNode[];
}

export interface GrfFile {
  header: GrfHeader;
  files: GrfFileEntry[];
  root: GrfNode;
}
