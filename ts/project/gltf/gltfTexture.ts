import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU"; // ! figure out what GL should be
import { initGlForMembers } from "./utils";

class gltfTexture extends GltfObject {
  sampler: any; // index to gltfSampler, default sampler ?
  source: any; // index to gltfImage

  // non gltf
  glTexture: any;
  type: any;
  initialized: any;
  mipLevelCount: any;

  constructor(
    sampler = undefined,
    source = undefined,
    /* type = GL.TEXTURE_2D*/ type = undefined // ! figure out what GL should be
  ) {
    super();
    this.sampler = sampler; // index to gltfSampler, default sampler ?
    this.source = source; // index to gltfImage

    // non gltf
    this.glTexture = undefined;
    this.type = type;
    this.initialized = false;
    this.mipLevelCount = 0;
  }
}

class gltfTextureInfo {
  index: any; // reference to gltfTexture
  texCoord: any; // which UV set to use
  linear: any;
  samplerName: any;
  strength: any; // occlusion
  scale: any; // normal
  generateMips: any;

  extensions: any;

  constructor(
    index = undefined,
    texCoord = 0,
    linear = true,
    samplerName = "",
    generateMips = true // linear by default
  ) {
    this.index = index; // reference to gltfTexture
    this.texCoord = texCoord; // which UV set to use
    this.linear = linear;
    this.samplerName = samplerName;
    this.strength = 1.0; // occlusion
    this.scale = 1.0; // normal
    this.generateMips = generateMips;

    this.extensions = undefined;
  }

  initGl(gltf: any, webGPUContext: any) {
    initGlForMembers(this, gltf, webGPUContext);
  }
}

export { gltfTexture, gltfTextureInfo };
