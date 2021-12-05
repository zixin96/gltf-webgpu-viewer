import { mat4, vec3 } from "gl-matrix";
import { FOVY, NEAR_PLANE, FAR_PLANE } from "./constants";
const createCamera = require("3d-view-controls");
const simpleVertShader = require("raw-loader!glslify-loader!./shaders/simple.vert");
const simpleFragShader = require("raw-loader!glslify-loader!./shaders/simple.frag");

class gltfWebGPU {
  public static CameraPosition: vec3 = [2, 2, 4];
  public static LookDirection: vec3 = [0, 0, 0];
  public static UpDirection: vec3 = [0, 1, 0];
  camera!: any;
  vMatrix!: any;
  pMatrix!: any;
  vpMatrix!: any;
  eyePosition!: any;
  lightPosition!: any;

  vertexUniformBuffer!: any;

  modelMatrix!: any;
  rotation!: any;
  normalMatrix!: any;

  canvas!: HTMLCanvasElement;

  // ⚙️ API Data Structures
  device!: GPUDevice;
  queue!: GPUQueue;

  // 🎞️ Frame Backings
  context!: GPUCanvasContext;
  colorTexture!: GPUTexture;
  colorTextureView!: GPUTextureView;
  depthTexture!: GPUTexture;
  depthTextureView!: GPUTextureView;

  // 🔺 Resources
  positionBuffer!: GPUBuffer;
  normalBuffer!: GPUBuffer;
  indexBuffer!: GPUBuffer;
  vertModule!: GPUShaderModule;
  fragModule!: GPUShaderModule;
  pipeline!: GPURenderPipeline;
  sceneUniformBindGroup!: GPUBindGroup;
  indexCount!: number;

  commandEncoder!: GPUCommandEncoder;
  passEncoder!: GPURenderPassEncoder;

  // 🔮 support for glsl #version 450 and glsl es #version 310 and up
  glslang: any;

