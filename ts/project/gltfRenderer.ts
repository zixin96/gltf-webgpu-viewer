import { gltfWebGPU } from "./gltfWebGPU";
import { ShaderCache } from "./ShaderCache";
import { mat4, vec3, quat } from "gl-matrix";
import { gltfLight } from "./gltf/gltfLight";
import { gltfNode } from "./gltf/gltfNode";
import { GltfState } from "./GltfState";
import { CANVAS_SIZE } from "./constants";

const pbrShader = require("raw-loader!glslify-loader!./shaders/pbr.frag");
const brdfShader = require("raw-loader!glslify-loader!./shaders/brdf.glsl");
const materialInfoShader = require("raw-loader!glslify-loader!./shaders/material_info.glsl");
const iblShader = require("raw-loader!glslify-loader!./shaders/ibl.glsl");
const punctualShader = require("raw-loader!glslify-loader!./shaders/punctual.glsl");
const primitiveShader = require("raw-loader!glslify-loader!./shaders/primitive.vert");
const texturesShader = require("raw-loader!glslify-loader!./shaders/textures.glsl");
const tonemappingShader = require("raw-loader!glslify-loader!./shaders/tonemapping.glsl");
const shaderFunctions = require("raw-loader!glslify-loader!./shaders/functions.glsl");
const animationShader = require("raw-loader!glslify-loader!./shaders/animation.glsl");
const cubemapVertShader = require("raw-loader!glslify-loader!./shaders/cubemap.vert");
const cubemapFragShader = require("raw-loader!glslify-loader!./shaders/cubemap.frag");

class gltfRenderer {
  shader: any; // current shader

  currentWidth: any;
  currentHeight: any;

  webGPU: any;
  initialized: any;

  // create render target for non transmission materials
  opaqueRenderTexture: any;
  opaqueFramebuffer: any;
  opaqueDepthTexture: any;
  opaqueFramebufferWidth: any;
  opaqueFramebufferHeight: any;

  shaderCache: any;

  visibleLights: any;

  viewMatrix: any;
  projMatrix: any;
  viewProjectionMatrix: any;

  currentCameraPosition: any;

  lightKey: any;
  lightFill: any;

  colorRenderBuffer: any;
  depthRenderBuffer: any;
  opaqueFramebufferMSAA: any;

  nodes: any;
  opaqueDrawables: any;

  preparedScene: any;

  constructor(canvas: HTMLCanvasElement, device: GPUDevice, glslang: any) {
    this.shader = undefined; // current shader

    this.currentWidth = 0;
    this.currentHeight = 0;

    this.webGPU = new gltfWebGPU(canvas, device, glslang);
    this.initialized = false;

    // create render target for non transmission materials
    this.opaqueRenderTexture = 0;
    this.opaqueFramebuffer = 0;
    this.opaqueDepthTexture = 0;
    this.opaqueFramebufferWidth = CANVAS_SIZE;
    this.opaqueFramebufferHeight = CANVAS_SIZE;

    const shaderSources = new Map();
    shaderSources.set("primitive.vert", primitiveShader.default);
    shaderSources.set("pbr.frag", pbrShader.default);
    shaderSources.set("material_info.glsl", materialInfoShader.default);
    shaderSources.set("brdf.glsl", brdfShader.default);
    shaderSources.set("ibl.glsl", iblShader.default);
    shaderSources.set("punctual.glsl", punctualShader.default);
    shaderSources.set("tonemapping.glsl", tonemappingShader.default);
    shaderSources.set("textures.glsl", texturesShader.default);
    shaderSources.set("functions.glsl", shaderFunctions.default);
    shaderSources.set("animation.glsl", animationShader.default);
    shaderSources.set("cubemap.vert", cubemapVertShader.default);
    shaderSources.set("cubemap.frag", cubemapFragShader.default);

    // Creates a new ShaderCache object
    // side effect: update shader sources with #includes<> substituted
    // with actual code
    this.shaderCache = new ShaderCache(shaderSources, this.webGPU);

    // * in the Khronos implementation, here we will specify required webGL
    // * extensions, and load them. We are using WebGPU, so we don't have them here
    // * 1. EXT_texture_filter_anisotropic: expose two constants for anisotropic filtering (AF)
    // * 2. OES_texture_float_linear: allows linear filtering with floating-point pixel types for textures
    // ? What extensions do we need in WebGPU?

    this.visibleLights = [];

    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();

    this.currentCameraPosition = vec3.create();

    // lightKey and lightFill probably represent two default lights
    // in the scene when IBL is turned off
    this.lightKey = new gltfLight();
    this.lightFill = new gltfLight();
    this.lightFill.intensity = 0.5;
    const quatKey = quat.fromValues(
      -0.3535534,
      -0.353553385,
      -0.146446586,
      0.8535534
    );
    const quatFill = quat.fromValues(
      -0.8535534,
      0.146446645,
      -0.353553325,
      -0.353553444
    );
    this.lightKey.direction = vec3.create();
    this.lightFill.direction = vec3.create();
    vec3.transformQuat(this.lightKey.direction, [0, 0, -1], quatKey);
    vec3.transformQuat(this.lightFill.direction, [0, 0, -1], quatFill);
  }

