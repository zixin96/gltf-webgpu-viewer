import { gltfRenderer } from "./gltfRenderer";
import { GltfState } from "./GltfState";
import { ResourceLoader } from "./ResourceLoader";
/**
 * GltfView represents a view on a gltf, e.g. in a canvas
 */
class GltfView {
  device: GPUDevice;
  renderer: gltfRenderer;
  /**
   * GltfView representing one WebGPU context or in other words one
   * 3D rendering of the Gltf.
   * @param context
   */
  constructor(canvas: HTMLCanvasElement, device: GPUDevice, glslang: any) {
    this.device = device;
    this.renderer = new gltfRenderer(canvas, this.device, glslang);
  }

  /**
   * createState constructs a new GltfState for the GltfView.
   * @returns
   */
  createState() {
    return new GltfState(this);
  }

  /**
   * createResourceLoader creates a resource loader with which glTFs and
   * environments can be loaded for the view
   * @param externalDracoLib
   * @param externalKtxLib
   * @returns
   */
  createResourceLoader(
    externalDracoLib = undefined,
    externalKtxLib = undefined
  ) {
    let resourceLoader = new ResourceLoader(this);
    // resourceLoader.initKtxLib(externalKtxLib);
    // resourceLoader.initDracoLib(externalDracoLib);
    return resourceLoader;
  }

  /**
   * renderFrame to the context's default frame buffer
   * Call this function in the javascript animation update loop for continuous rendering to a canvas
   * @param state GltfState that is be used for rendering
   * @param width of the viewport
   * @param height of the viewport
   * @returns
   */
  // renderFrame(state: any, width: any, height: any) {
  //   const scene = state.gltf.scenes[state.sceneIndex];
  //   if (scene === undefined) {
  //     return;
  //   }

  //   if (state.gltf === undefined) {
  //     return;
  //   }
  //   scene.applyTransformHierarchy(state.gltf);

  //   this.renderer.init(state, scene);
  //   this.renderer.drawScene(state, scene);
  // }
}

export { GltfView };
