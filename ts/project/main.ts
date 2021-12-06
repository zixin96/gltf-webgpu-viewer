import { CANVAS_SIZE } from "./constants";
import { GltfView } from "./GltfView";
import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";

async function main() {
  // get <canvas> from index.html and fix its size to be CANVAS_SIZE x CANVAS_SIZE
  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  canvas.width = canvas.height = CANVAS_SIZE;

  // get a GPUAdapter, GPUDevice, and Glslang (in order to use glsl shaders)
  const adapter = await navigator.gpu?.requestAdapter();
  const device = (await adapter?.requestDevice()) as GPUDevice;
  const glslang = (await glslangModule()) as any;

  // create a GltfView
  const view = new GltfView(canvas, device, glslang);

  // create a ResourceLoader
  const resourceLoader = view.createResourceLoader();

  // create a GltfState
  const state = view.createState();

  // load gltf
  state.gltf = await resourceLoader.loadGltf("Box"); // FIXME: user can choose which file to load

  // choose the scene to render
  const defaultScene = state.gltf.scene;
  state.sceneIndex = defaultScene === undefined ? 0 : defaultScene;

  if (state.gltf.scenes.length === 0) {
    // if there is no scene, return immediately
    return;
  }

  const scene = state.gltf.scenes[state.sceneIndex];
  scene.applyTransformHierarchy(state.gltf);

  state.userCamera.aspectRatio = canvas.width / canvas.height;
  state.userCamera.fitViewToScene(state.gltf, state.sceneIndex);

  view.renderer.init(state, scene);
  const update = () => {
    view.renderer.webGPU.draw();
    window.requestAnimationFrame(update);
  };

  // After this start executing animation loop.
  window.requestAnimationFrame(update);
}

main();
