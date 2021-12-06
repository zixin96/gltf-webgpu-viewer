import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU";
import { initGlForMembers } from "./utils";
import { glTF } from "./glTF";

class gltfPrimitive extends GltfObject {
  // supported primitive features
  attributes: any;
  indices: number | undefined;
  mode: number | undefined;
  material: number | undefined;

  // non gltf

  // an array of objects containing information about a particular attribute
  // such as attribute name, attribute name in the shader, accessor index
  glAttributes: any;
  // whether to skip this primitive
  skip: boolean;
  // is this primitive has normal?
  hasNormals: boolean;

  // defines contain an array of "HAS_NORMAL_VEC3 1" if having normal as vec3, etc.
  // will be useful in shader
  defines: string[];

  constructor() {
    super();
    this.attributes = [];
    this.indices = undefined;
    this.material = undefined;
    this.mode = undefined;

    // non gltf
    this.glAttributes = [];
    this.defines = [];
    this.skip = true;
    this.hasNormals = false;
  }

  /**
   * initialize properties existed in the raw json files
   * @param jsonPrimitive
   */
  fromJson(jsonPrimitive: any) {
    super.fromJson(jsonPrimitive);
  }

  /**
   * 1. assign this primitive a default material if it doesn't have one
   * 2. initGl for all its member variables
   * 3. populate glAttributes
   * 4. populate defines used in shaders
   * @param gltf
   * @param device
   */
  initGl(gltf: glTF, device: GPUDevice) {
    // Use the default glTF material if no material is provided in gltf file.
    if (this.material === undefined) {
      this.material = gltf.materials.length - 1;
    }

    // call initGl for all its member variable if it has one
    initGlForMembers(this, gltf, device);

    const maxAttributes = device.limits.maxVertexAttributes;

    // Going through all vertex attributes:
    // 1. push them in the form of {attribute: 'NORMAL", name: 'a_normal', accessor: 1}
    // to this.glAttributes
    // 2. set up defines such as "HAS_NORMAL_VEC3 1" and store them in this.defines
    for (const attribute of Object.keys(this.attributes)) {
      if (this.glAttributes.length >= maxAttributes) {
        console.error(
          "To many vertex attributes for this primitive, skipping " + attribute
        );
        break;
      }

      const idx = this.attributes[attribute];
      this.glAttributes.push({
        attribute: attribute,
        name: "a_" + attribute.toLowerCase(),
        accessor: idx,
      });
      this.defines.push(`HAS_${attribute}_${gltf.accessors[idx].type} 1`);
      switch (attribute) {
        case "POSITION":
          this.skip = false; // we won't skip this primitive if it has position
          break;
        case "NORMAL":
          this.hasNormals = true;
          break;
        default:
          console.log("Unknown attribute: " + attribute);
      }
    }
  }

  getShaderIdentifier() {
    return "primitive.vert";
  }

  getDefines() {
    return this.defines;
  }
}

export { gltfPrimitive };
