import { initGlForMembers, fromKeys } from "./utils";

// base class for all gltf objects
class GltfObject {
  constructor() {}

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
   * @param device
   */
  initGl(gltf: any, device: GPUDevice) {
    initGlForMembers(this, gltf, device);
  }
}

export { GltfObject };