  init(state: any, scene: any) {
    if (!this.initialized) {
      if (this.preparedScene !== scene) {
        this.prepareScene(state, scene); // prepare this.opaqueDrawables
        this.preparedScene = scene;
      }

      let currentCamera = undefined;

      if (state.cameraIndex === undefined) {
        currentCamera = state.userCamera;
      } else {
        currentCamera = state.gltf.cameras[state.cameraIndex].clone();
      }

      currentCamera.aspectRatio = 1;

      this.projMatrix = currentCamera.getProjectionMatrix();
      this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
      this.currentCameraPosition = currentCamera.getPosition(state.gltf);

      mat4.multiply(
        this.viewProjectionMatrix,
        this.projMatrix,
        this.viewMatrix
      );

      // used in 3d-view-control
      const cameraOption = {
        eye: this.currentCameraPosition,
        center: currentCamera.getLookDirection(),
        zoomMax: 1000,
        zoomSpeed: 2,
      };

      let modelMatrix;
      let normalMatrix;

      for (const drawable of this.opaqueDrawables) {
        const primitive = drawable.primitive;
        const drawIndexed = primitive.indices !== undefined;

        // 🔺 Buffers
        // create GPU buffer for indices
        if (drawIndexed) {
          if (!this.webGPU.setIndices(state.gltf, primitive.indices)) {
            return;
          }
        }

        // create GPU buffer for vertex attributes
        for (const attribute of primitive.glAttributes) {
          if (!this.webGPU.setVerticesAttrib(state.gltf, attribute)) {
            return;
          }
        }
        modelMatrix = drawable.node.worldTransform;
        normalMatrix = drawable.node.normalMatrix;
      }

      // 🖍️ Shaders
      this.webGPU.createVertexShaderModule();
      this.webGPU.createFragmentShaderModule();
      this.webGPU.createPipeline(
        cameraOption,
        this.viewMatrix,
        this.projMatrix,
        this.viewProjectionMatrix,
        modelMatrix,
        normalMatrix
      );
      this.initialized = true;
    }
  }

  resize(width: any, height: any) {
    if (this.currentWidth !== width || this.currentHeight !== height) {
      this.currentHeight = height;
      this.currentWidth = width;
      // ! WebGPU: this.passEncoder.setViewport, we choose to ignore this temporarily since canvas size is fixed
      // this.webGPU.context.viewport(0, 0, width, height);
    }
  }

  clearFrame(clearColor: any) {}

