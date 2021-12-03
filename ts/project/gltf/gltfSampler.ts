import { GltfObject } from "./GltfObject";

class gltfSampler extends GltfObject {
  magFilter: GPUFilterMode;
  minFilter: GPUFilterMode;
  mipmapFilter: GPUFilterMode;
  addressModeU: GPUAddressMode;
  addressModeV: GPUAddressMode;
  name: any;

  constructor(
    magFilter = "linear" as GPUFilterMode,
    minFilter = "linear" as GPUFilterMode,
    mipmapFilter = "linear" as GPUFilterMode,
    addressModeU = "repeat" as GPUAddressMode,
    addressModeV = "repeat" as GPUAddressMode
  ) {
    super();
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.mipmapFilter = mipmapFilter;
    this.addressModeU = addressModeU;
    this.addressModeV = addressModeV;
    this.name = undefined;
  }

  static createDefault() {
    return new gltfSampler();
  }
}

export { gltfSampler };
