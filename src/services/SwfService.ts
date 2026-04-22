import pako from "pako";
export interface SwfImage {
  id: number;
  type: "jpeg" | "png" | "lossless" | "unknown" | "gif";
  name?: string;
  data: Uint8Array;
  alphaData?: Uint8Array;
  metadata?: any;
}

export class SwfService {
  static extractImages(buffer: Uint8Array): SwfImage[] {
    if (buffer.length < 8) {
      throw new Error("Invalid SWF: file too small");
    }

    const sig = String.fromCharCode(buffer[0], buffer[1], buffer[2]);
    // const version = buffer[3];
    // const fileLength = buffer[4] | (buffer[5] << 8) | (buffer[6] << 16) | (buffer[7] << 24); //neo: small endian
    let data: Uint8Array;
    if (sig === "FWS") {
      data = buffer.slice(8);
    } else if (sig === "CWS") {
      try {
        data = pako.inflate(buffer.slice(8));
      } catch (e) {
        throw new Error("Failed to decompress CWS SWF");
      }
    } else {
      throw new Error(`Unsupported SWF signature: ${sig}`);
    }

    let offset = 0;
    if (data.length === 0) return [];
    const nbits = data[0] >> 3;
    const rectBytes = Math.ceil((5 + nbits * 4) / 8);
    offset += rectBytes;
    offset += 4;
    const images: SwfImage[] = [];
    const nameMap: Record<number, string> = {};
    let jpegTables: Uint8Array | null = null;
    const getRealType = (imgData: Uint8Array): "jpeg" | "png" | "gif" | "lossless" | "unknown" => {
      if (imgData.length >= 4) {
        if (imgData[0] === 0x89 && imgData[1] === 0x50 && imgData[2] === 0x4e && imgData[3] === 0x47) return "png";
        if (imgData[0] === 0x47 && imgData[1] === 0x49 && imgData[2] === 0x46 && imgData[3] === 0x38) return "gif";
        if (imgData[0] === 0xff && imgData[1] === 0xd8) return "jpeg";
      }
      return "unknown";
    };

    const fixJpeg = (imgData: Uint8Array, jtt: Uint8Array | null = null): Uint8Array => {
      let combined = imgData;
      if (jtt && jtt.length > 0) {
        combined = new Uint8Array(jtt.length + imgData.length);
        combined.set(jtt, 0);
        combined.set(imgData, jtt.length);
      }
      const out: number[] = [];
      for (let i = 0; i < combined.length; i++) {
        if (i + 3 < combined.length &&
          combined[i] === 0xff && combined[i + 1] === 0xd9 &&
          combined[i + 2] === 0xff && combined[i + 3] === 0xd8) {
          i += 3;
          continue;
        }
        out.push(combined[i]);
      }
      return new Uint8Array(out);
    };

    while (offset < data.length) {
      if (offset + 2 > data.length) break;
      const tagCodeAndLength = data[offset] | (data[offset + 1] << 8);
      offset += 2;
      let tagType = tagCodeAndLength >> 6;
      let length = tagCodeAndLength & 0x3F;
      if (length === 0x3F) {
        if (offset + 4 > data.length) break;
        length = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
        offset += 4;
      }

      if (tagType === 0) break;
      if (offset + length > data.length) break;

      if (tagType === 8) {
        //neo: JPEGTables
        jpegTables = data.slice(offset, offset + length);
      } else if (tagType === 56 || tagType === 76) {
        let ptr = offset;
        const numAssets = data[ptr] | (data[ptr + 1] << 8);
        ptr += 2;
        for (let i = 0; i < numAssets; i++) {
          if (ptr + 2 > offset + length) break;
          const charId = data[ptr] | (data[ptr + 1] << 8);
          ptr += 2;
          let end = ptr;
          while (end < offset + length && data[end] !== 0) {
            end++;
          }
          const nameStr = new TextDecoder().decode(data.slice(ptr, end));
          nameMap[charId] = nameStr;
          ptr = end + 1;
        }
      } else if (tagType === 6) {
        //neo: DefineBits
        const characterId = data[offset] | (data[offset + 1] << 8);
        const rawData = data.slice(offset + 2, offset + length);
        const fixedData = fixJpeg(rawData, jpegTables);
        images.push({
          id: characterId,
          type: getRealType(fixedData) as any,
          data: fixedData
        });
      } else if (tagType === 21) {
        //neo: this is DefineBitsJPEG2
        const characterId = data[offset] | (data[offset + 1] << 8);
        const rawData = data.slice(offset + 2, offset + length);
        const fixedData = fixJpeg(rawData);
        images.push({
          id: characterId,
          type: getRealType(fixedData) as any,
          data: fixedData
        });
      } else if (tagType === 35) {
        //neo: this is DefineBitsJPEG3
        const characterId = data[offset] | (data[offset + 1] << 8);
        const alphaOffset = data[offset + 2] | (data[offset + 3] << 8) | (data[offset + 4] << 16) | (data[offset + 5] << 24);
        const imgRawData = data.slice(offset + 6, offset + 6 + alphaOffset);
        const alphaDataRaw = data.slice(offset + 6 + alphaOffset, offset + length);
        let alphaData;
        try {
          alphaData = pako.inflate(alphaDataRaw);
        } catch (e) {
          //neo: idfk what to do here, it should have been zlib compressed
        }

        const fixedData = fixJpeg(imgRawData);
        images.push({
          id: characterId,
          type: getRealType(fixedData) as any,
          data: fixedData,
          alphaData: alphaData
        });
      } else if (tagType === 20 || tagType === 36) {
        //neo: this is either DefineBitsLossless or DefineBitsLossless2
        const characterId = data[offset] | (data[offset + 1] << 8);
        images.push({
          id: characterId,
          type: "lossless",
          data: data.slice(offset + 2, offset + length)
        });
      }

      offset += length;
    }

    for (const img of images) {
      if (nameMap[img.id]) {
        img.name = nameMap[img.id];
      }
    }

    return images;
  }
}