  constructor(canvas: HTMLCanvasElement, device: GPUDevice, glslang: any) {
    this.canvas = canvas;
    this.device = device;
    this.queue = this.device.queue;
    this.glslang = glslang;
    // ⛓️ Swapchain
    if (!this.context) {
      this.context = this.canvas.getContext(
        "webgpu"
      ) as unknown as GPUCanvasContext; // cast to unknown to avoid webpack error
      const canvasConfig: GPUCanvasConfiguration = {
        device: this.device,
        format: "bgra8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      };
      this.context.configure(canvasConfig);
    }

    const depthTextureDesc: GPUTextureDescriptor = {
      size: [this.canvas.width, this.canvas.height, 1],
      dimension: "2d",
      format: "depth24plus-stencil8",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    };

    this.depthTexture = this.device.createTexture(depthTextureDesc);
    this.depthTextureView = this.depthTexture.createView();
  }

  createWebGPUBuffer(arr: Float32Array | Uint16Array, usage: number) {
    // 📏 Align to 4 bytes
    let desc = {
      size: (arr.byteLength + 3) & ~3,
      usage,
      mappedAtCreation: true,
    };
    let buffer = this.device.createBuffer(desc);
    const writeArray =
      arr instanceof Uint16Array
        ? new Uint16Array(buffer.getMappedRange())
        : new Float32Array(buffer.getMappedRange());
    writeArray.set(arr);
    buffer.unmap();
    return buffer;
  }

  /**
   * Create Indices Buffer
   * @param gltf
   * @param accessorIndex
   * @returns
   */
  setIndices(gltf: any, accessorIndex: any) {
    let gltfAccessor = gltf.accessors[accessorIndex];

    if (gltfAccessor.glBuffer === undefined) {
      let data = gltfAccessor.getTypedView(gltf);
      if (data === undefined) {
        return false;
      }
      // console.log("indices:", data);
      gltfAccessor.glBuffer = this.createWebGPUBuffer(
        data,
        GPUBufferUsage.INDEX
      );
      this.indexBuffer = gltfAccessor.glBuffer;
      this.indexCount = gltfAccessor.count;
    } else {
      // do nothing
    }

    return true;
  }

  setVerticesAttrib(gltf: any, attribute: any) {
    const gltfAccessor = gltf.accessors[attribute.accessor];

    if (gltfAccessor.glBuffer === undefined) {
      let data = gltfAccessor.getTypedView(gltf);
      if (data === undefined) {
        return false;
      }
      gltfAccessor.glBuffer = this.createWebGPUBuffer(
        data,
        GPUBufferUsage.VERTEX
      );
      if (attribute.attribute === "NORMAL") {
        this.normalBuffer = gltfAccessor.glBuffer;
      }
      if (attribute.attribute === "POSITION") {
        this.positionBuffer = gltfAccessor.glBuffer;
      }
    } else {
      // do nothing
    }
    return true;
  }

  createVertexShaderModule() {
    const shaderModuleDesc = {
      code: this.glslang.compileGLSL(simpleVertShader.default, "vertex"),
    };
    this.vertModule = this.device.createShaderModule(shaderModuleDesc);
  }

  createFragmentShaderModule() {
    const shaderModuleDesc = {
      code: this.glslang.compileGLSL(simpleFragShader.default, "fragment"),
    };
    this.fragModule = this.device.createShaderModule(shaderModuleDesc);
  }

  public static CreateViewProjection(
    isPerspective: boolean,
    aspectRatio: number
  ) {
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    if (isPerspective) {
      mat4.perspective(
        projectionMatrix,
        FOVY,
        aspectRatio,
        NEAR_PLANE,
        FAR_PLANE
      );
    } else {
      mat4.ortho(projectionMatrix, -4, 4, -3, 3, -1, 6);
    }

    mat4.lookAt(
      viewMatrix,
      this.CameraPosition,
      this.LookDirection,
      this.UpDirection
    );
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const cameraOption = {
      eye: this.CameraPosition,
      center: this.LookDirection,
      zoomMax: 100,
      zoomSpeed: 2,
    };

    return {
      viewMatrix,
      projectionMatrix,
      viewProjectionMatrix,
      cameraOption,
    };
  }

  createPipeline(
    cameraOption: any,
    vMatrix: any,
    pMatrix: any,
    vpMatrix: any,
    modelMatrix: any,
    normalMatrix: any
  ) {
    //uniform data
    this.normalMatrix = normalMatrix;
    this.modelMatrix = modelMatrix;
    this.rotation = vec3.fromValues(0, 0, 0);

    this.vMatrix = vMatrix;
    this.pMatrix = pMatrix;
    this.vpMatrix = vpMatrix;

    this.camera = createCamera(this.canvas, cameraOption);

    this.eyePosition = new Float32Array(cameraOption.eye);
    this.lightPosition = this.eyePosition;

    // ⚗️ Graphics Pipeline

    // 🔣 Input Assembly
    const positionAttribDesc: GPUVertexAttribute = {
      shaderLocation: 0, // [[location(0)]]
      offset: 0,
      format: "float32x3",
    };
    const normalAttribDesc: GPUVertexAttribute = {
      shaderLocation: 1, // [[location(1)]]
      offset: 0,
      format: "float32x3",
    };
    const positionBufferDesc: GPUVertexBufferLayout = {
      attributes: [positionAttribDesc],
      arrayStride: 4 * 3, // sizeof(float) * 3
      stepMode: "vertex",
    };
    const normalBufferDesc: GPUVertexBufferLayout = {
      attributes: [normalAttribDesc],
      arrayStride: 4 * 3, // sizeof(float) * 3
      stepMode: "vertex",
    };

    // 🌑 Depth
    const depthStencil: GPUDepthStencilState = {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    };

    // 🎭 Shader Stages
    const vertex: GPUVertexState = {
      module: this.vertModule,
      entryPoint: "main",
      buffers: [positionBufferDesc, normalBufferDesc],
    };

    // 🌀 Color/Blend State
    const colorState: GPUColorTargetState = {
      format: "bgra8unorm",
    };

    const fragment: GPUFragmentState = {
      module: this.fragModule,
      entryPoint: "main",
      targets: [colorState],
    };

    // 🟨 Rasterization
    const primitive: GPUPrimitiveState = {
      frontFace: "cw",
      cullMode: "none",
      topology: "triangle-list",
    };

    const pipelineDesc: GPURenderPipelineDescriptor = {
      vertex,
      fragment,
      primitive,
      depthStencil,
    };
    this.pipeline = this.device.createRenderPipeline(pipelineDesc);

    // 🦄 Uniform Data
    const VERTEX_UNIFORM_BUFFER_SIZE = 192; // 3 4x4 float matrices: 3 x 4 x 4 x 4 = 192
    this.vertexUniformBuffer = this.device.createBuffer({
      size: VERTEX_UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // N/A
    // const fragmentUniformBuffer = this.device.createBuffer({
    //   size: 32,
    //   usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    // });

    this.sceneUniformBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.vertexUniformBuffer,
            offset: 0,
            size: VERTEX_UNIFORM_BUFFER_SIZE,
          },
        },
      ],
    });
  }

  // ✍️ Write commands to send to the GPU
  encodeCommands() {
    let colorAttachment: GPURenderPassColorAttachment = {
      view: this.colorTextureView,
      loadValue: [0.0, 0.0, 0.0, 1],
      storeOp: "store",
    };

    const depthAttachment: GPURenderPassDepthStencilAttachment = {
      view: this.depthTextureView,
      depthLoadValue: 1,
      depthStoreOp: "store",
      stencilLoadValue: "load",
      stencilStoreOp: "store",
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthAttachment,
    };

    this.commandEncoder = this.device.createCommandEncoder();

    // 🖌️ Encode drawing commands
    this.passEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
    this.passEncoder.setPipeline(this.pipeline);
    this.passEncoder.setViewport(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      0,
      1
    );
    this.passEncoder.setScissorRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.passEncoder.setVertexBuffer(0, this.positionBuffer);
    this.passEncoder.setVertexBuffer(1, this.normalBuffer);
    this.passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    console.log(this.indexCount);
    this.passEncoder.drawIndexed(this.indexCount, 1);
    this.passEncoder.endPass();

    this.queue.submit([this.commandEncoder.finish()]);
  }

  renderUsingWebGPU() {
    // ⏭ Acquire next image from context
    this.colorTexture = this.context.getCurrentTexture();
    this.colorTextureView = this.colorTexture.createView();

    // 📦 Write and submit commands to queue
    this.encodeCommands();
  }

  public static CreateTransforms(
    modelMat: mat4,
    translation: vec3,
    rotation: vec3,
    scaling: vec3
  ) {
    const rotateXMat = mat4.create();
    const rotateYMat = mat4.create();
    const rotateZMat = mat4.create();
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    // if rotation, translation or scaling is falsy, default values will be set
    rotation = rotation || [0, 0, 0];
    translation = translation || [0, 0, 0];
    scaling = scaling || [1, 1, 1];

    //perform individual transformations
    mat4.fromTranslation(translateMat, translation);
    mat4.fromXRotation(rotateXMat, rotation[0]);
    mat4.fromYRotation(rotateYMat, rotation[1]);
    mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    //combine all transformation matrices together to form a final transform matrix: modelMat
    // T * R * S
    mat4.multiply(modelMat, rotateXMat, scaleMat);
    mat4.multiply(modelMat, rotateYMat, modelMat);
    mat4.multiply(modelMat, rotateZMat, modelMat);
    mat4.multiply(modelMat, translateMat, modelMat);
  }

  draw() {
    if (this.camera.tick()) {
      const pMatrix = this.pMatrix;
      this.vMatrix = this.camera.matrix;
      mat4.multiply(this.vpMatrix, pMatrix, this.vMatrix);

      this.eyePosition = new Float32Array(this.camera.eye.flat());
      this.lightPosition = this.eyePosition;
      this.device.queue.writeBuffer(
        this.vertexUniformBuffer,
        0,
        this.vpMatrix as ArrayBuffer
      );
    }

    gltfWebGPU.CreateTransforms(
      this.modelMatrix,
      [0, 0, 0],
      this.rotation as vec3,
      [1, 1, 1]
    );
    mat4.invert(this.normalMatrix, this.modelMatrix);
    mat4.transpose(this.normalMatrix, this.normalMatrix);
    this.device.queue.writeBuffer(
      this.vertexUniformBuffer,
      64,
      this.modelMatrix as ArrayBuffer
    );
    this.device.queue.writeBuffer(
      this.vertexUniformBuffer,
      128,
      this.normalMatrix as ArrayBuffer
    );

    // ⏭ Acquire next image from context
    this.colorTexture = this.context.getCurrentTexture();
    this.colorTextureView = this.colorTexture.createView();

    let colorAttachment: GPURenderPassColorAttachment = {
      view: this.colorTextureView,
      loadValue: [0.0, 0.0, 0.0, 1],
      storeOp: "store",
    };

    const depthAttachment: GPURenderPassDepthStencilAttachment = {
      view: this.depthTextureView,
      depthLoadValue: 1,
      depthStoreOp: "store",
      stencilLoadValue: "load",
      stencilStoreOp: "store",
    };

    const renderPassDesc: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthAttachment,
    };

    this.commandEncoder = this.device.createCommandEncoder();

    // 🖌️ Encode drawing commands
    this.passEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
    this.passEncoder.setPipeline(this.pipeline);

    this.passEncoder.setVertexBuffer(0, this.positionBuffer);
    this.passEncoder.setVertexBuffer(1, this.normalBuffer);
    this.passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
    this.passEncoder.setBindGroup(0, this.sceneUniformBindGroup);
    this.passEncoder.drawIndexed(this.indexCount, 1);
    this.passEncoder.endPass();
    this.device.queue.submit([this.commandEncoder.finish()]);
  }
}

export { gltfWebGPU };

/*
      [[block]] struct Uniforms {
        u_ViewProjectionMatrix : mat4x4<f32>;
        u_ModelMatrix : mat4x4<f32>;               
        u_NormalMatrix : mat4x4<f32>;                
    };
    [[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
    
    struct Input {
        [[location(0)]] a_position : vec4<f32>;
        [[location(1)]] a_normal : vec4<f32>;
    };
    
    struct Output {
        [[builtin(position)]] Position : vec4<f32>;
        [[location(0)]] v_Position : vec4<f32>;
        [[location(1)]] v_Normal : vec4<f32>;
    };

    [[stage(vertex)]]
    fn main(input: Input) -> Output {                
        var output: Output;
        let mPosition:vec4<f32> = uniforms.u_ModelMatrix * input.a_position; 
        output.v_Position = mPosition;                  
        output.v_Normal =  uniforms.u_NormalMatrix * input.a_normal;
        output.Position = uniforms.u_ViewProjectionMatrix * mPosition;            
        return output;
    }*/
