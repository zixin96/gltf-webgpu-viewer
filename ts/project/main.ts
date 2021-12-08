import { WebIO } from "@gltf-transform/core";
import { mat4, vec3 } from "gl-matrix";
import { Transforms as T3D } from "./transforms";
import { SimpleTextureShader } from "./shaders";
import { Textures } from "./Textures";

const createCamera = require("3d-view-controls");

async function main() {
  const gpu = await T3D.InitWebGPU();
  const device = gpu.device;

  // Get data from gltf
  const io = new WebIO();
  const doc = await io.read(
    "https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
  );

  const gltfRoot = doc.getRoot();
  const mesh = gltfRoot.listMeshes()[0];

  // assume there is a single primitive in the scene
  const primitive = mesh.listPrimitives()[0];
  const primitiveMaterial = primitive.getMaterial();
  const baseColorTexture = primitiveMaterial?.getBaseColorTexture();
  const baseColorTextureInfo = primitiveMaterial?.getBaseColorTextureInfo();

  const vertexData = primitive
    .getAttribute("POSITION")
    ?.getArray() as Float32Array;
  const vertexBuffer = T3D.CreateGPUBuffer(device, vertexData);

  const normalData = primitive
    .getAttribute("NORMAL")
    ?.getArray() as Float32Array;
  const normalBuffer = T3D.CreateGPUBuffer(device, normalData);

  const uvData = primitive
    .getAttribute("TEXCOORD_0")
    ?.getArray() as Float32Array;
  const uvBuffer = T3D.CreateGPUBuffer(device, uvData);

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
  const shader = SimpleTextureShader.wgslShaders();
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: shader.vertex,
      }),
      entryPoint: "main",
      buffers: [
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
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 2,
              format: "float32x2",
              offset: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: shader.fragment,
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
  const ts = await Textures.CreateTexture(
    device,
    baseColorTexture!,
    baseColorTextureInfo!
  );
  const sceneUniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
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
      {
        binding: 2,
        resource: ts.sampler,
      },
      {
        binding: 3,
        resource: ts.texture.createView(),
      },
    ],
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
        loadValue: [0.5, 0.5, 0.8, 1.0],
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
    renderPass.setVertexBuffer(2, uvBuffer);
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
