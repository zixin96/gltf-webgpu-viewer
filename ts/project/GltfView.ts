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
   * @returns
   */
  createResourceLoader() {
    let resourceLoader = new ResourceLoader(this);
    return resourceLoader;
  }
}

export { GltfView };
