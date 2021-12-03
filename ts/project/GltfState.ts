import { UserCamera } from "./gltf/UserCamera";
import { glTF } from "./gltf/glTF";
class GltfState {
  // gltf is loaded by ResourceLoader::loadGltf
  gltf: glTF | undefined;
  /** loaded environment data @see ResourceLoader.loadEnvironment */
  environment: any;
  /** user camera @see UserCamera, convenient camera controls */
  userCamera: any;
  /** gltf scene that is visible in the view */
  sceneIndex: any;
  /**
   * index of the camera that is used to render the view. a
   * value of 'undefined' enables the user camera
   */
  cameraIndex: any;
  /** indices of active animations */
  animationIndices: any;
  /** animation timer allows to control the animation time */
  // ! not needed for box
  // animationTimer: any;
  /** KHR_materials_variants */
  variant: any;

  /** parameters used to configure the rendering */
  renderingParameters: any;

  // retain a reference to the view with which the state was created, so that it can be validated
  _view: any;

  static DebugOutput: any;

  constructor(view: any) {
    this.gltf = undefined;
    this.environment = undefined;
    this.userCamera = new UserCamera();
    this.sceneIndex = 0;
    this.cameraIndex = undefined;
    this.animationIndices = [];
    // this.animationTimer = new AnimationTimer();
    /** KHR_materials_variants */
    this.variant = undefined;

    /** parameters used to configure the rendering */
    this.renderingParameters = {
      /** morphing between vertices */
      morphing: true,
      /** skin / skeleton */
      skinning: true,

      enabledExtensions: {
        /** KHR_materials_clearcoat */
        KHR_materials_clearcoat: true,
        /** KHR_materials_sheen */
        KHR_materials_sheen: true,
        /** KHR_materials_transmission */
        KHR_materials_transmission: true,
        /** KHR_materials_volume */
        KHR_materials_volume: true,
        /** KHR_materials_ior makes the index of refraction configurable */
        KHR_materials_ior: true,
        /** KHR_materials_specular allows configuring specular color (f0 color) and amount of specular reflection */
        KHR_materials_specular: true,
      },
      /** clear color expressed as list of ints in the range [0, 255] */
      clearColor: [58, 64, 74, 255],
      /** exposure factor */
      exposure: 1.0,
      /** KHR_lights_punctual */
      usePunctual: true,
      /** image based lighting */
      useIBL: true,
      /** render the environment map in the background */
      renderEnvironmentMap: true,
      /** apply blur to the background environment map */
      blurEnvironmentMap: true,
      /** which tonemap to use, use ACES for a filmic effect */
      // ! disable tonemap for box
      // toneMap: GltfState.ToneMaps.LINEAR,
      /** render some debug output channes, such as for example the normals */
      debugOutput: GltfState.DebugOutput.NONE,
      /**
       * By default the front face of the environment is +Z (90)
       * Front faces:
       * +X = 0
       * +Z = 90
       * -X = 180
       * -Z = 270
       */
      environmentRotation: 90.0,
      /** If this is set to true, directional lights will be generated if IBL is disabled */
      useDirectionalLightsWithDisabledIBL: false,
      /** MSAA used for cases which are not handled by the browser (e.g. Transmission)*/
      internalMSAA: 4,
    };

    // retain a reference to the view with which the state was created, so that it can be validated
    this._view = view;
  }
}

/**
 * DebugOutput enum for selecting debug output channels
 * such as "NORMAL"
 */
GltfState.DebugOutput = {
  /** standard rendering - debug output is disabled */
  NONE: "None",
  /** output the metallic value from pbr metallic roughness */
  METALLIC: "Metallic",
  /** output the roughness value from pbr metallic roughness */
  ROUGHNESS: "Roughness",
  /** output the normal map value in TBN space */
  NORMAL: "Normal",
  /** output the world space normals (i.e. with TBN applied) */
  WORLDSPACENORMAL: "Worldspace Normal",
  /** output the normal from the TBN*/
  GEOMETRYNORMAL: "Geometry Normal",
  /** output the tangent from the TBN*/
  TANGENT: "Tangent",
  /** output the bitangent from the TBN */
  BITANGENT: "Bitangent",
  /** output the base color value */
  BASECOLOR: "Base Color",
  /** output the linear base color value */
  BASECOLOR_LINEAR: "Base Color (Linear)",
  /** output the occlusion value */
  OCCLUSION: "Occlusion",
  /** output the emissive value */
  EMISSIVE: "Emissive",
  /** output the linear emissive value */
  EMISSIVE_LINEAR: "Emissive (Linear)",
  /** output diffuse lighting */
  DIFFUSE: "Diffuse",
  /** output specular lighting */
  SPECULAR: "Specular",
  /** output clearcoat lighting */
  CLEARCOAT: "ClearCoat",
  /** output sheen lighting */
  SHEEN: "Sheen",
  /** output tranmission lighting */
  TRANSMISSION: "Transmission",
  /** output the alpha value */
  ALPHA: "Alpha",
  /** output computed F0 */
  F0: "F0",
};

export { GltfState };
