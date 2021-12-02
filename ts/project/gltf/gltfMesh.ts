import { GltfObject } from "./GltfObject";
import { objectsFromJsons } from "./utils";
import { gltfPrimitive } from "./gltfPrimitive";

class gltfMesh extends GltfObject {
  primitives: any;
  name: any;
  weights: any;

  // non gltf
  weightsAnimated: any;

  constructor() {
    super();
    this.primitives = [];
    this.name = undefined;
    this.weights = [];

    // non gltf
    this.weightsAnimated = undefined;
  }

  fromJson(jsonMesh: any) {
    super.fromJson(jsonMesh);

    if (jsonMesh.name !== undefined) {
      this.name = jsonMesh.name;
    }

    this.primitives = objectsFromJsons(jsonMesh.primitives, gltfPrimitive);

    // ! N/A for box
    if (jsonMesh.weights !== undefined) {
      // this.weights = jsonMesh.weights;
    }
  }
}

export { gltfMesh };