  /**
   * Called only once. populate this.opaqueDrawables containing {node: , primitive: }
   * @param state
   * @param scene
   */
  prepareScene(state: any, scene: any) {
    this.nodes = scene.gatherNodes(state.gltf);

    // collect drawables by essentially zipping primitives (for geometry and material)
    // and nodes for the transform
    const drawables = this.nodes
      .filter((node: any) => node.mesh !== undefined)
      .reduce(
        (acc: any, node: any) =>
          acc.concat(
            state.gltf.meshes[node.mesh].primitives.map((primitive: any) => {
              return { node: node, primitive: primitive };
            })
          ),
        []
      )
      .filter(({ node, primitive }: any) => primitive.material !== undefined);

    // opaque drawables don't need sorting
    this.opaqueDrawables = drawables.filter(
      ({ node, primitive }: any) =>
        state.gltf.materials[primitive.material].alphaMode !== "BLEND" &&
        (state.gltf.materials[primitive.material].extensions === undefined ||
          state.gltf.materials[primitive.material].extensions
            .KHR_materials_transmission === undefined)
    );
  }

  // /**
  //  * render complete gltf scene with given camera
  //  * @param state
  //  * @param scene
  //  */
  // drawScene(state: any, scene: any) {
  //   // prepare scene once
  //   if (this.preparedScene !== scene) {
  //     this.prepareScene(state, scene);
  //     this.preparedScene = scene;
  //   }

  //   let currentCamera = undefined;

  //   // ! we don't support gltf camera for now
  //   if (state.cameraIndex === undefined) {
  //     currentCamera = state.userCamera;
  //   }

  //   currentCamera.aspectRatio = this.currentWidth / this.currentHeight;

  //   this.projMatrix = currentCamera.getProjectionMatrix();
  //   this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
  //   this.currentCameraPosition = currentCamera.getPosition(state.gltf);

  //   this.visibleLights = this.getVisibleLights(state.gltf, scene);

  //   if (
  //     this.visibleLights.length === 0 &&
  //     true &&
  //     state.renderingParameters.useDirectionalLightsWithDisabledIBL
  //   ) {
  //     // ! These two lines should always be executed. CHECK HERE!
  //     // ! we assume there are two lights in the scene (since we don't support IBL for now)
  //     this.visibleLights.push(this.lightKey);
  //     this.visibleLights.push(this.lightFill);
  //   }

  //   mat4.multiply(this.viewProjectionMatrix, this.projMatrix, this.viewMatrix);

  //   // Render environment
  //   // ! don't render environment for now

  //   for (const drawable of this.opaqueDrawables) {
  //     var renderpassConfiguration: any = {};
  //     renderpassConfiguration.linearOutput = false;
  //     // this.drawPrimitive(
  //     //   state,
  //     //   renderpassConfiguration,
  //     //   drawable.primitive,
  //     //   drawable.node,
  //     //   this.viewProjectionMatrix
  //     // );
  //     this.drawPrimitiveWebGPU(
  //       state,
  //       drawable.primitive,
  //       drawable.node,
  //       this.viewProjectionMatrix
  //     );
  //   }

  //   // filter materials with transmission extension
  //   // ! no transmissionDrawables for box

  //   // ! no transparent for box
  // }

  // drawPrimitiveWebGPU(
  //   state: any,
  //   primitive: any,
  //   node: any,
  //   viewProjectionMatrix: any
  // ) {
  //   if (primitive.skip) return;
  //   let material = state.gltf.materials[primitive.material];

  //   this.webGPU.renderUsingWebGPU();
  // }

  //   drawPrimitive(
  //     state: any,
  //     renderpassConfiguration: any,
  //     primitive: any,
  //     node: any,
  //     viewProjectionMatrix: any,
  //     transmissionSampleTexture: any = undefined
  //   ) {
  //     if (primitive.skip) return;

  //     let material;
  //     if (primitive.mappings !== undefined && state.variant != "default") {
  //       // ! box skips this
  //     } else {
  //       material = state.gltf.materials[primitive.material];
  //     }

  //     //select shader permutation, compile and link program.

