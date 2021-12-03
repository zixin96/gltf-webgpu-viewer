import { gltfAccessor } from "./gltfAccessor";
import { gltfBuffer } from "./gltfBuffer";
import { gltfBufferView } from "./gltfBufferView";
import { gltfCamera } from "./gltfCamera";
import { gltfImage } from "./gltfImage";
import { gltfLight } from "./gltfLight";
import { ImageBasedLight } from "./ImageBasedLight";
import { gltfMaterial } from "./gltfMaterial";
import { gltfMesh } from "./gltfMesh";
import { gltfNode } from "./gltfNode";
import { gltfSampler } from "./gltfSampler";
import { gltfScene } from "./gltfScene";
import { gltfTexture } from "./gltfTexture";
import {
  initGlForMembers,
  objectsFromJsons,
  objectFromJson,
  getJsonLightsFromExtensions,
  getJsonIBLsFromExtensions,
  getJsonVariantsFromExtension,
  enforceVariantsUniqueness,
} from "./utils";
import { gltfAsset } from "./gltfAsset";
import { GltfObject } from "./GltfObject";
import { gltfAnimation } from "./gltfAnimation";
import { gltfSkin } from "./gltfSkin";
import { gltfVariant } from "./gltfVariant";

class glTF extends GltfObject {
  // the following are top-level elements in gltf json files
  asset: any;
  accessors: any;
  nodes: any;
  scene: any; // the default scene to show.
  scenes: any;
  cameras: any;
  lights: any;
  imageBasedLights: any;
  textures: any;
  images: any;
  samplers: any;
  meshes: any;
  buffers: any;
  bufferViews: any;
  materials: any;
  animations: any;
  skins: any;
  path: any;

  variants: any;

  constructor(file: any) {
    super();
    this.asset = undefined;
    this.accessors = [];
    this.nodes = [];
    this.scene = undefined; // the default scene to show.
    this.scenes = [];
    this.cameras = [];
    this.lights = [];
    this.imageBasedLights = [];
    this.textures = [];
    this.images = [];
    this.samplers = [];
    this.meshes = [];
    this.buffers = [];
    this.bufferViews = [];
    this.materials = [];
    this.animations = [];
    this.skins = [];
    this.path = file;
  }

  /**
   * ? This might be the top-level call to initialize all GL for this glTF
   * @param webGPUContext
   */
  initGl(webGPUContext: any) {
    initGlForMembers(this, this, webGPUContext);
  }

  /**
   * Given a raw json object, populate member variable of this glTF with
   * our own class types.
   * @param json Probably want to pass in the return value of gltf-loader-ts lib
   * I have checked that this json is a pure json
   */
  fromJson(json: any) {
    // populate this.accessors/materials... of this glTF object with RAW json objects
    super.fromJson(json);
    // populate this.accessors/materials... of this glTF object with our own gltfXXX objects
    this.asset = objectFromJson(json.asset, gltfAsset);
    this.cameras = objectsFromJsons(json.cameras, gltfCamera);
    this.accessors = objectsFromJsons(json.accessors, gltfAccessor);
    this.meshes = objectsFromJsons(json.meshes, gltfMesh);
    this.samplers = objectsFromJsons(json.samplers, gltfSampler);
    this.materials = objectsFromJsons(json.materials, gltfMaterial);
    this.buffers = objectsFromJsons(json.buffers, gltfBuffer);
    this.bufferViews = objectsFromJsons(json.bufferViews, gltfBufferView);
    this.scenes = objectsFromJsons(json.scenes, gltfScene);
    this.textures = objectsFromJsons(json.textures, gltfTexture);
    this.nodes = objectsFromJsons(json.nodes, gltfNode);
    this.lights = objectsFromJsons(
      getJsonLightsFromExtensions(json.extensions),
      gltfLight
    );
    this.imageBasedLights = objectsFromJsons(
      getJsonIBLsFromExtensions(json.extensions),
      ImageBasedLight
    );
    this.images = objectsFromJsons(json.images, gltfImage);
    this.animations = objectsFromJsons(json.animations, gltfAnimation);
    this.skins = objectsFromJsons(json.skins, gltfSkin);
    this.variants = objectsFromJsons(
      getJsonVariantsFromExtension(json.extensions),
      gltfVariant
    );
    this.variants = enforceVariantsUniqueness(this.variants);

    this.materials.push(gltfMaterial.createDefault()); // Note: here we create a extra default material even though in gltf file we only have one (for box)
    this.samplers.push(gltfSampler.createDefault());

    if (json.scenes !== undefined) {
      if (json.scene === undefined && json.scenes.length > 0) {
        this.scene = 0;
      } else {
        this.scene = json.scene;
      }
    }

    this.computeDisjointAnimations();
  }

  // Computes indices of animations which are disjoint and can be played simultaneously.
  computeDisjointAnimations() {
    // ! Box skips this whole function
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].disjointAnimations = [];

      for (let k = 0; k < this.animations.length; k++) {
        if (i == k) {
          continue;
        }

        let isDisjoint = true;

        for (const iChannel of this.animations[i].channels) {
          for (const kChannel of this.animations[k].channels) {
            if (
              iChannel.target.node === kChannel.target.node &&
              iChannel.target.path === kChannel.target.path
            ) {
              isDisjoint = false;
              break;
            }
          }
        }

        if (isDisjoint) {
          this.animations[i].disjointAnimations.push(k);
        }
      }
    }
  }

  nonDisjointAnimations(animationIndices: any) {
    // ! Box skips this whole function
    const animations = this.animations;
    const nonDisjointAnimations = [];

    for (let i = 0; i < animations.length; i++) {
      let isDisjoint = true;
      for (const k of animationIndices) {
        if (i == k) {
          continue;
        }

        if (!animations[k].disjointAnimations.includes(i)) {
          isDisjoint = false;
        }
      }

      if (!isDisjoint) {
        nonDisjointAnimations.push(i);
      }
    }

    return nonDisjointAnimations;
  }
}

export {
  glTF,
  gltfAccessor,
  gltfBuffer,
  gltfCamera,
  gltfImage,
  gltfLight,
  gltfMaterial,
  gltfMesh,
  gltfNode,
  gltfSampler,
  gltfScene,
  gltfTexture,
  gltfAsset,
  GltfObject,
  gltfAnimation,
  gltfSkin,
  gltfVariant,
};
