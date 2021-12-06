import { gltfRenderer } from "./gltfRenderer";
import { GltfState } from "./GltfState";
import { ResourceLoader } from "./ResourceLoader";

/**
 * GltfView holds a GPUDevice and gltfRenderer
 */
class GltfView {
  device: GPUDevice;
  renderer: gltfRenderer;

  constructor(canvas: HTMLCanvasElement, device: GPUDevice, glslang: any) {
    // initialize GltfView with our GPUDevice
    this.device = device;
    // initialize GltfView with a new gltfRenderer, passing in HTMLCanvasElement, GPUDevice, and Glslang
    this.renderer = new gltfRenderer(canvas, device, glslang);
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
   * @returns
   */
  createResourceLoader() {
    let resourceLoader = new ResourceLoader(this);
    return resourceLoader;
  }
}

export { GltfView };
