import { GltfObject } from "./glTF";

class gltfSampler extends GltfObject {
  magFilter: GPUFilterMode;
  minFilter: GPUFilterMode;
  mipmapFilter: GPUFilterMode;

  wrapS: GPUAddressMode;
  wrapT: GPUAddressMode;
  name: string | undefined;

  constructor(
    magFilter = "linear" as GPUFilterMode,
    minFilter = "linear" as GPUFilterMode,
    mipmapFilter = "linear" as GPUFilterMode,
    wrapS = "repeat" as GPUAddressMode,
    wrapT = "repeat" as GPUAddressMode
  ) {
    super();
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.mipmapFilter = mipmapFilter;
    this.wrapS = wrapS;
    this.wrapT = wrapT;
    this.name = undefined;
  }

  static createDefault() {
    return new gltfSampler();
  }
}

export { gltfSampler };
