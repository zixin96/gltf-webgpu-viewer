import { GltfObject } from "./GltfObject";

class gltfBufferView extends GltfObject {
  buffer: number | undefined;
  byteOffset: number;
  byteLength: number | undefined;
  byteStride: number;
  target: number | undefined;

  name: string | undefined;

  constructor() {
    super();
    this.buffer = undefined;
    this.byteOffset = 0;
    this.byteLength = undefined;
    this.byteStride = 0;
    this.target = undefined;
    this.name = undefined;
  }
}

export { gltfBufferView };
