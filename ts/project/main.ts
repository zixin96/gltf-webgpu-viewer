import Renderer from "./renderer";
import { CANVAS_SIZE } from "./constants";
import { GltfView } from "./GltfView";
import { UIModel } from "./UIModel";

async function main() {
  const canvas = document.getElementById("gfx") as HTMLCanvasElement;
  const adapter = await navigator.gpu?.requestAdapter();
  const device = (await adapter?.requestDevice()) as GPUDevice;
  const view = new GltfView(device);
  const resourceLoader = view.createResourceLoader();
  const state = view.createState();
  const uiModel = new UIModel();
  // In Khronos, when IBL is turned off, directional lights kick in immediately
  state.renderingParameters.useDirectionalLightsWithDisabledIBL = true;
  // Here, we hardcode box.gltf to load box
  // In loadGltf(), we use this string as part of a https request
  // FIXME: user can choose which file to load
  state.gltf = await resourceLoader.loadGltf("Box.gltf");
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
    // ! In our implementation, canvas.width and height are fixed to 1024
    canvas.width = canvas.height = CANVAS_SIZE;
    // ! Attention: camera spec is dynamically set based on canvas's aspect ratio
    // ! and scene extent. If no object present in the scene, check here!!!
    state.userCamera.aspectRatio = canvas.width / canvas.height;
    state.userCamera.fitViewToScene(state.gltf, state.sceneIndex);
  }
  // Only redraw glTF view upon user inputs, or when an animation (not supported for now) is playing.
  let redraw = false;
  const listenForRedraw = (stream: any) =>
    stream.subscribe(() => (redraw = true));

  uiModel.orbit.subscribe((orbit: any) => {
    if (state.cameraIndex === undefined) {
      state.userCamera.orbit(orbit.deltaPhi, orbit.deltaTheta);
    }
  });
  listenForRedraw(uiModel.orbit);

  uiModel.pan.subscribe((pan: any) => {
    if (state.cameraIndex === undefined) {
      state.userCamera.pan(pan.deltaX, -pan.deltaY);
    }
  });
  listenForRedraw(uiModel.pan);

  uiModel.zoom.subscribe((zoom: any) => {
    if (state.cameraIndex === undefined) {
      state.userCamera.zoomBy(zoom.deltaZoom);
    }
  });
  listenForRedraw(uiModel.zoom);

  const update = () => {
    if (redraw) {
      view.renderFrame(state, canvas.width, canvas.height);
      redraw = false;
    }

    window.requestAnimationFrame(update);
  };

  // After this start executing animation loop.
  window.requestAnimationFrame(update);
}

main();
// const canvas = document.getElementById("gfx") as HTMLCanvasElement;
// canvas.width = canvas.height = CANVAS_SIZE; // ! is this supposed to be 640 and 640?
// const renderer = new Renderer(canvas);
// renderer.start();
