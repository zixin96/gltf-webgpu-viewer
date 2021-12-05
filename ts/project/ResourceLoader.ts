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
          json = response.data;
          filename = gltfFile;
        });
    } else {
      console.error("Passed invalid type to loadGltf " + typeof gltfFile);
    }

    // console.log(json);
    // console.log(filename);
    const gltf = new glTF(filename);
    gltf.fromJson(json); // after this function, gltf has been populated wtih glTFXXX objects. Node world transform has been set to identity matrix
    await gltfLoader.load(gltf, this.view.device);
    return gltf;
  }
}

export { ResourceLoader };
