import { fromKeys, initGlForMembers } from "./utils.js";
import { GltfObject } from "./glTF.js";
import { glTF } from "./glTF.js";
import { gltfSampler } from "./gltfSampler.js";
import { gltfImage } from "./gltfImage.js";

class gltfTexture extends GltfObject {
  sampler: number;
  source: number;

  // non gltf
  type: any;
  glTexture: any = undefined;
  initialized = false;
  mipLevelCount = 0;

  constructor(
    sampler: number,
    source: number,
    type = undefined /*GL.TEXTURE_2D*/
  ) {
    super();
    this.sampler = sampler; // index to gltfSampler, default sampler ?
    this.source = source; // index to gltfImage

    // non gltf
    this.type = type;
  }

  fromJson(jsonTexture: any) {
    super.fromJson(jsonTexture);
  }

  initGl(gltf: glTF, device: GPUDevice) {
    if (this.sampler === undefined) {
      this.sampler = gltf.samplers.length - 1;
    }

    initGlForMembers(this, gltf, device);
  }
}

export { gltfTexture };
