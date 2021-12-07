import { mat4, quat } from "gl-matrix";
import { jsToGl } from "./utils";
import { GltfObject } from "./GltfObject";

class gltfNode extends GltfObject {
  children: number[] = [];
  matrix: any = undefined;
  mesh: number | undefined = undefined;

  name: any = undefined;

  // non gltf
  worldTransform: any = mat4.create();
  inverseWorldTransform: any = mat4.create();
  normalMatrix: any = mat4.create();
  light: any;
  changed: any = true;
  transform: any = undefined;

  constructor() {
    super();
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
