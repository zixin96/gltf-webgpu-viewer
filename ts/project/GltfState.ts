import { UserCamera } from "./gltf/UserCamera";
import { glTF } from "./gltf/glTF";

class GltfState {
  // gltf is loaded by ResourceLoader::loadGltf
  gltf: glTF | undefined;
  /** user camera @see UserCamera, convenient camera controls */
  userCamera: UserCamera;
  /** gltf scene that is visible in the view */
  sceneIndex: any;
  /**
   * index of the camera that is used to render the view. a
   * value of 'undefined' enables the user camera
   */
  cameraIndex: any;
  /** parameters used to configure the rendering */
  renderingParameters: any;

  // retain a reference to the view with which the state was created, so that it can be validated
  _view: any;

  constructor(view: any) {
    this.gltf = undefined;
    this.userCamera = new UserCamera();
    this.sceneIndex = 0;
    this.cameraIndex = undefined;

    /** parameters used to configure the rendering */
    this.renderingParameters = {
      /** clear color expressed as list of ints in the range [0, 255] */
      clearColor: [58, 64, 74, 255],
      /** KHR_lights_punctual */
      usePunctual: true,
    };

    // retain a reference to the view with which the state was created, so that it can be validated
    this._view = view;
  }
}

export { GltfState };
