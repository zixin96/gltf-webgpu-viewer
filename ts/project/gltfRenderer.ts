import { gltfWebGPU } from "./gltfWebGPU";
import { mat4, vec3, quat } from "gl-matrix";
import { gltfLight } from "./gltf/gltfLight";

class gltfRenderer {
  webGPU: any;

  visibleLights: any;

  viewMatrix: any;
  projMatrix: any;
  viewProjectionMatrix: any;

  currentCameraPosition: any;

  lightKey: any;
  lightFill: any;

  colorRenderBuffer: any;
  depthRenderBuffer: any;

  nodes: any;
  opaqueDrawables: any;

  preparedScene: any;

  constructor(canvas: HTMLCanvasElement, device: GPUDevice, glslang: any) {
    // initialize gltfRenderer with a new gltfWebGPU, passing in HTMLCanvasElement, GPUDevice, and Glslang
    this.webGPU = new gltfWebGPU(canvas, device, glslang);

    // no visible lights
    this.visibleLights = [];

    // initialize MVP matrix
    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.viewProjectionMatrix = mat4.create();

    // initialize currentCameraPosition
    this.currentCameraPosition = vec3.create();

    // lightKey and lightFill are two lights that always exist
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
    this.prepareScene(state, scene); // prepare this.opaqueDrawables

    let currentCamera = state.userCamera;
    currentCamera.aspectRatio = 1;

    this.projMatrix = currentCamera.getProjectionMatrix();
    this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
    this.currentCameraPosition = currentCamera.getPosition(state.gltf);

    mat4.multiply(this.viewProjectionMatrix, this.projMatrix, this.viewMatrix);

    // used in 3d-view-control
    const cameraOption = {
      eye: this.currentCameraPosition,
      center: currentCamera.getLookDirection(),
      zoomMax: 1000,
      zoomSpeed: 2,
    };

    // 💡 lights
    this.visibleLights.push(this.lightKey);
    this.visibleLights.push(this.lightFill);

    if (state.renderingParameters.usePunctual) {
      this.applyLights(state.gltf);
    }

    let modelMatrix;
    let normalMatrix;

    for (const drawable of this.opaqueDrawables) {
      const primitive = drawable.primitive;
      const node = drawable.node;
      const material = state.gltf.materials[primitive.material];
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

      // Get shaders's #define
      let vertDefines: string[] = [];
      this.pushVertParameterDefines(
        vertDefines,
        state.renderingParameters,
        state.gltf,
        node,
        primitive
      );
      vertDefines = primitive.getDefines().concat(vertDefines);

      let fragDefines: string[] = material
        .getDefines(state.renderingParameters)
        .concat(vertDefines);
      this.pushFragParameterDefines(fragDefines, state);
      this.webGPU.createVertexShaderModule(vertDefines);
      this.webGPU.createFragmentShaderModule(fragDefines);
      // 🖍️ Shaders
      this.webGPU.createPipeline(
        cameraOption,
        this.viewMatrix,
        this.projMatrix,
        this.viewProjectionMatrix,
        modelMatrix,
        normalMatrix,
        material,
        fragDefines
      );
    }
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
  }

  //////////////////////////////////////
  // Helper functions
  //////////////////////////////////////

  pushVertParameterDefines(
    vertDefines: any,
    parameters: any,
    gltf: any,
    node: any,
    primitive: any
  ) {
    // empty for now
  }

  pushFragParameterDefines(fragDefines: any, state: any) {
    if (state.renderingParameters.usePunctual) {
      fragDefines.push("USE_PUNCTUAL 1");
      fragDefines.push("LIGHT_COUNT " + this.visibleLights.length);
    }

    if (state.renderingParameters.useIBL && state.environment) {
      fragDefines.push("USE_IBL 1");
    }
  }

  applyLights(gltf: any) {
    let uniformLights = [];
    for (let light of this.visibleLights) {
      uniformLights.push(light.toUniform(gltf));
    }
    if (uniformLights.length > 0) {
      this.webGPU.updateLightUniform("u_Lights", uniformLights);
    }
  }
}
export { gltfRenderer };
