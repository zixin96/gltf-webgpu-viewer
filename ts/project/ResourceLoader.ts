import axios from "axios";
import { glTF } from "./gltf/glTF";
import { gltfLoader } from "./gltf/gltfLoader";
import { GltfView } from "./GltfView";

/**
 * ResourceLoader can be used to load resources for the GltfState
 * that are then used to display the loaded data with GltfView
 */
class ResourceLoader {
  view: GltfView;
  /**
   * ResourceLoader class that provides an interface to load resources into
   * the view. Typically this is created with GltfView.createResourceLoader()
   * @param view the GltfView for which the resources are loaded
   */
  constructor(view: GltfView) {
    this.view = view;
  }

  /**
   * loadGltf asynchronously and create resources for rendering
   * FIXME: currently, we only support loading gltf file directly from https
   * @param gltfFile
   * @param externalFiles
   */
  async loadGltf(gltfFile: string, externalFiles: any = undefined) {
    // Get the raw unmodified gltf json file
    let json = undefined;
    let filename = "";
    if (typeof gltfFile === "string") {
      await axios
        // FIXME: add error checking. What if URL is wrong?
        .get(
          `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${gltfFile}/glTF/${gltfFile}.gltf`,
          {
            responseType: "json",
          }
        )
        .then((response) => {
          json = response.data; // json contains the raw, unmodified gltf files
          filename = gltfFile;
        });
    } else {
      console.error("Passed invalid type to loadGltf " + typeof gltfFile);
    }

    // Process the raw unmodified gltf json file:
    // 1. create custom objects out of raw json
    // 2. call initGl on all applicable objects
    const gltf = new glTF();
    gltf.fromJson(json); // after this function, gltf has been populated wtih glTFXXX objects. Node world transform has been set to identity matrix
    await gltfLoader.load(gltf, this.view.device);
    console.log(gltf);
    return gltf;
  }
}

export { ResourceLoader };
