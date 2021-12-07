import { GltfObject } from "./GltfObject";

class gltfAsset extends GltfObject {
  // https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#asset
  copyright: string | undefined = undefined;
  generator: string | undefined = undefined;
  version: string | undefined = undefined;
  minVersion: string | undefined = undefined;

  constructor() {
    super();
  }
}

export { gltfAsset };
