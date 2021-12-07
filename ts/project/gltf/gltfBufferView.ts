import { GltfObject } from "./GltfObject";

class gltfBufferView extends GltfObject {
  buffer: number | undefined = undefined;
  byteOffset: number = 0;
  byteLength: number | undefined = undefined;
  byteStride: number = 0;
  target: number | undefined = undefined;

  name: string | undefined = undefined;

  constructor() {
    super();
  }
}

export { gltfBufferView };
