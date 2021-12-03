import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU";
import { initGlForMembers } from "./utils";
import { glTF } from "./glTF";

class gltfPrimitive extends GltfObject {
  attributes: any;
  targets: any;
  indices: any;
  material: any;
  mode: any;

  // non gltf
  glAttributes: any;
  morphTargetTextureInfo: any;
  // defines contain an array of "HAS_NORMAL_VEC3 1" if having normal as vec3, etc.
  // will be useful in shader
  defines: any;
  skip: any;
  hasWeights: any;
  hasJoints: any;
  hasNormals: any;
  hasTangents: any;
  hasTexcoord: any;
  hasColor: any;

  // The primitive centroid is used for depth sorting.
  centroid: any;

  constructor() {
    super();
    this.attributes = [];
    this.targets = [];
    this.indices = undefined;
    this.material = undefined;
    // this.mode = GL.TRIANGLES;
    this.mode = undefined; // ! figure out what GL is

    // non gltf
    this.glAttributes = [];
    this.morphTargetTextureInfo = undefined;
    this.defines = [];
    this.skip = true;
    this.hasWeights = false;
    this.hasJoints = false;
    this.hasNormals = false;
    this.hasTangents = false;
    this.hasTexcoord = false;
    this.hasColor = false;

    // The primitive centroid is used for depth sorting.
    this.centroid = undefined;
  }

  fromJson(jsonPrimitive: any) {
    super.fromJson(jsonPrimitive);

    if (jsonPrimitive.extensions !== undefined) {
      // this.fromJsonPrimitiveExtensions(jsonPrimitive.extensions);
    }
  }

  /**
   *
   * @param gltf
   * @param device
   */
  initGl(gltf: glTF, device: GPUDevice) {
    // Use the default glTF material if no material is provided in gltf file.
    if (this.material === undefined) {
      this.material = gltf.materials.length - 1;
    }

    // ! Note: for box primitive, this does nothing
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
        case "TANGENT":
          this.hasTangents = true;
          break;
        case "TEXCOORD_0":
          this.hasTexcoord = true;
          break;
        case "TEXCOORD_1":
          this.hasTexcoord = true;
          break;
        case "COLOR_0":
          this.hasColor = true;
          break;
        case "JOINTS_0":
          this.hasJoints = true;
          break;
        case "WEIGHTS_0":
          this.hasWeights = true;
          break;
        case "JOINTS_1":
          this.hasJoints = true;
          break;
        case "WEIGHTS_1":
          this.hasWeights = true;
          break;
        default:
          console.log("Unknown attribute: " + attribute);
      }
    }

    // ! centroid = (0, 0, 0) for box
    this.computeCentroid(gltf);
  }

  computeCentroid(gltf: any) {
    const positionsAccessor = gltf.accessors[this.attributes.POSITION];
    const positions = positionsAccessor.getNormalizedTypedView(gltf);

    if (this.indices !== undefined) {
      // Primitive has indices.

      const indicesAccessor = gltf.accessors[this.indices];

      const indices = indicesAccessor.getTypedView(gltf);

      const acc = new Float32Array(3);

      for (let i = 0; i < indices.length; i++) {
        const offset = 3 * indices[i];
        acc[0] += positions[offset];
        acc[1] += positions[offset + 1];
        acc[2] += positions[offset + 2];
      }

      const centroid = new Float32Array([
        acc[0] / indices.length,
        acc[1] / indices.length,
        acc[2] / indices.length,
      ]);

      this.centroid = centroid;
    } else {
      // Primitive does not have indices.

      const acc = new Float32Array(3);

      for (let i = 0; i < positions.length; i += 3) {
        acc[0] += positions[i];
        acc[1] += positions[i + 1];
        acc[2] += positions[i + 2];
      }

      const positionVectors = positions.length / 3;

      const centroid = new Float32Array([
        acc[0] / positionVectors,
        acc[1] / positionVectors,
        acc[2] / positionVectors,
      ]);

      this.centroid = centroid;
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
