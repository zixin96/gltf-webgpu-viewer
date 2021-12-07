import { gltfCamera } from "./gltfCamera";
import { vec3, mat4 } from "gl-matrix";
import { glTF } from "./glTF";
import { getSceneExtents, clamp } from "./utils";

const PanSpeedDenominator = 3500;
const MaxNearFarRatio = 10000;

class UserCamera extends gltfCamera {
  transform: mat4 = mat4.create();
  rotAroundY: number = 0;
  rotAroundX: number = 0;
  distance: number = 1;
  baseDistance: number = 1.0;
  zoomExponent: number = 5.0;
  zoomFactor: number = 0.01;
  orbitSpeed: number = 1 / 180;
  panSpeed: number = 1;
  sceneExtents: any = {
    min: vec3.create(),
    max: vec3.create(),
  };

  constructor() {
    super();
  }

  /**
   * Returns the current target the camera looks at as vec3.
   * This multiplies the viewing direction with the distance.
   * For distance 0 the normalized viewing direction is used.
   */
  getTarget() {
    const target = vec3.create();
    const position = this.getPosition();
    let lookDirection = this.getLookDirection();
    if (this.distance != 0 && this.distance != 1) {
      lookDirection = lookDirection.map((x) => x * this.distance) as vec3;
    }
    vec3.add(target, lookDirection, position);
    return target;
  }

  /**
   *
   * @returns get user camera transformation matrix
   */
  getTransformMatrix() {
    return this.transform;
  }

  /**
   *
   * @returns the current position of the user camera as a vec3
   */
  getPosition() {
    let pos = vec3.create();
    mat4.getTranslation(pos, this.transform);
    return pos;
  }

  /**
   *
   * @returns the normalized direction the user camera looks at as vec3.
   */
  getLookDirection() {
    let dir = [
      -this.transform[8],
      -this.transform[9],
      -this.transform[10],
    ] as vec3;
    vec3.normalize(dir, dir);
    return dir;
  }

  /**
   * Sets the position of the user camera.
   * @param position
   */
  setPosition(position: vec3) {
    this.transform[12] = position[0];
    this.transform[13] = position[1];
    this.transform[14] = position[2];
  }

  /**
   * Sets the rotation of the camera.
   * Yaw and pitch in euler angles (degrees).
   * @param yaw
   * @param pitch
   */
  setRotation(yaw: number, pitch: number) {
    const tmpPos = this.getPosition();
    let mat4x = mat4.create();
    let mat4y = mat4.create();
    mat4.fromXRotation(mat4x, pitch);
    mat4.fromYRotation(mat4y, yaw);
    this.transform = mat4y;
    this.setPosition(tmpPos);
    mat4.multiply(this.transform, this.transform, mat4x);
  }

  /**
   * Transforms the user camera to look at a target from a specific distance using the current rotation.
   * This will only change the position of the user camera, not the rotation.
   * Use this function to set the distance.
   * @param distance
   * @param target
   */
  setDistanceFromTarget(distance: number, target: vec3) {
    const lookDirection = this.getLookDirection();
    const distVec = lookDirection.map((x) => x * -distance) as vec3;
    let pos = vec3.create();
    vec3.add(pos, target, distVec);
    this.setPosition(pos);
    this.distance = distance;
  }

  /**
   * Adjust this.panSpeed
   * @param min
   * @param max
   */
  fitPanSpeedToScene(min: vec3, max: vec3) {
    const longestDistance = vec3.distance(min, max);
    this.panSpeed = longestDistance / PanSpeedDenominator;
  }

  /**
   * Calculates a camera position which looks at the center of the scene from an appropriate distance.
   * This calculates near and far plane as well.
   * @param gltf
   * @param sceneIndex
   */
  fitViewToScene(gltf: glTF, sceneIndex: number) {
    this.transform = mat4.create();
    this.rotAroundX = 0;
    this.rotAroundY = 0;
    getSceneExtents(
      gltf,
      sceneIndex,
      this.sceneExtents.min,
      this.sceneExtents.max
    );
    this.fitDistanceToExtents(this.sceneExtents.min, this.sceneExtents.max);
    this.fitCameraTargetToExtents(this.sceneExtents.min, this.sceneExtents.max);

    this.fitPanSpeedToScene(this.sceneExtents.min, this.sceneExtents.max);
    this.fitCameraPlanesToExtents(this.sceneExtents.min, this.sceneExtents.max);
  }

  fitDistanceToExtents(min: vec3, max: vec3) {
    const maxAxisLength = Math.max(max[0] - min[0], max[1] - min[1]);
    const yfov = this.yfov;
    const xfov = this.yfov * this.aspectRatio!;

    const yZoom = maxAxisLength / 2 / Math.tan(yfov / 2);
    const xZoom = maxAxisLength / 2 / Math.tan(xfov / 2);

    this.distance = Math.max(xZoom, yZoom);
    this.baseDistance = this.distance;
  }

  fitCameraTargetToExtents(min: vec3, max: vec3) {
    let target = [0, 0, 0] as vec3;
    for (const i of [0, 1, 2]) {
      target[i] = (max[i] + min[i]) / 2;
    }
    this.setRotation(this.rotAroundY, this.rotAroundX);
    this.setDistanceFromTarget(this.distance, target);
  }

  fitCameraPlanesToExtents(min: vec3, max: vec3) {
    // depends only on scene min/max and the camera distance

    // Manually increase scene extent just for the camera planes to avoid camera clipping in most situations.
    const longestDistance = 10 * vec3.distance(min, max);
    let zNear = this.distance - longestDistance * 0.6;
    let zFar = this.distance + longestDistance * 0.6;

    // minimum near plane value needs to depend on far plane value to avoid z fighting or too large near planes
    zNear = Math.max(zNear, zFar / MaxNearFarRatio);

    this.znear = zNear;
    this.zfar = zFar;
  }
}

export { UserCamera };
