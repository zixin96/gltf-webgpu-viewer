import { Texture, WebIO, TextureInfo, Mesh } from "@gltf-transform/core";
import { mat4, vec3, vec4 } from "gl-matrix";
import { Transforms as T3D } from "./transforms";
import { SimpleTextureShader } from "./shaders";
import { Textures } from "./Textures";
import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";
import { buffer } from "stream/consumers";

const createCamera = require("3d-view-controls");

async function main() {
  const gpu = await T3D.InitWebGPU();
  const device = gpu.device;
  const glslang = (await glslangModule()) as any;
  const io = new WebIO();

  let doc = await io.read(
    "https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
  );

  const modelList = <HTMLInputElement>document.getElementById("gltf-model");
  modelList.addEventListener("change", async function () {
    let uri = modelList.value;
    // doc = await io.read(`https://agile-hamlet-83897.herokuapp.com/${uri}`);
    console.log(uri);
  });

  // Get data from gltf
  const gltfRoot = doc.getRoot();

  // get the single mesh
  const nodesWithMesh = gltfRoot
    .listNodes()
    .filter((node) => (node.getMesh() !== null ? true : false));

  const node = nodesWithMesh[0];
  const mesh = node.getMesh();
  const meshWorldMatrix = new Float32Array(node.getWorldMatrix());

  // assume there is a single primitive in the scene
  const primitive = mesh!.listPrimitives()[0];
  const primitiveMaterial = primitive.getMaterial();

  // create vertex attributes and layout
  const vertexData = primitive
    .getAttribute("POSITION")
    ?.getArray() as Float32Array;
  const vertexBuffer = T3D.CreateGPUBuffer(device, vertexData);

  const normalData = primitive
    .getAttribute("NORMAL")
    ?.getArray() as Float32Array;
  const normalBuffer = T3D.CreateGPUBuffer(device, normalData);

  let gpuVertexBufferLayout = [
    {
      arrayStride: 12,
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0,
        },
      ],
    },
    {
      arrayStride: 12,
      attributes: [
        {
          shaderLocation: 1,
          format: "float32x3",
          offset: 0,
        },
      ],
    },
  ];

  // create index buffer
  const indexData = primitive.getIndices()?.getArray() as Uint16Array;
  const indexBuffer = T3D.CreateGPUBuffer(
    device,
    indexData,
    GPUBufferUsage.INDEX
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
  let lightPosition = eyePosition;

  // create uniform buffer and layout
  const vertexUniformsBufferSize = 4 * 4 * 4 * 3; // 3 mat4 matrices
  const vertexUniformBuffer = device.createBuffer({
    size: vertexUniformsBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // create uniform float buffer
  const fragUniformsFloatsSize = 15 * 4; // 15 floats
  const fragmentUniformFloatsBuffer = device.createBuffer({
    size: fragUniformsFloatsSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformFloats = new Float32Array([
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
    1.0, // u_NormalScale
    1.0, // u_OcclusionStrength
  ]);
  device.queue.writeBuffer(fragmentUniformFloatsBuffer, 0, uniformFloats);

  // create fragment int buffer
  const fragUniformsIntsSize = 3 * 4; // 3 ints
  const fragmentUniformIntsBuffer = device.createBuffer({
    size: fragUniformsIntsSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformInts = new Int32Array([
    // choose the first set of UV coords
    0, // default u_NormalUVSet
    0, // default u_EmissiveUVSet
    0, // default u_OcclusionUVSet
  ]);
  device.queue.writeBuffer(fragmentUniformIntsBuffer, 0, uniformInts);

  // create fragment vec4 buffer
  const fragUniformsVec4sSize = 2 * 4 * 4; // 2 vec4s
  const fragmentUniformVec4sBuffer = device.createBuffer({
    size: fragUniformsVec4sSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const baseColorFactor = new Float32Array(
    primitiveMaterial?.getBaseColorFactor() as vec4
  );
  const diffuseFactor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
  const uniformVec4s = new Float32Array([...baseColorFactor, ...diffuseFactor]);
  device.queue.writeBuffer(fragmentUniformVec4sBuffer, 0, uniformVec4s);

  // create fragment vec3 buffer
  const fragUniformsVec3sSize = 6 * 4 * 4; // 6 vec3s (treated as vec4)
  const fragmentUniformVec3sBuffer = device.createBuffer({
    size: fragUniformsVec3sSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const emissiveFactor = new Float32Array(
    primitiveMaterial?.getEmissiveFactor() as vec3
  );
  const defaultSpecularSheenKHRAttenu = [1.0, 1.0, 1.0, 0.0];
  const uniformVec3s = new Float32Array([
    ...emissiveFactor,
    0.0, // paddings
    ...eyePosition, // TODO: this is updated by frame, write newest eye position into the fragment shader
    0.0, // paddings
    ...defaultSpecularSheenKHRAttenu,
    ...defaultSpecularSheenKHRAttenu,
    ...defaultSpecularSheenKHRAttenu,
    ...defaultSpecularSheenKHRAttenu,
  ]);
  device.queue.writeBuffer(fragmentUniformVec3sBuffer, 0, uniformVec3s);

  // create fragment MRUniforms
  const fragUniformsMRsSize = 2 * 4; // TODO: since we ignore mat3 in this block, this is temporary
  const fragmentUniformMRBuffer = device.createBuffer({
    size: fragUniformsMRsSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformMRs = new Int32Array([
    0, // u_MetallicRoughnessUVSet
    0, // u_BaseColorUVSet
  ]);
  device.queue.writeBuffer(fragmentUniformMRBuffer, 0, uniformMRs);

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
        offset: 0,
        size: fragUniformsFloatsSize,
      },
    },
    {
      binding: 2,
      resource: {
        buffer: fragmentUniformIntsBuffer,
        offset: 0,
        size: fragUniformsIntsSize,
      },
    },
    {
      binding: 3,
      resource: {
        buffer: fragmentUniformVec4sBuffer,
        offset: 0,
        size: fragUniformsVec4sSize,
      },
    },
    {
      binding: 4,
      resource: {
        buffer: fragmentUniformVec3sBuffer,
        offset: 0,
        size: fragUniformsVec3sSize,
      },
    },
    {
      binding: 9,
      resource: {
        buffer: fragmentUniformMRBuffer,
        offset: 0,
        size: fragUniformsMRsSize,
      },
    },
  ];

  // create base color texture if it has one
  const baseColorTexture = primitiveMaterial?.getBaseColorTexture();
  let hasBaseColorTexture = false;
  if (baseColorTexture !== null) {
    hasBaseColorTexture = true;
    const baseColorTextureInfo = primitiveMaterial?.getBaseColorTextureInfo();

    var uvData = primitive
      .getAttribute("TEXCOORD_0")
      ?.getArray() as Float32Array;
    var uvBuffer = T3D.CreateGPUBuffer(device, uvData);

    gpuVertexBufferLayout.push({
      arrayStride: 8,
      attributes: [
        {
          shaderLocation: 2,
          format: "float32x2",
          offset: 0,
        },
      ],
    });

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
  }

  //create render pipeline
  const shader = SimpleTextureShader.glslShaders();
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(shader.vertex, "vertex"),
      }),
      entryPoint: "main",
      // @ts-ignore
      buffers: gpuVertexBufferLayout,
    },
    fragment: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(shader.fragment, "fragment"),
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
      lightPosition = eyePosition;
      device.queue.writeBuffer(vertexUniformBuffer, 0, vpMatrix as ArrayBuffer);
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
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setVertexBuffer(1, normalBuffer);
    if (hasBaseColorTexture) {
      renderPass.setVertexBuffer(2, uvBuffer);
    }
    renderPass.setIndexBuffer(indexBuffer, "uint16");

    renderPass.setBindGroup(0, sceneUniformBindGroup);
    renderPass.drawIndexed(indexData.length, 1);
    renderPass.endPass();
    device.queue.submit([commandEncoder.finish()]);
  }
  T3D.CreateAnimation(draw, rotation);
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
