import {
  Texture,
  WebIO,
  TextureInfo,
  Mesh,
  Accessor,
} from "@gltf-transform/core";
import { mat4, vec3, vec4 } from "gl-matrix";
import { Transforms as T3D } from "./transforms";
import { Textures } from "./Textures";
import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";

const createCamera = require("3d-view-controls");

const componentTypeMap = new Map();
componentTypeMap.set(5120, "sint8");
componentTypeMap.set(5121, "uint8");
componentTypeMap.set(5122, "sint16");
componentTypeMap.set(5123, "uint16");
componentTypeMap.set(5125, "uint32");
componentTypeMap.set(5126, "float32");

async function main() {
  const gpu = await T3D.InitWebGPU();
  const device = gpu.device;
  const glslang = (await glslangModule()) as any;
  const io = new WebIO();
  const modelName = "Box";
  let doc = await io.read(
    `https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/${modelName}/glTF/${modelName}.gltf`
  );

  const pbrShaderRaw = require("raw-loader!glslify-loader!./shaders/zixin.fragz");
  const vertShaderRaw = require("raw-loader!glslify-loader!./shaders/zixin.vertz");

  let pbrShader = pbrShaderRaw.default;
  let vertShader = vertShaderRaw.default;

  drawDoc(doc, vertShader, pbrShader);

  const modelList = <HTMLInputElement>document.getElementById("gltf-model");
  modelList.addEventListener("change", async function () {
    let uri = modelList.value;
    const doc = await io.read(
      `https://agile-hamlet-83897.herokuapp.com/${uri}`
    );
    // reset the shaders before drawing new models
    const pbrShaderRaw = require("raw-loader!glslify-loader!./shaders/zixin.fragz");
    const vertShaderRaw = require("raw-loader!glslify-loader!./shaders/zixin.vertz");

    let pbrShader = pbrShaderRaw.default;
    let vertShader = vertShaderRaw.default;

    drawDoc(doc, vertShader, pbrShader);
  });

  async function drawDoc(doc: any, vert: any, frag: any) {
    // Get data from gltf
    const gltfRoot = doc.getRoot();

    // get the single mesh
    const nodesWithMesh = gltfRoot
      .listNodes()
      .filter((node: any) => (node.getMesh() !== null ? true : false));

    // assume there is only one mesh
    const node = nodesWithMesh[0];
    const mesh = node.getMesh();
    const meshWorldMatrix = new Float32Array(node.getWorldMatrix());

    // assume there is a single primitive in the scene
    const primitive = mesh!.listPrimitives()[0];
    const primitiveMaterial = primitive.getMaterial();

    let vertDefines = ["#version 310 es\n"];
    let fragDefines = ["#version 310 es\n"];

    // create vertex attributes and layout
    let gpuVertexBufferLayout: any = [];

    function createVertexBuffer(name: string, shaderLoc: number) {
      const accessor: Accessor | null = primitive.getAttribute(name);
      if (accessor !== null) {
        vertDefines.push(`#define HAS_${name}_${accessor.getType()} 1\n`);
        fragDefines.push(`#define HAS_${name}_${accessor.getType()} 1\n`);
        const data = accessor.getArray();
        const arrayStride =
          accessor.getComponentSize() * accessor.getElementSize();
        const attributeFormat = `${componentTypeMap.get(
          accessor.getComponentType()
        )}x${accessor.getElementSize()}`;
        gpuVertexBufferLayout.push({
          arrayStride: arrayStride,
          attributes: [
            {
              shaderLocation: shaderLoc,
              format: attributeFormat,
              offset: 0,
            },
          ],
        });
        return T3D.CreateGPUBuffer(
          device,
          data,
          GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          componentTypeMap.get(accessor.getComponentType())
        );
      }
      return null;
    }

    const vertexBuffer = createVertexBuffer("POSITION", 0);
    const normalBuffer = createVertexBuffer("NORMAL", 1);
    const uv0Buffer = createVertexBuffer("TEXCOORD_0", 2);
    const color0Buffer = createVertexBuffer("COLOR_0", 3);

    // create index buffer
    const indexAccessor: Accessor = primitive.getIndices();
    const indexData = indexAccessor.getArray();
    const indexCount = indexAccessor.getCount();
    const indexDataType = componentTypeMap.get(
      indexAccessor.getComponentType()
    );
    const indexBuffer = T3D.CreateGPUBuffer(
      device,
      indexData,
      GPUBufferUsage.INDEX,
      indexDataType
    );
    ////////////////////////////////////
    // uniforms
    ////////////////////////////////////
    const modelMatrix = meshWorldMatrix;
    const normalMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = T3D.CreateViewProjection(
      true,
      gpu.canvas.width / gpu.canvas.height
    );
    vpMatrix = vp.viewProjectionMatrix;

    let rotation = vec3.fromValues(0, 0, 0);
    let camera = createCamera(gpu.canvas, vp.cameraOption);
    let eyePosition = new Float32Array(T3D.CameraPosition);

    // create uniform buffer and layout
    const vertexUniformsBufferSize = 4 * 4 * 4 * 3; // 3 mat4 matrices
    const vertexUniformBuffer = device.createBuffer({
      size: vertexUniformsBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // create fragment uniform float buffer
    const fragmentUniformFloatsBuffer = T3D.CreateGPUBuffer(
      device,
      new Float32Array([
        1.0, // default u_Exposure
        primitiveMaterial?.getMetallicFactor() as number, // u_MetallicFactor
        1.0, // default u_RoughnessFactor
        // TODO: add reasonable default values
        1.0, // u_GlossinessFactor
        1.0, // u_SheenRoughnessFactor
        1.0, // u_ClearcoatFactor
        1.0, // u_ClearcoatRoughnessFactor
        1.0, // u_KHR_materials_specular_specularFactor
        1.0, // u_TransmissionFactor
        1.0, // u_ThicknessFactor
        1.0, // u_AttenuationDistance
        1.0, // u_Ior
        1.0, // u_AlphaCutoff
        1.0, // u_OcclusionStrength
      ]),
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );

    // create fragment uniform normal scale
    const fragmentNormalScaleBuffer = T3D.CreateGPUBuffer(
      device,
      new Float32Array([1.0]), // u_NormalScale
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );

    // create fragment uniform ints
    const fragmentUniformIntsBuffer = T3D.CreateGPUBuffer(
      device,
      new Int32Array([
        // choose the first set of UV coords
        0, // default u_NormalUVSet
        0, // default u_EmissiveUVSet
        0, // default u_OcclusionUVSet
      ]),
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      "int32"
    );

    // create fragment vec4 buffer
    const baseColorFactor = new Float32Array(
      primitiveMaterial?.getBaseColorFactor() as vec4
    );
    const diffuseFactor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    const uniformVec4s = new Float32Array([
      ...baseColorFactor, // u_BaseColorFactor
      ...diffuseFactor, // u_DiffuseFactor
    ]);
    const fragmentUniformVec4sBuffer = T3D.CreateGPUBuffer(
      device,
      uniformVec4s,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );

    // create fragment vec3 buffer
    const emissiveFactor = new Float32Array(
      primitiveMaterial?.getEmissiveFactor() as vec3
    );
    const defaultSpecularSheenKHRAttenu = [1.0, 1.0, 1.0, 0.0];
    const uniformVec3s = new Float32Array([
      ...emissiveFactor, // u_EmissiveFactor
      0.0, // paddings
      ...eyePosition, // u_Camera
      0.0, // paddings
      ...defaultSpecularSheenKHRAttenu, // u_SpecularFactor
      ...defaultSpecularSheenKHRAttenu, // u_SheenColorFactor
      ...defaultSpecularSheenKHRAttenu, // u_KHR_materials_specular_specularColorFactor
      ...defaultSpecularSheenKHRAttenu, // u_AttenuationColor
    ]);
    const fragmentUniformVec3sBuffer = T3D.CreateGPUBuffer(
      device,
      uniformVec3s,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );

    // create fragment MRUniforms
    const uniformMRs = new Int32Array([
      0, // u_BaseColorUVSet
    ]);
    const fragmentUniformMRBuffer = T3D.CreateGPUBuffer(
      device,
      uniformMRs,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      "int32"
    );

    // create fragment MRUniforms2
    const uniformMR2s = new Int32Array([
      0, // u_MetallicRoughnessUVSet
    ]);
    const fragmentUniformMR2Buffer = T3D.CreateGPUBuffer(
      device,
      uniformMR2s,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      "int32"
    );

    // create fragment light buffer
    const defaultLights = [
      {
        direction: [0.5, -0.707, -0.49],
        range: -1,
        color: [1, 1, 1],
        intensity: 1,
        position: [0, 0, 0],
        innerConeCos: 1,
        outerConeCos: 0.707,
        type: 0,
      },
      {
        direction: [-0.5, 0.707, 0.5],
        range: -1,
        color: [1, 1, 1],
        intensity: 0.5,
        position: [0, 0, 0],
        innerConeCos: 1,
        outerConeCos: 0.707,
        type: 0,
      },
    ];
    let lightArray = new Array();
    for (let light of defaultLights) {
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
    const fragmentUniformLightsBuffer = T3D.CreateGPUBuffer(
      device,
      lightUniformData,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      "float32"
    );

    const bindGroupLayout: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: {
          buffer: vertexUniformBuffer,
          offset: 0,
          size: vertexUniformsBufferSize,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: fragmentUniformFloatsBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: fragmentUniformIntsBuffer,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: fragmentUniformVec4sBuffer,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: fragmentUniformVec3sBuffer,
        },
      },
      {
        binding: 10,
        resource: {
          buffer: fragmentUniformLightsBuffer,
        },
      },
    ];

    // create base color texture if it has one
    // ! Every texture follow this pattern
    const baseColorTexture = primitiveMaterial.getBaseColorTexture();
    if (baseColorTexture !== null) {
      fragDefines.push("#define HAS_BASE_COLOR_MAP 1\n");
      const baseColorTextureInfo = primitiveMaterial.getBaseColorTextureInfo();
      const ts = await Textures.CreateTexture(
        device,
        baseColorTexture!,
        baseColorTextureInfo!
      );
      bindGroupLayout.push({
        binding: 7,
        // @ts-ignore
        resource: ts.sampler,
      });
      bindGroupLayout.push({
        binding: 8,
        // @ts-ignore
        resource: ts.texture.createView(),
      });

      bindGroupLayout.push({
        binding: 9,
        resource: {
          buffer: fragmentUniformMRBuffer,
        },
      });

      // update which tex coord (0 or 1) does this map use
      device.queue.writeBuffer(
        fragmentUniformMRBuffer,
        0, // first integer in the uniform block
        new Int32Array([baseColorTextureInfo.getTexCoord()])
      );
    }

    const normalTexture = primitiveMaterial.getNormalTexture();
    if (normalTexture !== null) {
      fragDefines.push("#define HAS_NORMAL_MAP 1\n");
      const normalTextureInfo = primitiveMaterial.getNormalTextureInfo();
      const ts = await Textures.CreateTexture(
        device,
        normalTexture!,
        normalTextureInfo!
      );
      bindGroupLayout.push({
        binding: 11,
        // @ts-ignore
        resource: ts.sampler,
      });
      bindGroupLayout.push({
        binding: 12,
        // @ts-ignore
        resource: ts.texture.createView(),
      });
      bindGroupLayout.push({
        binding: 16,
        // @ts-ignore
        resource: {
          buffer: fragmentNormalScaleBuffer,
        },
      });
      // update which tex coord (0 or 1) does this map use
      device.queue.writeBuffer(
        fragmentUniformIntsBuffer,
        0,
        new Int32Array([normalTextureInfo.getTexCoord()])
      );
      device.queue.writeBuffer(
        fragmentNormalScaleBuffer,
        0,
        new Float32Array([primitiveMaterial.getNormalScale()])
      );
    }

    const metallicRoughnessTexture =
      primitiveMaterial.getMetallicRoughnessTexture();
    if (metallicRoughnessTexture !== null) {
      fragDefines.push("#define HAS_METALLIC_ROUGHNESS_MAP 1\n");
      const metallicRoughnessTextureInfo =
        primitiveMaterial.getMetallicRoughnessTextureInfo();
      const ts = await Textures.CreateTexture(
        device,
        metallicRoughnessTexture!,
        metallicRoughnessTextureInfo!
      );
      bindGroupLayout.push({
        binding: 13,
        // @ts-ignore
        resource: ts.sampler,
      });
      bindGroupLayout.push({
        binding: 14,
        // @ts-ignore
        resource: ts.texture.createView(),
      });

      bindGroupLayout.push({
        binding: 15,
        resource: {
          buffer: fragmentUniformMR2Buffer,
        },
      });

      device.queue.writeBuffer(
        fragmentUniformMRBuffer,
        0,
        new Int32Array([metallicRoughnessTextureInfo.getTexCoord()])
      );
    }

    //create render pipeline
    const vDefines = vertDefines.reduce(
      (preDef, curDef) => preDef + curDef,
      ""
    );
    const fDefines = fragDefines.reduce(
      (preDef, curDef) => preDef + curDef,
      ""
    );

    const pipeline = device.createRenderPipeline({
      vertex: {
        module: device.createShaderModule({
          code: glslang.compileGLSL(vDefines + vert, "vertex"),
        }),
        entryPoint: "main",
        // @ts-ignore
        buffers: gpuVertexBufferLayout,
      },
      fragment: {
        module: device.createShaderModule({
          code: glslang.compileGLSL(fDefines + frag, "fragment"),
        }),
        entryPoint: "main",
        targets: [
          {
            format: gpu.format as GPUTextureFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    const sceneUniformBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: bindGroupLayout,
    });

    //render pass
    const depthTexture = device.createTexture({
      size: [gpu.canvas.width, gpu.canvas.height, 1],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const renderPassDescription = {
      colorAttachments: [
        {
          view: gpu.context.getCurrentTexture().createView(),
          loadValue: [0.0, 0.0, 0.0, 1.0],
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadValue: 1,
        depthStoreOp: "store",
        stencilLoadValue: 0,
        stencilStoreOp: "store",
      },
    };

    function draw() {
      if (camera.tick()) {
        const pMatrix = vp.projectionMatrix;
        vMatrix = camera.matrix;
        mat4.multiply(vpMatrix, pMatrix, vMatrix);

        eyePosition = new Float32Array(camera.eye.flat());
        // lightPosition = eyePosition;
        device.queue.writeBuffer(
          vertexUniformBuffer,
          0,
          vpMatrix as ArrayBuffer
        );
        device.queue.writeBuffer(fragmentUniformVec3sBuffer, 16, eyePosition);
        // device.queue.writeBuffer(fragmentUniformBuffer, 16, lightPosition);
      }

      mat4.invert(normalMatrix, modelMatrix);
      mat4.transpose(normalMatrix, normalMatrix);
      device.queue.writeBuffer(
        vertexUniformBuffer,
        64,
        modelMatrix as ArrayBuffer
      );
      device.queue.writeBuffer(
        vertexUniformBuffer,
        128,
        normalMatrix as ArrayBuffer
      );

      renderPassDescription.colorAttachments[0].view = gpu.context
        .getCurrentTexture()
        .createView();
      const commandEncoder = device.createCommandEncoder();
      const renderPass = commandEncoder.beginRenderPass(
        renderPassDescription as GPURenderPassDescriptor
      );

      renderPass.setPipeline(pipeline);
      if (vertexBuffer !== null) {
        renderPass.setVertexBuffer(0, vertexBuffer);
      }
      if (normalBuffer !== null) {
        renderPass.setVertexBuffer(1, normalBuffer);
      }
      if (uv0Buffer !== null) {
        renderPass.setVertexBuffer(2, uv0Buffer);
      }
      if (color0Buffer !== null) {
        renderPass.setVertexBuffer(3, color0Buffer);
      }
      renderPass.setIndexBuffer(indexBuffer, indexDataType);

      renderPass.setBindGroup(0, sceneUniformBindGroup);
      renderPass.drawIndexed(indexCount, 1);
      renderPass.endPass();
      device.queue.submit([commandEncoder.finish()]);
    }
    T3D.CreateAnimation(draw, rotation);
  }
}

main();

// const io = new WebIO();
// const doc = await io.read(
//   "https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
// );

// doc
//   .getRoot()
//   .listMeshes()
//   .forEach((mesh) => {
//     let testArray = mesh
//       .listPrimitives()[0]
//       .getAttribute("POSITION")
//       ?.getElement(1, []);
//     console.log(testArray);

//     const tex = mesh.listPrimitives()[0].getMaterial()?.getBaseColorTexture();
//     const texSize = tex?.getSize();
//     const rawData = tex?.getImage() as Uint8ClampedArray;
//     const imageD = new ImageData(rawData, texSize![0], texSize![1]);
//     const imageBitmap = createImageBitmap(imageD);
//   });
