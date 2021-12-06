import { GltfObject } from "./GltfObject";

class gltfAsset extends GltfObject {
  // https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#asset
  copyright: string | undefined;
  generator: string | undefined;
  version: string | undefined;
  minVersion: string | undefined;

  constructor() {
    super();
    this.copyright = undefined;
    this.generator = undefined;
    this.version = undefined;
    this.minVersion = undefined;
  }
}

export { gltfAsset };
