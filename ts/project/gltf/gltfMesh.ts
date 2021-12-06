import { GltfObject } from "./GltfObject";
import { objectsFromJsons } from "./utils";
import { gltfPrimitive } from "./gltfPrimitive";

class gltfMesh extends GltfObject {
  // supported mesh features
  primitives: gltfPrimitive[];
  name: string | undefined;

  constructor() {
    super();
    this.primitives = [];
    this.name = undefined;
  }

  fromJson(jsonMesh: any) {
    super.fromJson(jsonMesh);

    if (jsonMesh.name !== undefined) {
      this.name = jsonMesh.name;
    }

    this.primitives = objectsFromJsons(jsonMesh.primitives, gltfPrimitive);
  }
}

export { gltfMesh };
