import { GltfObject } from "./GltfObject";

class gltfBufferView extends GltfObject {
  buffer: any;
  byteOffset: any;
  byteLength: any;
  byteStride: any;
  target: any;
  name: any;

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
