import { GltfObject } from "./GltfObject";

class gltfAsset extends GltfObject {
  copyright: any;
  generator: any;
  version: any;
  minVersion: any;

  constructor() {
    super();
    this.copyright = undefined;
    this.generator = undefined;
    this.version = undefined;
    this.minVersion = undefined;
  }
}

export { gltfAsset };
