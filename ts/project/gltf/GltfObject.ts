import { initGlForMembers, fromKeys } from "./utils";

// base class for all gltf objects
class GltfObject {
  extensions: any;
  extras: any;

  constructor() {
    this.extensions = undefined;
    this.extras = undefined;
  }

  /**
   * Populate GltfObject's properties based on json data
   * @param json contains raw input json data
   */
  fromJson(json: any) {
    fromKeys(this, json);
  }

  /**
   * Initialize gl for this GltfObject
   * @param gltf
   * @param webGPUContext
   */
  initGl(gltf: any, webGPUContext: any) {
    initGlForMembers(this, gltf, webGPUContext);
  }
}

export { GltfObject };
