import { mat4, quat } from "gl-matrix";
import { jsToGl } from "./utils";
import { GltfObject } from "./GltfObject";

class gltfNode extends GltfObject {
  children: number[];
  matrix: any;
  mesh: number | undefined;

  name: any;

  // non gltf
  worldTransform: any;
  inverseWorldTransform: any;
  normalMatrix: any;
  light: any;
  changed: any; // ? Why do we need this?
  transform: any;

  constructor() {
    super();
    this.children = [];
    this.matrix = undefined;
    this.name = undefined;
    this.mesh = undefined;

    // non gltf
    this.worldTransform = mat4.create();
    this.inverseWorldTransform = mat4.create();
    this.normalMatrix = mat4.create();
    this.light = undefined;
    this.changed = true;
  }

  /**
   * populate this.SRT using all means
   */
  initGl() {
    // a node could have a matrix, or SRT, or none of them
    if (this.matrix !== undefined) {
      this.applyMatrix(this.matrix);
    }
    this.changed = true;
  }

  /**
   * currently, it receives an array and return Float32Array
   * @param matrixData
   */
  applyMatrix(matrixData: any) {
    this.matrix = jsToGl(matrixData);
    this.changed = true;
  }

  /**
   *
   * @returns a 4x4 local transformation matrix
   */
  getLocalTransform() {
    if (this.transform === undefined || this.changed) {
      // if no animation is applied and the transform matrix is present use it directly
      if (this.matrix !== undefined) {
        this.transform = mat4.clone(this.matrix);
      } else {
        this.transform = mat4.create();
      }
      this.changed = false;
    }

    return mat4.clone(this.transform);
  }
}

export { gltfNode };
