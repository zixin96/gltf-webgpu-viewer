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
  samples: any;

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

  constructor(device: GPUDevice) {
    this.shader = undefined; // current shader

    this.currentWidth = 0;
    this.currentHeight = 0;

    this.webGPU = new gltfWebGPU(device);
    // ! after this line, we should have GL set, but currently we don't know
    // ! what GL should be
    this.initialized = false;
    this.samples = 4;

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

  init(state: any) {
    const context = this.webGPU.context;
    // ! Get number of samples to take for multisample render buffer
    const maxSamples = 8;
    const samples = 8;

    if (!this.initialized) {
      // ! set pixel storage modes: no color space conversion
      // context.pixelStorei(GL.UNPACK_COLORSPACE_CONVERSION_WEBGL, GL.NONE);
      // ! enable DEPTH_TEST: Activates depth comparisons and updates to the depth buffer.
      // context.enable(GL.DEPTH_TEST);
      // ! depth function used: pass if the incoming value is less than or equal to the depth buffer value
      // context.depthFunc(GL.LEQUAL);
      // ! RGBA can all be written to the frame buffer
      context.colorMask(true, true, true, true);
      // ! when depth buffer is cleared, it is set to 1.0
      context.clearDepth(1.0);
      // ! create a WebGLTexture object
      this.opaqueRenderTexture = context.createTexture();
      // ! bind opaqueRenderTexture to TEXTURE_2D
      context.bindTexture(context.TEXTURE_2D, this.opaqueRenderTexture);
      // ! set 4 parameters: min/mag fitler, s/t address mode to the desired value
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MIN_FILTER,
        context.LINEAR_MIPMAP_LINEAR
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_S,
        context.CLAMP_TO_EDGE
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_T,
        context.CLAMP_TO_EDGE
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MAG_FILTER,
        context.NEAREST
      );
      // ! put the image into this texture
      context.texImage2D(
        context.TEXTURE_2D,
        0, // LOD
        context.RGBA, // internal format
        this.opaqueFramebufferWidth, // width of the texture
        this.opaqueFramebufferHeight, // height of the texture
        0, // the width of the border. Must be 0.
        context.RGBA, // same as internal format
        context.UNSIGNED_BYTE, // the data type of the texel data:8 bits per channel for gl.RGBA
        null // ? why is this null? when do we put the image into the buffer?
      );
      context.bindTexture(context.TEXTURE_2D, null);

      // ! do all the above, but this time for depth texture
      this.opaqueDepthTexture = context.createTexture();
      context.bindTexture(context.TEXTURE_2D, this.opaqueDepthTexture);
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MIN_FILTER,
        context.NEAREST
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_S,
        context.CLAMP_TO_EDGE
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_T,
        context.CLAMP_TO_EDGE
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MAG_FILTER,
        context.NEAREST
      );
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.DEPTH_COMPONENT16,
        this.opaqueFramebufferWidth,
        this.opaqueFramebufferHeight,
        0,
        context.DEPTH_COMPONENT,
        context.UNSIGNED_SHORT,
        null
      );
      context.bindTexture(context.TEXTURE_2D, null);

      // ! create 2 render buffers
      // ? why do we need render buffers? Render buffers are for MSAA and transmissive materials
      this.colorRenderBuffer = context.createRenderbuffer();
      context.bindRenderbuffer(context.RENDERBUFFER, this.colorRenderBuffer);
      context.renderbufferStorageMultisample(
        context.RENDERBUFFER,
        samples,
        context.RGBA8,
        this.opaqueFramebufferWidth,
        this.opaqueFramebufferHeight
      );

      this.depthRenderBuffer = context.createRenderbuffer();
      context.bindRenderbuffer(context.RENDERBUFFER, this.depthRenderBuffer);
      context.renderbufferStorageMultisample(
        context.RENDERBUFFER,
        samples, // the number of samples to be used for the renderbuffer storage
        context.DEPTH_COMPONENT16, // the internal format of the renderbuffer.
        this.opaqueFramebufferWidth, // same as texture and depth buffer
        this.opaqueFramebufferHeight
      );

      this.samples = samples;

      // ! create framebuffer for render buffers
      this.opaqueFramebufferMSAA = context.createFramebuffer();
      context.bindFramebuffer(context.FRAMEBUFFER, this.opaqueFramebufferMSAA);
      context.framebufferRenderbuffer(
        context.FRAMEBUFFER,
        context.COLOR_ATTACHMENT0, // color buffer
        context.RENDERBUFFER,
        this.colorRenderBuffer // object to attach.
      );
      context.framebufferRenderbuffer(
        context.FRAMEBUFFER,
        context.DEPTH_ATTACHMENT,
        context.RENDERBUFFER,
        this.depthRenderBuffer
      );

      // ! create framebuffer for texture
      this.opaqueFramebuffer = context.createFramebuffer();
      context.bindFramebuffer(context.FRAMEBUFFER, this.opaqueFramebuffer);
      context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.COLOR_ATTACHMENT0,
        context.TEXTURE_2D,
        this.opaqueRenderTexture,
        0
      );
      context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.DEPTH_ATTACHMENT,
        context.TEXTURE_2D,
        this.opaqueDepthTexture,
        0
      );
      context.viewport(
        0,
        0,
        this.opaqueFramebufferWidth,
        this.opaqueFramebufferHeight
      );
      context.bindFramebuffer(context.FRAMEBUFFER, null);

      this.initialized = true;

      // this.environmentRenderer = new EnvironmentRenderer(this.webGPU);
    } else {
      if (this.samples != samples) {
        // ! box doesn't execute the following
        // this.samples = samples;
        // context.bindRenderbuffer(context.RENDERBUFFER, this.colorRenderBuffer);
        // context.renderbufferStorageMultisample(
        //   context.RENDERBUFFER,
        //   samples,
        //   context.RGBA8,
        //   this.opaqueFramebufferWidth,
        //   this.opaqueFramebufferHeight
        // );
        // context.bindRenderbuffer(context.RENDERBUFFER, this.depthRenderBuffer);
        // context.renderbufferStorageMultisample(
        //   context.RENDERBUFFER,
        //   samples,
        //   context.DEPTH_COMPONENT16,
        //   this.opaqueFramebufferWidth,
        //   this.opaqueFramebufferHeight
        // );
      }
    }
  }

  resize(width: any, height: any) {
    if (this.currentWidth !== width || this.currentHeight !== height) {
      this.currentHeight = height;
      this.currentWidth = width;
      // ! WebGPU: this.passEncoder.setViewport
      this.webGPU.context.viewport(0, 0, width, height);
    }
  }

  clearFrame(clearColor: any) {
    // this.webGPU.context.bindFramebuffer(this.webGPU.context.FRAMEBUFFER, null);
    // this.webGPU.context.clearColor(
    //   clearColor[0] / 255.0,
    //   clearColor[1] / 255.0,
    //   clearColor[2] / 255.0,
    //   clearColor[3] / 255.0
    // );
    // this.webGPU.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    // this.webGPU.context.bindFramebuffer(
    //   this.webGPU.context.FRAMEBUFFER,
    //   this.opaqueFramebuffer
    // );
    // this.webGPU.context.clearColor(
    //   clearColor[0] / 255.0,
    //   clearColor[1] / 255.0,
    //   clearColor[2] / 255.0,
    //   clearColor[3] / 255.0
    // );
    // this.webGPU.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    // this.webGPU.context.bindFramebuffer(this.webGPU.context.FRAMEBUFFER, null);
    // this.webGPU.context.bindFramebuffer(
    //   this.webGPU.context.FRAMEBUFFER,
    //   this.opaqueFramebufferMSAA
    // );
    // this.webGPU.context.clearColor(
    //   clearColor[0] / 255.0,
    //   clearColor[1] / 255.0,
    //   clearColor[2] / 255.0,
    //   clearColor[3] / 255.0
    // );
    // this.webGPU.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    // this.webGPU.context.bindFramebuffer(this.webGPU.context.FRAMEBUFFER, null);
  }

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

    // transparent drawables need sorting before they can be drawn
    // this.transparentDrawables = drawables.filter(
    //   ({ node, primitive }) =>
    //     state.gltf.materials[primitive.material].alphaMode === "BLEND" &&
    //     (state.gltf.materials[primitive.material].extensions === undefined ||
    //       state.gltf.materials[primitive.material].extensions
    //         .KHR_materials_transmission === undefined)
    // );

    // this.transmissionDrawables = drawables.filter(
    //   ({ node, primitive }) =>
    //     state.gltf.materials[primitive.material].extensions !== undefined &&
    //     state.gltf.materials[primitive.material].extensions
    //       .KHR_materials_transmission !== undefined
    // );
  }

  /**
   * render complete gltf scene with given camera
   * @param state
   * @param scene
   */
  drawScene(state: any, scene: any) {
    // prepare scene once
    if (this.preparedScene !== scene) {
      this.prepareScene(state, scene);
      this.preparedScene = scene;
    }

    let currentCamera = undefined;

    if (state.cameraIndex === undefined) {
      currentCamera = state.userCamera;
    } else {
      // currentCamera = state.gltf.cameras[state.cameraIndex].clone();
    }

    currentCamera.aspectRatio = this.currentWidth / this.currentHeight;

    this.projMatrix = currentCamera.getProjectionMatrix();
    this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
    this.currentCameraPosition = currentCamera.getPosition(state.gltf);

    this.visibleLights = this.getVisibleLights(state.gltf, scene);
    if (
      this.visibleLights.length === 0 &&
      !state.renderingParameters.useIBL &&
      state.renderingParameters.useDirectionalLightsWithDisabledIBL
    ) {
      // ! no visible light for box
      // this.visibleLights.push(this.lightKey);
      // this.visibleLights.push(this.lightFill);
    }

    mat4.multiply(this.viewProjectionMatrix, this.projMatrix, this.viewMatrix);

    // Update skins.
    // ! no skin for now
    // for (const node of this.nodes) {
    //   if (node.mesh !== undefined && node.skin !== undefined) {
    //     this.updateSkin(state, node);
    //   }
    // }

    // ! no transmissive drawables present in box
    // If any transmissive drawables are present, render all opaque and transparent drawables into a separate framebuffer.
    // if (this.transmissionDrawables.length > 0) {
    //   // Render transmission sample texture
    //   this.webGPU.context.bindFramebuffer(
    //     this.webGPU.context.FRAMEBUFFER,
    //     this.opaqueFramebufferMSAA
    //   );
    //   this.webGPU.context.viewport(
    //     0,
    //     0,
    //     this.opaqueFramebufferWidth,
    //     this.opaqueFramebufferHeight
    //   );

    //   // Render environment for the transmission background
    //   this.environmentRenderer.drawEnvironmentMap(
    //     this.webGPU,
    //     this.viewProjectionMatrix,
    //     state,
    //     this.shaderCache,
    //     ["LINEAR_OUTPUT 1"]
    //   );

    //   for (const drawable of this.opaqueDrawables) {
    //     var renderpassConfiguration = {};
    //     renderpassConfiguration.linearOutput = true;
    //     this.drawPrimitive(
    //       state,
    //       renderpassConfiguration,
    //       drawable.primitive,
    //       drawable.node,
    //       this.viewProjectionMatrix
    //     );
    //   }

    //   this.transparentDrawables = currentCamera.sortPrimitivesByDepth(
    //     state.gltf,
    //     this.transparentDrawables
    //   );
    //   for (const drawable of this.transparentDrawables) {
    //     var renderpassConfiguration = {};
    //     renderpassConfiguration.linearOutput = true;
    //     this.drawPrimitive(
    //       state,
    //       renderpassConfiguration,
    //       drawable.primitive,
    //       drawable.node,
    //       this.viewProjectionMatrix
    //     );
    //   }

    //   // "blit" the multisampled opaque texture into the color buffer, which adds antialiasing
    //   this.webGPU.context.bindFramebuffer(
    //     this.webGPU.context.READ_FRAMEBUFFER,
    //     this.opaqueFramebufferMSAA
    //   );
    //   this.webGPU.context.bindFramebuffer(
    //     this.webGPU.context.DRAW_FRAMEBUFFER,
    //     this.opaqueFramebuffer
    //   );
    //   this.webGPU.context.blitFramebuffer(
    //     0,
    //     0,
    //     this.opaqueFramebufferWidth,
    //     this.opaqueFramebufferHeight,
    //     0,
    //     0,
    //     this.opaqueFramebufferWidth,
    //     this.opaqueFramebufferHeight,
    //     this.webGPU.context.COLOR_BUFFER_BIT,
    //     this.webGPU.context.NEAREST
    //   );

    //   // Create Framebuffer Mipmaps
    //   this.webGPU.context.bindTexture(
    //     this.webGPU.context.TEXTURE_2D,
    //     this.opaqueRenderTexture
    //   );

    //   this.webGPU.context.generateMipmap(this.webGPU.context.TEXTURE_2D);
    // }

    // Render to canvas
    this.webGPU.context.bindFramebuffer(this.webGPU.context.FRAMEBUFFER, null);
    this.webGPU.context.viewport(0, 0, this.currentWidth, this.currentHeight);

    // Render environment
    // ! don't render environment for now
    // const fragDefines = [];
    // this.pushFragParameterDefines(fragDefines, state);
    // this.environmentRenderer.drawEnvironmentMap(
    //   this.webGPU,
    //   this.viewProjectionMatrix,
    //   state,
    //   this.shaderCache,
    //   fragDefines
    // );

    for (const drawable of this.opaqueDrawables) {
      var renderpassConfiguration: any = {};
      renderpassConfiguration.linearOutput = false;
      this.drawPrimitive(
        state,
        renderpassConfiguration,
        drawable.primitive,
        drawable.node,
        this.viewProjectionMatrix
      );
    }

    // filter materials with transmission extension
    // ! no transmissionDrawables for box
    // this.transmissionDrawables = currentCamera.sortPrimitivesByDepth(
    //   state.gltf,
    //   this.transmissionDrawables
    // );
    // for (const drawable of this.transmissionDrawables) {
    //   var renderpassConfiguration = {};
    //   renderpassConfiguration.linearOutput = false;
    //   this.drawPrimitive(
    //     state,
    //     renderpassConfiguration,
    //     drawable.primitive,
    //     drawable.node,
    //     this.viewProjectionMatrix,
    //     this.opaqueRenderTexture
    //   );
    // }
    // ! no transparent for box
    // for (const drawable of this.transparentDrawables) {
    //   var renderpassConfiguration = {};
    //   renderpassConfiguration.linearOutput = false;
    //   this.drawPrimitive(
    //     state,
    //     renderpassConfiguration,
    //     drawable.primitive,
    //     drawable.node,
    //     this.viewProjectionMatrix
    //   );
    // }
  }

  drawPrimitive(
    state: any,
    renderpassConfiguration: any,
    primitive: any,
    node: any,
    viewProjectionMatrix: any,
    transmissionSampleTexture: any = undefined
  ) {
    if (primitive.skip) return;

    let material;
    if (primitive.mappings !== undefined && state.variant != "default") {
      // ! box skips this
      // const names = state.gltf.variants.map((obj) => obj.name);
      // const idx = names.indexOf(state.variant);
      // let materialIdx = primitive.material;
      // primitive.mappings.forEach((element) => {
      //   if (element.variants.indexOf(idx) >= 0) {
      //     materialIdx = element.material;
      //   }
      // });
      // material = state.gltf.materials[materialIdx];
    } else {
      material = state.gltf.materials[primitive.material];
    }

    //select shader permutation, compile and link program.

    let vertDefines: any = [];
    // ! pushVertParameterDefines doesn't do anything for box
    // this.pushVertParameterDefines(
    //   vertDefines,
    //   state.renderingParameters,
    //   state.gltf,
    //   node,
    //   primitive
    // );
    vertDefines = primitive.getDefines().concat(vertDefines);
    // ! for box: 'HAS_NORMAL_VEC3 1', 'HAS_POSITION_VEC3 1' are defined

    let fragDefines = material
      .getDefines(state.renderingParameters)
      .concat(vertDefines);
    // ! doesn't get executed for box
    // if (renderpassConfiguration.linearOutput === true) {
    //   fragDefines.push("LINEAR_OUTPUT 1");
    // }
    this.pushFragParameterDefines(fragDefines, state);
    // ! for box:
    /*
    "ALPHAMODE_OPAQUE 0"
"ALPHAMODE_MASK 1"
"ALPHAMODE_BLEND 2"
 "ALPHAMODE ALPHAMODE_OPAQUE"
 "MATERIAL_METALLICROUGHNESS 1"
 "HAS_NORMAL_VEC3 1"
 "HAS_POSITION_VEC3 1"
 "USE_PUNCTUAL 1"
 "LIGHT_COUNT 0"
*/

    // ! for box: using primitive.vert and pbr.frag
    const fragmentHash = this.shaderCache.selectShader(
      material.getShaderIdentifier(),
      fragDefines
    );
    const vertexHash = this.shaderCache.selectShader(
      primitive.getShaderIdentifier(),
      vertDefines
    );

    if (fragmentHash && vertexHash) {
      this.shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
    }

    if (this.shader === undefined) {
      return;
    }

    this.webGPU.context.useProgram(this.shader.program);

    // ! no lights for now
    // if (state.renderingParameters.usePunctual) {
    //   this.applyLights(state.gltf);
    // }

    // update model dependant matrices once per node (transform matrices have already been calculated)
    this.shader.updateUniform("u_ViewProjectionMatrix", viewProjectionMatrix);
    this.shader.updateUniform("u_ModelMatrix", node.worldTransform);
    this.shader.updateUniform("u_NormalMatrix", node.normalMatrix, false);
    this.shader.updateUniform(
      "u_Exposure",
      state.renderingParameters.exposure,
      false
    );
    this.shader.updateUniform("u_Camera", this.currentCameraPosition, false);

    // ! no animation for now
    // this.updateAnimationUniforms(state, node, primitive);

    // ! specifies whether polygons are front- or back-facing by setting a winding orientation
    if (mat4.determinant(node.worldTransform) < 0.0) {
      // this.webGPU.context.frontFace(GL.CW); // ! figure out what GL should be
    } else {
      // this.webGPU.context.frontFace(GL.CCW); // ! figure out what GL should be
    }

    // ! enable or disable culling of polygons
    if (material.doubleSided) {
      // this.webGPU.context.disable(GL.CULL_FACE); // ! figure out what GL should be
    } else {
      // this.webGPU.context.enable(GL.CULL_FACE); // ! figure out what GL should be
    }

    if (material.alphaMode === "BLEND") {
      // ! no alpha mode for box
      // this.webGPU.context.enable(GL.BLEND);
      // this.webGPU.context.blendFuncSeparate(
      //   GL.SRC_ALPHA,
      //   GL.ONE_MINUS_SRC_ALPHA,
      //   GL.ONE,
      //   GL.ONE_MINUS_SRC_ALPHA
      // );
      // this.webGPU.context.blendEquation(GL.FUNC_ADD);
    } else {
      // this.webGPU.context.disable(GL.BLEND); // ! figure out what GL should be
    }

    const drawIndexed = primitive.indices !== undefined;
    if (drawIndexed) {
      if (!this.webGPU.setIndices(state.gltf, primitive.indices)) {
        return;
      }
    }

    let vertexCount = 0;
    for (const attribute of primitive.glAttributes) {
      const gltfAccessor = state.gltf.accessors[attribute.accessor];
      vertexCount = gltfAccessor.count;

      const location = this.shader.getAttributeLocation(attribute.name);
      if (location < 0) {
        continue; // only skip this attribute
      }
      if (!this.webGPU.enableAttribute(state.gltf, location, gltfAccessor)) {
        return; // skip this primitive
      }
    }

    for (let [uniform, val] of material.getProperties().entries()) {
      this.shader.updateUniform(uniform, val, false);
    }

    let textureIndex = 0;
    for (; textureIndex < material.textures.length; ++textureIndex) {
      // ! no texture in box
      // let info = material.textures[textureIndex];
      // const location = this.shader.getUniformLocation(info.samplerName);
      // if (location < 0) {
      //   console.log("Unable to find uniform location of " + info.samplerName);
      //   continue; // only skip this texture
      // }
      // if (!this.webGPU.setTexture(location, state.gltf, info, textureIndex)) {
      //   // binds texture and sampler
      //   return; // skip this material
      // }
    }

    // set the morph target texture
    // ! no morph target texture for now
    // if (primitive.morphTargetTextureInfo !== undefined) {
    //   const location = this.shader.getUniformLocation(
    //     primitive.morphTargetTextureInfo.samplerName
    //   );
    //   if (location < 0) {
    //     console.log(
    //       "Unable to find uniform location of " +
    //         primitive.morphTargetTextureInfo.samplerName
    //     );
    //   }

    //   this.webGPU.setTexture(
    //     location,
    //     state.gltf,
    //     primitive.morphTargetTextureInfo,
    //     textureIndex
    //   ); // binds texture and sampler
    //   textureIndex++;
    // }

    // set the joints texture
    // ! no joints texture for now
    // if (
    //   state.renderingParameters.skinning &&
    //   node.skin !== undefined &&
    //   primitive.hasWeights &&
    //   primitive.hasJoints
    // ) {
    //   const skin = state.gltf.skins[node.skin];
    //   const location = this.shader.getUniformLocation(
    //     skin.jointTextureInfo.samplerName
    //   );
    //   if (location < 0) {
    //     console.log(
    //       "Unable to find uniform location of " +
    //         skin.jointTextureInfo.samplerName
    //     );
    //   }

    //   this.webGPU.setTexture(
    //     location,
    //     state.gltf,
    //     skin.jointTextureInfo,
    //     textureIndex
    //   ); // binds texture and sampler
    //   textureIndex++;
    // }

    let textureCount = textureIndex;
    if (state.renderingParameters.useIBL && state.environment !== undefined) {
      // ! no environment map for now
      // textureCount = this.applyEnvironmentMap(state, textureCount);
    }

    // if (
    //   state.renderingParameters.usePunctual &&
    //   state.environment !== undefined
    // ) {
    //   this.webGPU.setTexture(
    //     this.shader.getUniformLocation("u_SheenELUT"),
    //     state.environment,
    //     state.environment.sheenELUT,
    //     textureCount++
    //   );
    // }

    // if (
    //   transmissionSampleTexture !== undefined &&
    //   (state.renderingParameters.useIBL ||
    //     state.renderingParameters.usePunctual) &&
    //   state.environment &&
    //   state.renderingParameters.enabledExtensions.KHR_materials_transmission
    // ) {
    //   this.webGPU.context.activeTexture(GL.TEXTURE0 + textureCount);
    //   this.webGPU.context.bindTexture(
    //     this.webGPU.context.TEXTURE_2D,
    //     this.opaqueRenderTexture
    //   );
    //   this.webGPU.context.uniform1i(
    //     this.shader.getUniformLocation("u_TransmissionFramebufferSampler"),
    //     textureCount
    //   );
    //   textureCount++;

    //   this.webGPU.context.uniform2i(
    //     this.shader.getUniformLocation("u_TransmissionFramebufferSize"),
    //     this.opaqueFramebufferWidth,
    //     this.opaqueFramebufferHeight
    //   );

    //   this.webGPU.context.uniformMatrix4fv(
    //     this.shader.getUniformLocation("u_ModelMatrix"),
    //     false,
    //     node.worldTransform
    //   );
    //   this.webGPU.context.uniformMatrix4fv(
    //     this.shader.getUniformLocation("u_ViewMatrix"),
    //     false,
    //     this.viewMatrix
    //   );
    //   this.webGPU.context.uniformMatrix4fv(
    //     this.shader.getUniformLocation("u_ProjectionMatrix"),
    //     false,
    //     this.projMatrix
    //   );
    // }

    if (drawIndexed) {
      const indexAccessor = state.gltf.accessors[primitive.indices];
      // ! this needs to be changed to WebGPU format (drawindexed)
      this.webGPU.context.drawElements(
        primitive.mode,
        indexAccessor.count,
        indexAccessor.componentType,
        0
      );
    } else {
      // ! doesn't support draw arrays for now
      // this.webGPU.context.drawArrays(primitive.mode, 0, vertexCount);
    }

    for (const attribute of primitive.glAttributes) {
      const location = this.shader.getAttributeLocation(attribute.name);
      if (location < 0) {
        continue; // skip this attribute
      }
      this.webGPU.context.disableVertexAttribArray(location);
    }
  }

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