  //     let vertDefines: any = [];
  //     // ! pushVertParameterDefines doesn't do anything for box
  //     vertDefines = primitive.getDefines().concat(vertDefines);
  //     // ! for box: 'HAS_NORMAL_VEC3 1', 'HAS_POSITION_VEC3 1' are defined

  //     let fragDefines = material
  //       .getDefines(state.renderingParameters)
  //       .concat(vertDefines);
  //     // ! linearOutput doesn't get executed for box
  //     this.pushFragParameterDefines(fragDefines, state);
  //     // ! for box:
  //     /*
  //     "ALPHAMODE_OPAQUE 0"
  // "ALPHAMODE_MASK 1"
  // "ALPHAMODE_BLEND 2"
  //  "ALPHAMODE ALPHAMODE_OPAQUE"
  //  "MATERIAL_METALLICROUGHNESS 1"
  //  "HAS_NORMAL_VEC3 1"
  //  "HAS_POSITION_VEC3 1"
  //  "USE_PUNCTUAL 1"
  //  "LIGHT_COUNT 0"
  // */

  //     // ! for box: using primitive.vert and pbr.frag
  //     const fragmentHash = this.shaderCache.selectShader(
  //       material.getShaderIdentifier(),
  //       fragDefines
  //     );
  //     const vertexHash = this.shaderCache.selectShader(
  //       primitive.getShaderIdentifier(),
  //       vertDefines
  //     );

  //     if (fragmentHash && vertexHash) {
  //       this.shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
  //     }

  //     if (this.shader === undefined) {
  //       return;
  //     }

  //     this.webGPU.context.useProgram(this.shader.program);

  //     // ! we always have two default lights for now
  //     // if (state.renderingParameters.usePunctual) {
  //     if (true) {
  //       this.applyLights(state.gltf);
  //     }

  //     // update model dependant matrices once per node (transform matrices have already been calculated)
  //     this.shader.updateUniform("u_ViewProjectionMatrix", viewProjectionMatrix);
  //     this.shader.updateUniform("u_ModelMatrix", node.worldTransform);
  //     this.shader.updateUniform("u_NormalMatrix", node.normalMatrix, false);
  //     this.shader.updateUniform(
  //       "u_Exposure",
  //       state.renderingParameters.exposure,
  //       false
  //     );
  //     this.shader.updateUniform("u_Camera", this.currentCameraPosition, false);

  //     // ! specifies whether polygons are front- or back-facing by setting a winding orientation
  //     if (mat4.determinant(node.worldTransform) < 0.0) {
  //       // this.webGPU.context.frontFace(GL.CW); // ! figure out what GL should be
  //     } else {
  //       // this.webGPU.context.frontFace(GL.CCW); // ! figure out what GL should be
  //     }

  //     // ! enable or disable culling of polygons
  //     if (material.doubleSided) {
  //       // this.webGPU.context.disable(GL.CULL_FACE); // ! figure out what GL should be
  //     } else {
  //       // this.webGPU.context.enable(GL.CULL_FACE); // ! figure out what GL should be
  //     }

  //     if (material.alphaMode === "BLEND") {
  //       // ! no alpha mode for box
  //     } else {
  //       // this.webGPU.context.disable(GL.BLEND); // ! figure out what GL should be
  //     }

  //     const drawIndexed = primitive.indices !== undefined;
  //     if (drawIndexed) {
  //       if (!this.webGPU.setIndices(state.gltf, primitive.indices)) {
  //         return;
  //       }
  //     }

  //     for (const attribute of primitive.glAttributes) {
  //       const gltfAccessor = state.gltf.accessors[attribute.accessor];
  //       const location = this.shader.getAttributeLocation(attribute.name);
  //       if (location < 0) {
  //         continue; // only skip this attribute
  //       }
  //       if (!this.webGPU.enableAttribute(state.gltf, location, gltfAccessor)) {
  //         return; // skip this primitive
  //       }
  //     }

  //     for (let [uniform, val] of material.getProperties().entries()) {
  //       this.shader.updateUniform(uniform, val, false);
  //     }

