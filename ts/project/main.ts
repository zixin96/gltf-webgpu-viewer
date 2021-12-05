import { CANVAS_SIZE } from "./constants";
import { GltfView } from "./GltfView";
import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";

async function main() {
  const canvas = document.getElementById("gfx") as HTMLCanvasElement;
  canvas.width = canvas.height = CANVAS_SIZE;
  const adapter = await navigator.gpu?.requestAdapter();
  const device = (await adapter?.requestDevice()) as GPUDevice;
  const glslang = (await glslangModule()) as any;
  const view = new GltfView(canvas, device, glslang);
  const resourceLoader = view.createResourceLoader();
  const state = view.createState();
  // FIXME: user can choose which file to load
  state.gltf = await resourceLoader.loadGltf("Box");
  const defaultScene = state.gltf.scene;
  state.sceneIndex = defaultScene === undefined ? 0 : defaultScene;
  state.cameraIndex = undefined;
  if (state.gltf.scenes.length != 0) {
    if (state.sceneIndex > state.gltf.scenes.length - 1) {
      state.sceneIndex = 0;
    }
    const scene = state.gltf.scenes[state.sceneIndex];
    // after this line, gltfNode inside our glTF object will contain
    // the correct worldTransform, inverseWorldTransform, and normalMatrix
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
}

main();
