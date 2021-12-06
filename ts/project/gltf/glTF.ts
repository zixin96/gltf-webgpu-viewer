import { gltfAccessor } from "./gltfAccessor";
import { gltfBuffer } from "./gltfBuffer";
import { gltfBufferView } from "./gltfBufferView";
import { gltfCamera } from "./gltfCamera";
import { gltfLight } from "./gltfLight";
import { gltfMaterial } from "./gltfMaterial";
import { gltfMesh } from "./gltfMesh";
import { gltfNode } from "./gltfNode";
import { gltfScene } from "./gltfScene";
import { initGlForMembers, objectsFromJsons, objectFromJson } from "./utils";
import { gltfAsset } from "./gltfAsset";
import { GltfObject } from "./GltfObject";

class glTF extends GltfObject {
  // supported features of the top-level gltf json file
  // ! anything missing here is NOT supported
  accessors: gltfAccessor[];
  asset: gltfAsset | undefined;
  bufferViews: gltfBufferView[];
  buffers: gltfBuffer[];
  materials: gltfMaterial[];
  meshes: gltfMesh[];
  nodes: gltfNode[];
  scene: number | undefined;
  scenes: gltfScene[];

  /**
   * Initialize supported gltf features to dummy values
   */
  constructor() {
    super();
    this.accessors = [];
    this.asset = undefined;
    this.bufferViews = [];
    this.buffers = [];
    this.materials = [];
    this.meshes = [];
    this.nodes = [];
    this.scene = undefined;
    this.scenes = [];
  }

  /**
   * Given a raw unmodified json object, populate member variable of this glTF with
   * our own class types.
   */
  fromJson(json: any) {
    // populate supported features (this.XXX) with RAW json objects
    super.fromJson(json);
    // populate supported features (this.XXX) with our own class objects
    this.asset = objectFromJson(json.asset, gltfAsset);
    this.accessors = objectsFromJsons(json.accessors, gltfAccessor);
    this.meshes = objectsFromJsons(json.meshes, gltfMesh);
    this.materials = objectsFromJsons(json.materials, gltfMaterial);
    this.buffers = objectsFromJsons(json.buffers, gltfBuffer);
    this.bufferViews = objectsFromJsons(json.bufferViews, gltfBufferView);
    this.scenes = objectsFromJsons(json.scenes, gltfScene);
    this.nodes = objectsFromJsons(json.nodes, gltfNode);

    // if there are no material provided in the gltf file, use this default one
    this.materials.push(gltfMaterial.createDefault());

    // choose our scene
    if (json.scenes !== undefined) {
      if (json.scene === undefined && json.scenes.length > 0) {
        this.scene = 0;
      } else {
        this.scene = json.scene;
      }
    }
  }

  /**
   * This will call all initGL for its member variable
   * @param device
   */
  initGl(device: GPUDevice) {
    initGlForMembers(this, this, device);
  }
}

export {
  glTF,
  gltfAccessor,
  gltfBuffer,
  gltfCamera,
  gltfLight,
  gltfMaterial,
  gltfMesh,
  gltfNode,
  gltfScene,
  gltfAsset,
  GltfObject,
};
