import { GltfObject } from "./GltfObject";
import { mat3, vec3, vec4 } from "gl-matrix";
import { jsToGl, initGlForMembers } from "./utils";

class gltfMaterial extends GltfObject {
  // supported materials features
  pbrMetallicRoughness: any;
  name: string | undefined;

  // non gltf properties
  alphaMode: string;
  // this contains uniform values for this material
  properties: any;
  // this contains defines for this material
  defines: any;

  constructor() {
    super();
    this.name = undefined;
    this.pbrMetallicRoughness = undefined;
    this.alphaMode = "OPAQUE";

    // non gltf properties
    this.properties = new Map();
    this.defines = [];
  }

  fromJson(jsonMaterial: any) {
    super.fromJson(jsonMaterial);
  }

  /**
   * Called by glTF's initGL
   * @param gltf
   * @param device
   */
  initGl(gltf: any, device: GPUDevice) {
    this.defines.push("ALPHAMODE_OPAQUE 0");
    this.defines.push("ALPHAMODE_MASK 1");
    this.defines.push("ALPHAMODE_BLEND 2");

    if (this.alphaMode === "OPAQUE") {
      this.defines.push("ALPHAMODE ALPHAMODE_OPAQUE");
    }

    // give a reasonable default MR properties
    this.defines.push("MATERIAL_METALLICROUGHNESS 1");
    // ! Order matters: basecolorFactor first to avoid paddings
    this.properties.set("u_BaseColorFactor", vec4.fromValues(1, 1, 1, 1));
    this.properties.set("u_MetallicFactor", 1);
    this.properties.set("u_RoughnessFactor", 1);

    // Set MR properties according to gltf file
    if (this.pbrMetallicRoughness !== undefined) {
      if (this.pbrMetallicRoughness.baseColorFactor !== undefined) {
        let baseColorFactor = jsToGl(this.pbrMetallicRoughness.baseColorFactor);
        this.properties.set("u_BaseColorFactor", baseColorFactor);
      }

      if (this.pbrMetallicRoughness.metallicFactor !== undefined) {
        let metallicFactor = this.pbrMetallicRoughness.metallicFactor;
        this.properties.set("u_MetallicFactor", metallicFactor);
      }

      if (this.pbrMetallicRoughness.roughnessFactor !== undefined) {
        let roughnessFactor = this.pbrMetallicRoughness.roughnessFactor;
        this.properties.set("u_RoughnessFactor", roughnessFactor);
      }
    }

    initGlForMembers(this, gltf, device);
  }

  static createDefault() {
    const defaultMaterial = new gltfMaterial();
    defaultMaterial.name = "Default Material";
    defaultMaterial.defines.push("MATERIAL_METALLICROUGHNESS 1");
    const baseColorFactor = vec4.fromValues(1, 1, 1, 1);
    const metallicFactor = 1;
    const roughnessFactor = 1;
    defaultMaterial.properties.set("u_BaseColorFactor", baseColorFactor);
    defaultMaterial.properties.set("u_MetallicFactor", metallicFactor);
    defaultMaterial.properties.set("u_RoughnessFactor", roughnessFactor);

    return defaultMaterial;
  }

  getShaderIdentifier() {
    return "pbr.frag";
  }

  getDefines(renderingParameters: any) {
    const defines = Array.from(this.defines);
    return defines;
  }

  getProperties() {
    return this.properties;
  }
}

export { gltfMaterial };
