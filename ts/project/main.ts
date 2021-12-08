import { Texture, WebIO, TextureInfo } from "@gltf-transform/core";
import { mat4, vec3 } from "gl-matrix";
import { Transforms as T3D } from "./transforms";
import { SimpleTextureShader } from "./shaders";
import { Textures } from "./Textures";
import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";

const createCamera = require("3d-view-controls");

interface BaseColorTexture {
  texture: Texture;
  textureInfo: TextureInfo;
}

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
  const mesh = gltfRoot.listMeshes()[0];

  // assume there is a single primitive in the scene
  const primitive = mesh.listPrimitives()[0];
  const primitiveMaterial = primitive.getMaterial();

  let baseColorTextureInterface: BaseColorTexture;
  let hasBaseColorTexture = false;
  const baseColorTexture = primitiveMaterial?.getBaseColorTexture();
  if (baseColorTexture !== null) {
    hasBaseColorTexture = true;
    baseColorTextureInterface = {
      texture: baseColorTexture as Texture,
      textureInfo: primitiveMaterial?.getBaseColorTextureInfo() as TextureInfo,
    };
  }

  const vertexData = primitive
    .getAttribute("POSITION")
    ?.getArray() as Float32Array;
  const vertexBuffer = T3D.CreateGPUBuffer(device, vertexData);

  const normalData = primitive
    .getAttribute("NORMAL")
    ?.getArray() as Float32Array;
  const normalBuffer = T3D.CreateGPUBuffer(device, normalData);

  if (hasBaseColorTexture) {
    var uvData = primitive
      .getAttribute("TEXCOORD_0")
      ?.getArray() as Float32Array;
    var uvBuffer = T3D.CreateGPUBuffer(device, uvData);
  }

  const indexData = primitive.getIndices()?.getArray() as Uint16Array;
  const indexBuffer = T3D.CreateGPUBuffer(
    device,
    indexData,
    GPUBufferUsage.INDEX
  );

  // uniform data
  const normalMatrix = mat4.create();
  const modelMatrix = mat4.create();
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

  //create render pipeline
  const shader = SimpleTextureShader.glslShaders();

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

  if (hasBaseColorTexture) {
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
  }

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

  //create uniform buffer and layout
  const vertexUniformBuffer = device.createBuffer({
    size: 192,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const fragmentUniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  //get texture and sampler data
  let bindGroupEntries = [
    {
      binding: 0,
      resource: {
        buffer: vertexUniformBuffer,
        offset: 0,
        size: 192,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: fragmentUniformBuffer,
        offset: 0,
        size: 32,
      },
    },
  ];

  if (hasBaseColorTexture) {
    const ts = await Textures.CreateTexture(
      device,
      baseColorTextureInterface!.texture,
      baseColorTextureInterface!.textureInfo
    );
    bindGroupEntries.push({
      binding: 2,
      // @ts-ignore
      resource: ts.sampler,
    });
    bindGroupEntries.push({
      binding: 3,
      // @ts-ignore
      resource: ts.texture.createView(),
    });
  }

  const sceneUniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: bindGroupEntries,
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
      device.queue.writeBuffer(fragmentUniformBuffer, 0, eyePosition);
      device.queue.writeBuffer(fragmentUniformBuffer, 16, lightPosition);
    }

    T3D.CreateTransforms(modelMatrix, [0, 0, 0], rotation as vec3, [1, 1, 1]);
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
