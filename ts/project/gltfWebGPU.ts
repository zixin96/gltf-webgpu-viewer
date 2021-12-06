import { mat4, vec3 } from "gl-matrix";
import { gltfMaterial } from "./gltf/gltfMaterial";

const createCamera = require("3d-view-controls");
// PBR shaders
const pbrShader = require("raw-loader!glslify-loader!./shaders/pbr.frag");
const brdfShader = require("raw-loader!glslify-loader!./shaders/brdf.glsl");
const materialInfoShader = require("raw-loader!glslify-loader!./shaders/material_info.glsl");
const punctualShader = require("raw-loader!glslify-loader!./shaders/punctual.glsl");
const primitiveShader = require("raw-loader!glslify-loader!./shaders/primitive.vert");
const shaderFunctions = require("raw-loader!glslify-loader!./shaders/functions.glsl");
const texturesShader = require("raw-loader!glslify-loader!./shaders/textures.glsl");
const tonemappingShader = require("raw-loader!glslify-loader!./shaders/tonemapping.glsl");

const uniformBindingNumMap = new Map();
uniformBindingNumMap.set("u_Lights", 1);
uniformBindingNumMap.set("u_MetallicFactor", 2);
uniformBindingNumMap.set("u_RoughnessFactor", 2);
uniformBindingNumMap.set("u_BaseColorFactor", 2);
uniformBindingNumMap.set("u_EmissiveFactor", 27);

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
  shaderSources!: any;

  commandEncoder!: GPUCommandEncoder;
  passEncoder!: GPURenderPassEncoder;

  // 🔮 support for glsl #version 450 and glsl es #version 310 and up
  glslang: any;

  normalBufferDesc!: GPUVertexBufferLayout;
  positionBufferDesc!: GPUVertexBufferLayout;

  lightGroupEntry!: GPUBindGroupEntry;

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

    this.createShaders();
  }

  createShaders() {
    this.shaderSources = new Map();
    this.shaderSources.set("primitive.vert", primitiveShader.default);
    this.shaderSources.set("pbr.frag", pbrShader.default);
    this.shaderSources.set("material_info.glsl", materialInfoShader.default);
    this.shaderSources.set("brdf.glsl", brdfShader.default);
    this.shaderSources.set("punctual.glsl", punctualShader.default);
    this.shaderSources.set("functions.glsl", shaderFunctions.default);
    this.shaderSources.set("textures.glsl", texturesShader.default);
    this.shaderSources.set("tonemapping.glsl", tonemappingShader.default);
    this.updateShadersWithIncludes();
  }

  updateShadersWithIncludes() {
    // resovle / expande sources
    for (let [key, src] of this.shaderSources) {
      let changed = false;
      for (let [includeName, includeSource] of this.shaderSources) {
        const pattern = "#include <" + includeName + ">";

        if (src.includes(pattern)) {
          // only replace the first occurance
          src = src.replace(pattern, includeSource);

          // remove the others
          while (src.includes(pattern)) {
            src = src.replace(pattern, "");
          }

          changed = true;
        }
      }

      if (changed) {
        this.shaderSources.set(key, src);
      }
    }
  }

  updateShadersWithDefines(shaderIdentifier: any, permutationDefines: any) {
    const src = this.shaderSources.get(shaderIdentifier);
    if (src === undefined) {
      console.log("Shader source for " + shaderIdentifier + " not found");
      return null;
    }
    let defines = "#version 310 es\n";
    for (let define of permutationDefines) {
      defines += "#define " + define + "\n";
    }

    this.shaderSources.set(shaderIdentifier, defines + src);
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
    let gltfBufferView = gltf.bufferViews[gltfAccessor.bufferView];

    if (gltfAccessor.glBuffer === undefined) {
      let data = gltfAccessor.getTypedView(gltf);
      if (data === undefined) {
        return false;
      }
      gltfAccessor.glBuffer = this.createWebGPUBuffer(
        data,
        GPUBufferUsage.VERTEX
      );

      const format = `float32x3` as GPUVertexFormat;

      if (attribute.attribute === "NORMAL") {
        this.normalBuffer = gltfAccessor.glBuffer;
        const normalAttribDesc: GPUVertexAttribute = {
          shaderLocation: 1, // assume normal is always at [[location(1)]]
          offset: 0, // ? Should it be always 0?
          format: format,
        };

        this.normalBufferDesc = {
          attributes: [normalAttribDesc],
          arrayStride: gltfBufferView.byteStride,
          stepMode: "vertex",
        };
      }

      if (attribute.attribute === "POSITION") {
        this.positionBuffer = gltfAccessor.glBuffer;
        const positionAttribDesc: GPUVertexAttribute = {
          shaderLocation: 0, // assume position is always at [[location(0)]]
          offset: 0, // ? Should it be always 0?
          format: format,
        };
        this.positionBufferDesc = {
          attributes: [positionAttribDesc],
          arrayStride: gltfBufferView.byteStride,
          stepMode: "vertex",
        };
      }
    } else {
      // do nothing
    }
    return true;
  }

  createVertexShaderModule(defines: any) {
    this.updateShadersWithDefines("primitive.vert", defines);
    const shaderModuleDesc = {
      code: this.glslang.compileGLSL(
        this.shaderSources.get("primitive.vert"),
        "vertex"
      ),
    };
    this.vertModule = this.device.createShaderModule(shaderModuleDesc);
  }

  createFragmentShaderModule(defines: any) {
    this.updateShadersWithDefines("pbr.frag", defines);
    const shaderModuleDesc = {
      code: this.glslang.compileGLSL(
        this.shaderSources.get("pbr.frag"),
        "fragment"
      ),
    };
    this.fragModule = this.device.createShaderModule(shaderModuleDesc);
  }

  updateLightUniform(objectName: string, object: any) {
    const bindingNum = uniformBindingNumMap.get(objectName);
    console.log(object);
    let lightArray = new Array();
    for (let light of object) {
      lightArray.push(...light.direction);
      lightArray.push(light.range);
      lightArray.push(...light.color);
      lightArray.push(light.intensity);
      lightArray.push(...light.position);
      lightArray.push(light.innerConeCos);
      lightArray.push(light.outerConeCos);
      lightArray.push(light.type);
      lightArray.push(0); // paddings
      lightArray.push(0); // paddings
    }
    let lightUniformData = Float32Array.from(lightArray);
    //console.log(lightUniformData);
    this.lightGroupEntry = {
      binding: bindingNum,
      resource: {
        buffer: this.createWebGPUBuffer(
          lightUniformData,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        ),
      },
    };
  }

  createPipeline(
    cameraOption: any,
    vMatrix: any,
    pMatrix: any,
    vpMatrix: any,
    modelMatrix: any,
    normalMatrix: any,
    material: gltfMaterial,
    fragDefines: any
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
      buffers: [this.positionBufferDesc, this.normalBufferDesc],
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
    let emissive!: GPUBindGroupEntry;
    let materialGroupEntry!: GPUBindGroupEntry;
    let materialArray = new Array();
    let materialBindingNum!: number;
    for (let [uniform, val] of material.getProperties().entries()) {
      const bindingNum = uniformBindingNumMap.get(uniform);
      if (uniform === "u_EmissiveFactor") {
        emissive = {
          binding: bindingNum,
          resource: {
            buffer: this.createWebGPUBuffer(
              val,
              GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            ),
          },
        };
      } else {
        materialBindingNum = uniformBindingNumMap.get(uniform);
        if (val instanceof Float32Array) {
          materialArray.push(...val);
        } else {
          materialArray.push(val);
        }
      }
    }
    const materialUniformData = Float32Array.from(materialArray);

    // uniforms that are not changed per frame can be created using this fashion, and push it to the sceneUniformBindGroup
    materialGroupEntry = {
      binding: materialBindingNum,
      resource: {
        buffer: this.createWebGPUBuffer(
          materialUniformData,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        ),
      },
    };

    // uniforms that are changed per frame can be created using this fashion, only created with size, but
    // did not contain any data, until we use writeBuffer in draw() call
    this.vertexUniformBuffer = this.device.createBuffer({
      size: 192,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const sceneBindGroupDesc = {
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.vertexUniformBuffer,
          },
        },
        emissive,
        materialGroupEntry,
      ],
    };

    if (fragDefines.includes("USE_PUNCTUAL 1")) {
      sceneBindGroupDesc.entries.push(this.lightGroupEntry);
    }

    this.sceneUniformBindGroup =
      this.device.createBindGroup(sceneBindGroupDesc);
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
