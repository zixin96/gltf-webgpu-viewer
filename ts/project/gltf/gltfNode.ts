import { mat4, quat } from "gl-matrix";
import { jsToGl } from "./utils";
import { GltfObject } from "./GltfObject";

class gltfNode extends GltfObject {
  camera: any;
  children: any;
  matrix: any;
  rotation: any;
  scale: any;
  translation: any;
  name: any;
  mesh: any;
  skin: any;

  // non gltf
  worldTransform: any;
  inverseWorldTransform: any;
  normalMatrix: any;
  light: any;
  changed: any; // ? Why do we need this?

  animationRotation: any;
  animationTranslation: any;
  animationScale: any;

  transform: any;

  constructor() {
    super();
    this.camera = undefined;
    this.children = [];
    this.matrix = undefined;

    // a node has the following default SRT
    this.rotation = jsToGl([0, 0, 0, 1]);
    this.scale = jsToGl([1, 1, 1]);
    this.translation = jsToGl([0, 0, 0]);

    this.name = undefined;
    this.mesh = undefined;
    this.skin = undefined;

    // non gltf
    this.worldTransform = mat4.create();
    this.inverseWorldTransform = mat4.create();
    this.normalMatrix = mat4.create();
    this.light = undefined;
    this.changed = true;

    this.animationRotation = undefined;
    this.animationTranslation = undefined;
    this.animationScale = undefined;
  }

  /**
   * populate this.SRT using all means
   */
  initGl() {
    // a node could have a matrix, or SRT, or none of them
    if (this.matrix !== undefined) {
      this.applyMatrix(this.matrix);
    } else {
      if (this.scale !== undefined) {
        this.scale = jsToGl(this.scale);
      }

      if (this.rotation !== undefined) {
        this.rotation = jsToGl(this.rotation);
      }

      if (this.translation !== undefined) {
        this.translation = jsToGl(this.translation);
      }
    }
    this.changed = true;
  }

  /**
   * Given a raw matrixData, populate this.SRT
   * ? Why do we need this.SRT, could we just use the matrix?
   * @param matrixData
   */
  applyMatrix(matrixData: any) {
    this.matrix = jsToGl(matrixData);

    mat4.getScaling(this.scale, this.matrix);

    // To extract a correct rotation, the scaling component must be eliminated.
    const mn = mat4.create();
    for (const col of [0, 1, 2]) {
      mn[col] = this.matrix[col] / this.scale[0];
      mn[col + 4] = this.matrix[col + 4] / this.scale[1];
      mn[col + 8] = this.matrix[col + 8] / this.scale[2];
    }
    mat4.getRotation(this.rotation, mn);
    quat.normalize(this.rotation, this.rotation);

    mat4.getTranslation(this.translation, this.matrix);

    this.changed = true;
  }

  /**
   *
   * @returns a 4x4 local transformation matrix
   */
  getLocalTransform() {
    if (this.transform === undefined || this.changed) {
      // if no animation is applied and the transform matrix is present use it directly
      if (
        this.animationTranslation === undefined &&
        this.animationRotation === undefined &&
        this.animationScale === undefined &&
        this.matrix !== undefined
      ) {
        this.transform = mat4.clone(this.matrix);
      } else {
        this.transform = mat4.create();
        const translation =
          this.animationTranslation !== undefined
            ? this.animationTranslation
            : this.translation;
        const rotation =
          this.animationRotation !== undefined
            ? this.animationRotation
            : this.rotation;
        const scale =
          this.animationScale !== undefined ? this.animationScale : this.scale;
        mat4.fromRotationTranslationScale(
          this.transform,
          rotation,
          translation,
          scale
        );
      }
      this.changed = false;
    }

    return mat4.clone(this.transform);
  }
}

export { gltfNode };