  //     if (drawIndexed) {
  //       const indexAccessor = state.gltf.accessors[primitive.indices];
  //       // ! this needs to be changed to WebGPU format (drawindexed)
  //       this.webGPU.context.drawElements(
  //         primitive.mode,
  //         indexAccessor.count,
  //         indexAccessor.componentType,
  //         0
  //       );
  //     }

  //     // for (const attribute of primitive.glAttributes) {
  //     //   const location = this.shader.getAttributeLocation(attribute.name);
  //     //   if (location < 0) {
  //     //     continue; // skip this attribute
  //     //   }
  //     //   this.webGPU.context.disableVertexAttribArray(location);
  //     // }
  //   }

  //////////////////////////////////////
  // Helper functions
  //////////////////////////////////////

  /**
   *
   * @param gltf
   * @param scene
   * @returns all lights that are relevant for rendering or the default light if there are none
   */
  getVisibleLights(gltf: any, scene: any) {
    let lights = [];
    for (let light of gltf.lights) {
      if (light.node !== undefined) {
        if (scene.includesNode(gltf, light.node)) {
          lights.push(light);
        }
      }
    }
    // ! empty lights for box
    return lights;
  }

  pushVertParameterDefines(
    vertDefines: any,
    parameters: any,
    gltf: any,
    node: any,
    primitive: any
  ) {
    // skinning
    // ! no skinning for box
    // if (
    //   parameters.skinning &&
    //   node.skin !== undefined &&
    //   primitive.hasWeights &&
    //   primitive.hasJoints
    // ) {
    //   vertDefines.push("USE_SKINNING 1");
    // }
    // morphing
    // ! no morphing for box
    // if (
    //   parameters.morphing &&
    //   node.mesh !== undefined &&
    //   primitive.targets.length > 0
    // ) {
    //   const mesh = gltf.meshes[node.mesh];
    //   if (
    //     mesh.getWeightsAnimated() !== undefined &&
    //     mesh.getWeightsAnimated().length > 0
    //   ) {
    //     vertDefines.push("USE_MORPHING 1");
    //     vertDefines.push("WEIGHT_COUNT " + mesh.getWeightsAnimated().length);
    //   }
    // }
  }

