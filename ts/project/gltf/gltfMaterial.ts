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

  initGl(gltf: any, webGPUContext: any) {
    if (this.normalTexture !== undefined) {
      // ! box doesn't have normal texture
      // this.normalTexture.samplerName = "u_NormalSampler";
      // this.parseTextureInfoExtensions(this.normalTexture, "Normal");
      // this.textures.push(this.normalTexture);
      // this.defines.push("HAS_NORMAL_MAP 1");
      // this.properties.set("u_NormalScale", this.normalTexture.scale);
      // this.properties.set("u_NormalUVSet", this.normalTexture.texCoord);
    }

    if (this.occlusionTexture !== undefined) {
      // ! box doesn't have occlusionTexture
      // this.occlusionTexture.samplerName = "u_OcclusionSampler";
      // this.parseTextureInfoExtensions(this.occlusionTexture, "Occlusion");
      // this.textures.push(this.occlusionTexture);
      // this.defines.push("HAS_OCCLUSION_MAP 1");
      // this.properties.set(
      //   "u_OcclusionStrength",
      //   this.occlusionTexture.strength
      // );
      // this.properties.set("u_OcclusionUVSet", this.occlusionTexture.texCoord);
    }

    this.properties.set("u_EmissiveFactor", this.emissiveFactor);
    if (this.emissiveTexture !== undefined) {
      // ! box doesn't have emissiveTexture
      // this.emissiveTexture.samplerName = "u_EmissiveSampler";
      // this.parseTextureInfoExtensions(this.emissiveTexture, "Emissive");
      // this.textures.push(this.emissiveTexture);
      // this.defines.push("HAS_EMISSIVE_MAP 1");
      // this.properties.set("u_EmissiveUVSet", this.emissiveTexture.texCoord);
    }

    if (this.baseColorTexture !== undefined) {
      // this.baseColorTexture.samplerName = "u_BaseColorSampler";
      // this.parseTextureInfoExtensions(this.baseColorTexture, "BaseColor");
      // this.textures.push(this.baseColorTexture);
      // this.defines.push("HAS_BASE_COLOR_MAP 1");
      // this.properties.set("u_BaseColorUVSet", this.baseColorTexture.texCoord);
    }

    if (this.metallicRoughnessTexture !== undefined) {
      // this.metallicRoughnessTexture.samplerName = "u_MetallicRoughnessSampler";
      // this.parseTextureInfoExtensions(
      //   this.metallicRoughnessTexture,
      //   "MetallicRoughness"
      // );
      // this.textures.push(this.metallicRoughnessTexture);
      // this.defines.push("HAS_METALLIC_ROUGHNESS_MAP 1");
      // this.properties.set(
      //   "u_MetallicRoughnessUVSet",
      //   this.metallicRoughnessTexture.texCoord
      // );
    }

    if (this.diffuseTexture !== undefined) {
      // this.diffuseTexture.samplerName = "u_DiffuseSampler";
      // this.parseTextureInfoExtensions(this.diffuseTexture, "Diffuse");
      // this.textures.push(this.diffuseTexture);
      // this.defines.push("HAS_DIFFUSE_MAP 1");
      // this.properties.set("u_DiffuseUVSet", this.diffuseTexture.texCoord);
    }

    if (this.specularGlossinessTexture !== undefined) {
      // this.specularGlossinessTexture.samplerName =
      //   "u_SpecularGlossinessSampler";
      // this.parseTextureInfoExtensions(
      //   this.specularGlossinessTexture,
      //   "SpecularGlossiness"
      // );
      // this.textures.push(this.specularGlossinessTexture);
      // this.defines.push("HAS_SPECULAR_GLOSSINESS_MAP 1");
      // this.properties.set(
      //   "u_SpecularGlossinessUVSet",
      //   this.specularGlossinessTexture.texCoord
      // );
    }

    this.defines.push("ALPHAMODE_OPAQUE 0");
    this.defines.push("ALPHAMODE_MASK 1");
    this.defines.push("ALPHAMODE_BLEND 2");
    // ! box is opaque
    if (this.alphaMode === "MASK") {
      // only set cutoff value for mask material
      // this.defines.push("ALPHAMODE ALPHAMODE_MASK");
      // this.properties.set("u_AlphaCutoff", this.alphaCutoff);
    } else if (this.alphaMode === "OPAQUE") {
      this.defines.push("ALPHAMODE ALPHAMODE_OPAQUE");
    } else {
      // this.defines.push("ALPHAMODE ALPHAMODE_BLEND");
    }

    // if we have SG, we prefer SG (best practice) but if we have neither objects we use MR default values
    if (this.type !== "SG") {
      this.defines.push("MATERIAL_METALLICROUGHNESS 1");
      this.properties.set("u_BaseColorFactor", vec4.fromValues(1, 1, 1, 1));
      this.properties.set("u_MetallicFactor", 1);
      this.properties.set("u_RoughnessFactor", 1);
    }

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

    // ! no extension in box
    if (this.extensions !== undefined) {
      // if (this.extensions.KHR_materials_unlit !== undefined) {
      //   this.defines.push("MATERIAL_UNLIT 1");
      // }
      // if (this.extensions.KHR_materials_pbrSpecularGlossiness !== undefined) {
      //   this.defines.push("MATERIAL_SPECULARGLOSSINESS 1");
      //   let diffuseFactor = vec4.fromValues(1, 1, 1, 1);
      //   let specularFactor = vec3.fromValues(1, 1, 1);
      //   let glossinessFactor = 1;
      //   if (
      //     this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor !==
      //     undefined
      //   ) {
      //     diffuseFactor = jsToGl(
      //       this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor
      //     );
      //   }
      //   if (
      //     this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor !==
      //     undefined
      //   ) {
      //     specularFactor = jsToGl(
      //       this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor
      //     );
      //   }
      //   if (
      //     this.extensions.KHR_materials_pbrSpecularGlossiness
      //       .glossinessFactor !== undefined
      //   ) {
      //     glossinessFactor =
      //       this.extensions.KHR_materials_pbrSpecularGlossiness
      //         .glossinessFactor;
      //   }
      //   this.properties.set("u_DiffuseFactor", diffuseFactor);
      //   this.properties.set("u_SpecularFactor", specularFactor);
      //   this.properties.set("u_GlossinessFactor", glossinessFactor);
      // }
      // // Clearcoat is part of the default metallic-roughness shader
      // if (this.extensions.KHR_materials_clearcoat !== undefined) {
      //   let clearcoatFactor = 0.0;
      //   let clearcoatRoughnessFactor = 0.0;
      //   this.hasClearcoat = true;
      //   if (
      //     this.extensions.KHR_materials_clearcoat.clearcoatFactor !== undefined
      //   ) {
      //     clearcoatFactor =
      //       this.extensions.KHR_materials_clearcoat.clearcoatFactor;
      //   }
      //   if (
      //     this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor !==
      //     undefined
      //   ) {
      //     clearcoatRoughnessFactor =
      //       this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor;
      //   }
      //   if (this.clearcoatTexture !== undefined) {
      //     this.clearcoatTexture.samplerName = "u_ClearcoatSampler";
      //     this.parseTextureInfoExtensions(this.clearcoatTexture, "Clearcoat");
      //     this.textures.push(this.clearcoatTexture);
      //     this.defines.push("HAS_CLEARCOAT_MAP 1");
      //     this.properties.set(
      //       "u_ClearcoatUVSet",
      //       this.clearcoatTexture.texCoord
      //     );
      //   }
      //   if (this.clearcoatRoughnessTexture !== undefined) {
      //     this.clearcoatRoughnessTexture.samplerName =
      //       "u_ClearcoatRoughnessSampler";
      //     this.parseTextureInfoExtensions(
      //       this.clearcoatRoughnessTexture,
      //       "ClearcoatRoughness"
      //     );
      //     this.textures.push(this.clearcoatRoughnessTexture);
      //     this.defines.push("HAS_CLEARCOAT_ROUGHNESS_MAP 1");
      //     this.properties.set(
      //       "u_ClearcoatRoughnessUVSet",
      //       this.clearcoatRoughnessTexture.texCoord
      //     );
      //   }
      //   if (this.clearcoatNormalTexture !== undefined) {
      //     this.clearcoatNormalTexture.samplerName = "u_ClearcoatNormalSampler";
      //     this.parseTextureInfoExtensions(
      //       this.clearcoatNormalTexture,
      //       "ClearcoatNormal"
      //     );
      //     this.textures.push(this.clearcoatNormalTexture);
      //     this.defines.push("HAS_CLEARCOAT_NORMAL_MAP 1");
      //     this.properties.set(
      //       "u_ClearcoatNormalUVSet",
      //       this.clearcoatNormalTexture.texCoord
      //     );
      //     this.properties.set(
      //       "u_ClearcoatNormalScale",
      //       this.clearcoatNormalTexture.scale
      //     );
      //   }
      //   this.properties.set("u_ClearcoatFactor", clearcoatFactor);
      //   this.properties.set(
      //     "u_ClearcoatRoughnessFactor",
      //     clearcoatRoughnessFactor
      //   );
      // }
      // // Sheen material extension
      // // https://github.com/sebavan/glTF/tree/KHR_materials_sheen/extensions/2.0/Khronos/KHR_materials_sheen
      // if (this.extensions.KHR_materials_sheen !== undefined) {
      //   let sheenRoughnessFactor = 0.0;
      //   let sheenColorFactor = vec3.fromValues(1.0, 1.0, 1.0);
      //   this.hasSheen = true;
      //   if (
      //     this.extensions.KHR_materials_sheen.sheenRoughnessFactor !== undefined
      //   ) {
      //     sheenRoughnessFactor =
      //       this.extensions.KHR_materials_sheen.sheenRoughnessFactor;
      //   }
      //   if (
      //     this.extensions.KHR_materials_sheen.sheenColorFactor !== undefined
      //   ) {
      //     sheenColorFactor = jsToGl(
      //       this.extensions.KHR_materials_sheen.sheenColorFactor
      //     );
      //   }
      //   if (this.sheenRoughnessTexture !== undefined) {
      //     this.sheenRoughnessTexture.samplerName = "u_sheenRoughnessSampler";
      //     this.parseTextureInfoExtensions(
      //       this.sheenRoughnessTexture,
      //       "SheenRoughness"
      //     );
      //     this.textures.push(this.sheenRoughnessTexture);
      //     this.defines.push("HAS_SHEEN_ROUGHNESS_MAP 1");
      //     this.properties.set(
      //       "u_SheenRoughnessUVSet",
      //       this.sheenRoughnessTexture.texCoord
      //     );
      //   }
      //   if (this.sheenColorTexture !== undefined) {
      //     this.sheenColorTexture.samplerName = "u_SheenColorSampler";
      //     this.parseTextureInfoExtensions(this.sheenColorTexture, "SheenColor");
      //     this.sheenColorTexture.linear = false;
      //     this.textures.push(this.sheenColorTexture);
      //     this.defines.push("HAS_SHEEN_COLOR_MAP 1");
      //     this.properties.set(
      //       "u_SheenColorUVSet",
      //       this.sheenColorTexture.texCoord
      //     );
      //   }
      //   this.properties.set("u_SheenRoughnessFactor", sheenRoughnessFactor);
      //   this.properties.set("u_SheenColorFactor", sheenColorFactor);
      // }
      // // KHR Extension: Specular
      // if (this.extensions.KHR_materials_specular !== undefined) {
      //   this.hasSpecular = true;
      //   if (this.specularTexture !== undefined) {
      //     this.specularTexture.samplerName = "u_SpecularSampler";
      //     this.parseTextureInfoExtensions(this.specularTexture, "Specular");
      //     this.textures.push(this.specularTexture);
      //     this.defines.push("HAS_SPECULAR_MAP 1");
      //     this.properties.set("u_SpecularUVSet", this.specularTexture.texCoord);
      //   }
      //   if (this.specularColorTexture !== undefined) {
      //     this.specularColorTexture.samplerName = "u_SpecularColorSampler";
      //     this.parseTextureInfoExtensions(
      //       this.specularColorTexture,
      //       "SpecularColor"
      //     );
      //     this.specularColorTexture.linear = false;
      //     this.textures.push(this.specularColorTexture);
      //     this.defines.push("HAS_SPECULAR_COLOR_MAP 1");
      //     this.properties.set(
      //       "u_SpecularColorUVSet",
      //       this.specularColorTexture.texCoord
      //     );
      //   }
      //   let specularColorFactor = jsToGl(
      //     this.extensions.KHR_materials_specular.specularColorFactor ?? [
      //       1.0, 1.0, 1.0,
      //     ]
      //   );
      //   let specularFactor =
      //     this.extensions.KHR_materials_specular.specularFactor ?? 1.0;
      //   this.properties.set(
      //     "u_KHR_materials_specular_specularColorFactor",
      //     specularColorFactor
      //   );
      //   this.properties.set(
      //     "u_KHR_materials_specular_specularFactor",
      //     specularFactor
      //   );
      // }
      // // KHR Extension: Transmission
      // if (this.extensions.KHR_materials_transmission !== undefined) {
      //   let transmissionFactor = 0.0;
      //   this.hasTransmission = true;
      //   if (transmissionFactor !== undefined) {
      //     transmissionFactor =
      //       this.extensions.KHR_materials_transmission.transmissionFactor;
      //   }
      //   if (this.transmissionTexture !== undefined) {
      //     this.transmissionTexture.samplerName = "u_TransmissionSampler";
      //     this.parseTextureInfoExtensions(
      //       this.transmissionTexture,
      //       "Transmission"
      //     );
      //     this.textures.push(this.transmissionTexture);
      //     this.defines.push("HAS_TRANSMISSION_MAP 1");
      //     this.properties.set(
      //       "u_TransmissionUVSet",
      //       this.transmissionTexture.texCoord
      //     );
      //   }
      //   this.properties.set("u_TransmissionFactor", transmissionFactor);
      // }
      // // KHR Extension: IOR
      // //https://github.com/DassaultSystemes-Technology/glTF/tree/KHR_materials_ior/extensions/2.0/Khronos/KHR_materials_ior
      // if (this.extensions.KHR_materials_ior !== undefined) {
      //   let ior = 1.5;
      //   this.hasIOR = true;
      //   if (this.extensions.KHR_materials_ior.ior !== undefined) {
      //     ior = this.extensions.KHR_materials_ior.ior;
      //   }
      //   this.properties.set("u_Ior", ior);
      // }
      // // KHR Extension: Volume
      // if (this.extensions.KHR_materials_volume !== undefined) {
      //   this.hasVolume = true;
      //   if (this.thicknessTexture !== undefined) {
      //     this.thicknessTexture.samplerName = "u_ThicknessSampler";
      //     this.parseTextureInfoExtensions(this.thicknessTexture, "Thickness");
      //     this.textures.push(this.thicknessTexture);
      //     this.defines.push("HAS_THICKNESS_MAP 1");
      //     this.properties.set(
      //       "u_ThicknessUVSet",
      //       this.thicknessTexture.texCoord
      //     );
      //   }
      //   let attenuationColor = jsToGl(
      //     this.extensions.KHR_materials_volume.attenuationColor ?? [
      //       1.0, 1.0, 1.0,
      //     ]
      //   );
      //   let attenuationDistance =
      //     this.extensions.KHR_materials_volume.attenuationDistance ?? 0.0;
      //   let thicknessFactor =
      //     this.extensions.KHR_materials_volume.thicknessFactor ?? 0.0;
      //   this.properties.set("u_AttenuationColor", attenuationColor);
      //   this.properties.set("u_AttenuationDistance", attenuationDistance);
      //   this.properties.set("u_ThicknessFactor", thicknessFactor);
      // }
    }

    initGlForMembers(this, gltf, webGPUContext);
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
