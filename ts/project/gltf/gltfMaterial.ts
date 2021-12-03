import { GltfObject } from "./GltfObject";
import { mat3, vec3, vec4 } from "gl-matrix";
import { jsToGl, initGlForMembers } from "./utils";

class gltfMaterial extends GltfObject {
  name: any;
  pbrMetallicRoughness: any;
  normalTexture: any;
  occlusionTexture: any;
  emissiveTexture: any;
  emissiveFactor: any;
  alphaMode: any;
  alphaCutoff: any;
  doubleSided: any;

  // pbr next extension toggles
  hasClearcoat: any;
  hasSheen: any;
  hasTransmission: any;
  hasIOR: any;
  hasVolume: any;

  // non gltf properties
  type: any;
  textures: any;
  properties: any;
  defines: any;

  hasSpecular: any;
  baseColorTexture: any;
  metallicRoughnessTexture: any;
  diffuseTexture: any;
  specularGlossinessTexture: any;

  constructor() {
    super();
    this.name = undefined;
    this.pbrMetallicRoughness = undefined;
    this.normalTexture = undefined;
    this.occlusionTexture = undefined;
    this.emissiveTexture = undefined;
    this.emissiveFactor = vec3.fromValues(0, 0, 0);
    this.alphaMode = "OPAQUE";
    this.alphaCutoff = 0.5;
    this.doubleSided = false;

    // pbr next extension toggles
    this.hasClearcoat = false;
    this.hasSheen = false;
    this.hasTransmission = false;
    this.hasIOR = false;
    this.hasVolume = false;

    // non gltf properties
    this.type = "unlit";
    this.textures = [];
    this.properties = new Map();
    this.defines = [];
  }

  static createDefault() {
    const defaultMaterial = new gltfMaterial();
    defaultMaterial.type = "MR";
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
    switch (this.type) {
      default:
      case "SG": // fall through till we sparate shaders
      case "MR":
        return "pbr.frag";
      //case "SG": return "specular-glossiness.frag" ;
    }
  }

  getDefines(renderingParameters: any) {
    const defines = Array.from(this.defines);

    // ! the following if statements won't get executed for box
    if (
      this.hasClearcoat &&
      renderingParameters.enabledExtensions.KHR_materials_clearcoat
    ) {
      defines.push("MATERIAL_CLEARCOAT 1");
    }
    if (
      this.hasSheen &&
      renderingParameters.enabledExtensions.KHR_materials_sheen
    ) {
      defines.push("MATERIAL_SHEEN 1");
    }
    if (
      this.hasTransmission &&
      renderingParameters.enabledExtensions.KHR_materials_transmission
    ) {
      defines.push("MATERIAL_TRANSMISSION 1");
    }
    if (
      this.hasVolume &&
      renderingParameters.enabledExtensions.KHR_materials_volume
    ) {
      defines.push("MATERIAL_VOLUME 1");
    }
    if (
      this.hasIOR &&
      renderingParameters.enabledExtensions.KHR_materials_ior
    ) {
      defines.push("MATERIAL_IOR 1");
    }
    if (
      this.hasSpecular &&
      renderingParameters.enabledExtensions.KHR_materials_specular
    ) {
      defines.push("MATERIAL_SPECULAR 1");
    }

    return defines;
  }

  getProperties() {
    return this.properties;
  }

  /**
   * Called by glTF's initGL
   * @param gltf
   * @param device
   */
  initGl(gltf: any, device: GPUDevice) {
    this.properties.set("u_EmissiveFactor", this.emissiveFactor);
    this.defines.push("ALPHAMODE_OPAQUE 0");
    this.defines.push("ALPHAMODE_MASK 1");
    this.defines.push("ALPHAMODE_BLEND 2");
    // ! box is opaque
    if (this.alphaMode === "OPAQUE") {
      this.defines.push("ALPHAMODE ALPHAMODE_OPAQUE");
    }

    // If it's not SG, we use MR.
    // Set a reasonable default value
    if (this.type !== "SG") {
      this.defines.push("MATERIAL_METALLICROUGHNESS 1");
      this.properties.set("u_BaseColorFactor", vec4.fromValues(1, 1, 1, 1));
      this.properties.set("u_MetallicFactor", 1);
      this.properties.set("u_RoughnessFactor", 1);
    }

    // Set MR properties according to gltf file
    if (this.pbrMetallicRoughness !== undefined && this.type !== "SG") {
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

    // ! doesn't do anything for box
    initGlForMembers(this, gltf, device);
  }

  fromJson(jsonMaterial: any) {
    super.fromJson(jsonMaterial);

    if (jsonMaterial.emissiveFactor !== undefined) {
      // this.emissiveFactor = jsToGl(jsonMaterial.emissiveFactor);
    }

    if (jsonMaterial.normalTexture !== undefined) {
      // const normalTexture = new gltfTextureInfo();
      // normalTexture.fromJson(jsonMaterial.normalTexture);
      // this.normalTexture = normalTexture;
    }

    if (jsonMaterial.occlusionTexture !== undefined) {
      // const occlusionTexture = new gltfTextureInfo();
      // occlusionTexture.fromJson(jsonMaterial.occlusionTexture);
      // this.occlusionTexture = occlusionTexture;
    }

    if (jsonMaterial.emissiveTexture !== undefined) {
      // const emissiveTexture = new gltfTextureInfo(undefined, 0, false);
      // emissiveTexture.fromJson(jsonMaterial.emissiveTexture);
      // this.emissiveTexture = emissiveTexture;
    }

    if (jsonMaterial.extensions !== undefined) {
      // this.fromJsonMaterialExtensions(jsonMaterial.extensions);
    }

    if (jsonMaterial.pbrMetallicRoughness !== undefined && this.type !== "SG") {
      this.type = "MR";
      this.fromJsonMetallicRoughness(jsonMaterial.pbrMetallicRoughness);
    }
  }

  fromJsonMetallicRoughness(jsonMetallicRoughness: any) {
    if (jsonMetallicRoughness.baseColorTexture !== undefined) {
      // const baseColorTexture = new gltfTextureInfo(undefined, 0, false);
      // baseColorTexture.fromJson(jsonMetallicRoughness.baseColorTexture);
      // this.baseColorTexture = baseColorTexture;
    }

    if (jsonMetallicRoughness.metallicRoughnessTexture !== undefined) {
      // const metallicRoughnessTexture = new gltfTextureInfo();
      // metallicRoughnessTexture.fromJson(
      //   jsonMetallicRoughness.metallicRoughnessTexture
      // );
      // this.metallicRoughnessTexture = metallicRoughnessTexture;
    }
  }
}

export { gltfMaterial };