  pushFragParameterDefines(fragDefines: any, state: any) {
    if (state.renderingParameters.usePunctual) {
      fragDefines.push("USE_PUNCTUAL 1");
      fragDefines.push("LIGHT_COUNT " + this.visibleLights.length);
    }

    if (state.renderingParameters.useIBL && state.environment) {
      fragDefines.push("USE_IBL 1");
    }

    // ! no tone map for now
    // switch (state.renderingParameters.toneMap) {
    //   case GltfState.ToneMaps.ACES_NARKOWICZ:
    //     fragDefines.push("TONEMAP_ACES_NARKOWICZ 1");
    //     break;
    //   case GltfState.ToneMaps.ACES_HILL:
    //     fragDefines.push("TONEMAP_ACES_HILL 1");
    //     break;
    //   case GltfState.ToneMaps.ACES_HILL_EXPOSURE_BOOST:
    //     fragDefines.push("TONEMAP_ACES_HILL_EXPOSURE_BOOST 1");
    //     break;
    //   case GltfState.ToneMaps.NONE:
    //   default:
    //     break;
    // }

    fragDefines.push("DEBUG_NONE 0");
    fragDefines.push("DEBUG_NORMAL 1");
    fragDefines.push("DEBUG_NORMAL_WORLD 2");
    fragDefines.push("DEBUG_NORMAL_GEOMETRY 3");
    fragDefines.push("DEBUG_TANGENT 4");
    fragDefines.push("DEBUG_BITANGENT 5");
    fragDefines.push("DEBUG_ROUGHNESS 6");
    fragDefines.push("DEBUG_METALLIC 7");
    fragDefines.push("DEBUG_BASE_COLOR_SRGB 8");
    fragDefines.push("DEBUG_BASE_COLOR_LINEAR 9");
    fragDefines.push("DEBUG_OCCLUSION 10");
    fragDefines.push("DEBUG_EMISSIVE_SRGB 11");
    fragDefines.push("DEBUG_EMISSIVE_LINEAR 12");
    fragDefines.push("DEBUG_F0 13");
    fragDefines.push("DEBUG_ALPHA 14");
    fragDefines.push("DEBUG_DIFFUSE_SRGB 15");
    fragDefines.push("DEBUG_SPECULAR_SRGB 16");
    fragDefines.push("DEBUG_CLEARCOAT_SRGB 17");
    fragDefines.push("DEBUG_SHEEN_SRGB 18");
    fragDefines.push("DEBUG_TRANSMISSION_SRGB 19");

    switch (state.renderingParameters.debugOutput) {
      default:
        fragDefines.push("DEBUG DEBUG_NONE");
        break;
      case GltfState.DebugOutput.NORMAL:
        fragDefines.push("DEBUG DEBUG_NORMAL");
        break;
      case GltfState.DebugOutput.WORLDSPACENORMAL:
        fragDefines.push("DEBUG DEBUG_NORMAL_WORLD");
        break;
      case GltfState.DebugOutput.GEOMETRYNORMAL:
        fragDefines.push("DEBUG DEBUG_NORMAL_GEOMETRY");
        break;
      case GltfState.DebugOutput.TANGENT:
        fragDefines.push("DEBUG DEBUG_TANGENT");
        break;
      case GltfState.DebugOutput.BITANGENT:
        fragDefines.push("DEBUG DEBUG_BITANGENT");
        break;
      case GltfState.DebugOutput.ROUGHNESS:
        fragDefines.push("DEBUG DEBUG_ROUGHNESS");
        break;
      case GltfState.DebugOutput.METALLIC:
        fragDefines.push("DEBUG DEBUG_METALLIC");
        break;
      case GltfState.DebugOutput.BASECOLOR:
        fragDefines.push("DEBUG DEBUG_BASE_COLOR_SRGB");
        break;
      case GltfState.DebugOutput.BASECOLOR_LINEAR:
        fragDefines.push("DEBUG DEBUG_BASE_COLOR_LINEAR");
        break;
      case GltfState.DebugOutput.OCCLUSION:
        fragDefines.push("DEBUG DEBUG_OCCLUSION");
        break;
      case GltfState.DebugOutput.EMISSIVE:
        fragDefines.push("DEBUG DEBUG_EMISSIVE_SRGB");
        break;
      case GltfState.DebugOutput.EMISSIVE_LINEAR:
        fragDefines.push("DEBUG DEBUG_EMISSIVE_LINEAR");
        break;
      case GltfState.DebugOutput.F0:
        fragDefines.push("DEBUG DEBUG_F0");
        break;
      case GltfState.DebugOutput.ALPHA:
        fragDefines.push("DEBUG DEBUG_ALPHA");
        break;
      case GltfState.DebugOutput.DIFFUSE:
        fragDefines.push("DEBUG DEBUG_DIFFUSE_SRGB");
        break;
      case GltfState.DebugOutput.SPECULAR:
        fragDefines.push("DEBUG DEBUG_SPECULAR_SRGB");
        break;
      case GltfState.DebugOutput.CLEARCOAT:
        fragDefines.push("DEBUG DEBUG_CLEARCOAT_SRGB");
        break;
      case GltfState.DebugOutput.SHEEN:
        fragDefines.push("DEBUG DEBUG_SHEEN_SRGB");
        break;
      case GltfState.DebugOutput.TRANSMISSION:
        fragDefines.push("DEBUG DEBUG_TRANSMISSION_SRGB");
        break;
    }
  }

  applyLights(gltf: any) {
    let uniformLights = [];
    for (let light of this.visibleLights) {
      uniformLights.push(light.toUniform(gltf));
    }

    if (uniformLights.length > 0) {
      this.shader.updateUniform("u_Lights", uniformLights);
    }
  }
}
export { gltfRenderer };
