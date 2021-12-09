import { vec2, vec3, mat4 } from "gl-matrix";
import { FOVY, NEAR_PLANE, FAR_PLANE } from "./config";

export class Transforms {
  public static CameraPosition: vec3 = [2, 2, 4];
  public static LookDirection: vec3 = [0, 0, 0];
  public static UpDirection: vec3 = [0, 1, 0];

  public static async InitWebGPU() {
    const canvas = document.getElementById(
      "canvas-webgpu"
    ) as HTMLCanvasElement;
    canvas.width = 1024;
    canvas.height = 1024;
    const adapter = await navigator.gpu?.requestAdapter();
    const device = (await adapter?.requestDevice()) as GPUDevice;
    const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;
    const format = "bgra8unorm";
    context.configure({
      device: device,
      format: format,
    });

    return { device, canvas, format, context };
  }

  public static CreateGPUBuffer(
    device: GPUDevice,
    data: any,
    usageFlag: GPUBufferUsageFlags,
    dataType: string = "float32"
  ) {
    let desc = {
      size: (data.byteLength + 3) & ~3,
      usage: usageFlag,
      mappedAtCreation: true,
    };
    let buffer = device.createBuffer(desc);

    let writeArray: any;
    if (dataType === "uint16") {
      writeArray = new Uint16Array(buffer.getMappedRange());
    } else if (dataType === "float32") {
      writeArray = new Float32Array(buffer.getMappedRange());
    } else if (dataType === "int32") {
      writeArray = new Int32Array(buffer.getMappedRange());
    } else {
      console.error("Unsupported GPUBuffer Data Type!");
    }

    writeArray.set(data);
    buffer.unmap();
    return buffer;
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

  public static Round(vecOrMat: any, numDigits: number) {
    const result: any = [];
    for (let i = 0; i < vecOrMat.length; i++) {
      result.push(Number(vecOrMat[i].toFixed(numDigits)));
    }
    return result;
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

  public static CreateAnimation(draw: any, rotation: vec3) {
    function step() {
      rotation = [0, 0, 0];
      draw();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  public static animateVertex(
    draw: any,
    param: vec2,
    paramRange: any,
    speed: number
  ) {
    let isDecrease = true;
    if (param[0] < paramRange[0] + speed) isDecrease = false;
    function step() {
      if (param[0] > paramRange[0] && isDecrease) {
        param[0] -= speed;
        isDecrease = true;
        if (param[0] <= paramRange[0]) isDecrease = false;
      } else if (param[0] < paramRange[1] && !isDecrease) {
        param[0] += speed;
        isDecrease = false;
        if (param[0] >= paramRange[1]) isDecrease = true;
      }

      draw();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
}
