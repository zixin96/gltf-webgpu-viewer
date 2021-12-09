import { vec2, vec3, mat4, vec4, quat } from "gl-matrix";
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
    inputMatrix: mat4,
    translation: vec3,
    rotation: vec4,
    scaling: vec3
  ) {
    // const rotateXMat = mat4.create();
    // const rotateYMat = mat4.create();
    // const rotateZMat = mat4.create();
    const rotateMat = mat4.create();
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    // ! no animation
    // if rotation, translation or scaling is falsy, default values will be set
    rotation = rotation || [0, 0, 0, 0];
    translation = translation || [0, 0, 0];
    scaling = scaling || [1, 1, 1];

    //perform individual transformations
    mat4.fromTranslation(translateMat, translation);
    const inputQuat = quat.fromValues(
      rotation[0],
      rotation[1],
      rotation[2],
      rotation[3]
    );
    mat4.fromQuat(rotateMat, inputQuat);
    // mat4.fromXRotation(rotateXMat, rotation[0]);
    // mat4.fromYRotation(rotateYMat, rotation[1]);
    // mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    //combine all transformation matrices together to form a final transform matrix: modelMat
    // T * R * S
    mat4.multiply(inputMatrix, rotateMat, scaleMat);
    mat4.multiply(inputMatrix, translateMat, inputMatrix);
  }

  public static CreateAnimation(
    draw: any,
    rotation: vec4,
    isAnimation = false
    // maxTime: number = 0,
    // timeValueMap: any
  ) {
    function step() {
      if (isAnimation) {
        // // rotation[0] += 0.001;
        // // rotation[1] += 0.001;
        // // rotation[2] += 0.001;
        // let currentTime = (new Date().getTime() / 1000) % maxTime;
        // // assume animation time stamp are whole number
        // let previousTime = Math.trunc(currentTime);
        // let nextTime = previousTime + 1;
        // let previousValue = timeValueMap.get(previousTime);
        // let nextValue = timeValueMap.get(nextTime);
        // let interpolationValue =
        //   (currentTime - previousTime) / (nextTime - previousTime);
        // rotation[0] =
        //   previousValue[0] +
        //   interpolationValue * (nextValue[0] - previousValue[0]);
        // rotation[1] =
        //   previousValue[1] +
        //   interpolationValue * (nextValue[1] - previousValue[1]);
        // rotation[2] =
        //   previousValue[2] +
        //   interpolationValue * (nextValue[2] - previousValue[2]);
        // rotation[3] =
        //   previousValue[3] +
        //   interpolationValue * (nextValue[3] - previousValue[3]);
      } else {
        rotation = [0, 0, 0, 0];
      }
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
