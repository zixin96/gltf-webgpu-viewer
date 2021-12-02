import { GltfObject } from "./GltfObject";
import { mat4, vec3 } from "gl-matrix";
import { glTF } from "./glTF";

class gltfCamera extends GltfObject {
  type: String;
  znear: number;
  zfar: number;
  yfov: number; // radians
  xmag: number;
  ymag: number;
  aspectRatio: number | undefined;
  name: any;
  node: any;

  constructor(
    type = "perspective",
    znear = 0.01,
    zfar = Infinity,
    yfov = (45.0 * Math.PI) / 180.0,
    aspectRatio = undefined,
    xmag = 1.0,
    ymag = 1.0,
    name = undefined,
    nodeIndex = undefined
  ) {
    super();
    this.type = type;
    this.znear = znear;
    this.zfar = zfar;
    this.yfov = yfov; // radians
    this.xmag = xmag;
    this.ymag = ymag;
    this.aspectRatio = aspectRatio;
    this.name = name;
    this.node = nodeIndex;
  }

  // ! drawables have no elements (for box), this function is skipped
  sortPrimitivesByDepth(gltf: glTF, drawables: any) {
    // Precompute the distances to avoid their computation during sorting.
    for (const drawable of drawables) {
      const modelView = mat4.create();
      mat4.multiply(
        modelView,
        this.getViewMatrix(gltf),
        drawable.node.worldTransform
      );

      // Transform primitive centroid to find the primitive's depth.
      const pos = vec3.transformMat4(
        vec3.create(),
        vec3.clone(drawable.primitive.centroid),
        modelView
      );

      drawable.depth = pos[2];
    }

    // 1. Remove primitives that are behind the camera.
    //    --> They will never be visible and it is cheap to discard them here.
    // 2. Sort primitives so that the furthest nodes are rendered first.
    //    This is required for correct transparency rendering.
    return drawables
      .filter((a: any) => a.depth <= 0)
      .sort((a: any, b: any) => a.depth - b.depth);
  }

  /**
   *
   * @returns a project matrix based on camera type
   */
  getProjectionMatrix() {
    const projection = mat4.create();

    if (this.type === "perspective") {
      mat4.perspective(
        projection,
        this.yfov,
        this.aspectRatio!, // aspectRatio won't be undefined here
        this.znear,
        this.zfar
      );
    } else if (this.type === "orthographic") {
      projection[0] = 1.0 / this.xmag;
      projection[5] = 1.0 / this.ymag;
      projection[10] = 2.0 / (this.znear - this.zfar);
      projection[14] = (this.zfar + this.znear) / (this.znear - this.zfar);
    }

    return projection;
  }

  /**
   *
   * @param gltf
   * @returns a view matrix by inverting the camera's transform matrix
   * ! In box case, this.getTransformMatrix is in UserCamera class
   */
  getViewMatrix(gltf: glTF) {
    let result = mat4.create();
    mat4.invert(result, this.getTransformMatrix(gltf));
    return result;
  }

  // ! In box case, this function won't be called
  getTransformMatrix(gltf: glTF) {
    const node = this.getNode(gltf);
    if (node !== undefined && node.worldTransform !== undefined) {
      return node.worldTransform;
    }
    return mat4.create();
  }

  // ! In box case, this function won't be called
  getNode(gltf: glTF) {
    return gltf.nodes[this.node];
  }
}

export { gltfCamera };
