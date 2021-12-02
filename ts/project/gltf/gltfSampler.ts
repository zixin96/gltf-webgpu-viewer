import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU"; // ! figure out what GL should be

class gltfSampler extends GltfObject {
  magFilter: any;
  minFilter: any;
  wrapS: any;
  wrapT: any;
  name: any;

  constructor(
    // magFilter = GL.LINEAR,
    // minFilter = GL.LINEAR_MIPMAP_LINEAR,
    // wrapS = GL.REPEAT,
    // wrapT = GL.REPEAT
    magFilter = undefined,
    minFilter = undefined,
    wrapS = undefined,
    wrapT = undefined
  ) {
    super();
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.wrapS = wrapS;
    this.wrapT = wrapT;
    this.name = undefined;
  }

  static createDefault() {
    return new gltfSampler();
  }
}

export { gltfSampler };
