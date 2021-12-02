import axios from "axios";
import { glTF } from "./gltf/glTF";
import { gltfLoader } from "./gltf/gltfLoader";
/**
 * ResourceLoader can be used to load resources for the GltfState
 * that are then used to display the loaded data with GltfView
 */
class ResourceLoader {
  view: any;
  /**
   * ResourceLoader class that provides an interface to load resources into
   * the view. Typically this is created with GltfView.createResourceLoader()
   * @param view the GltfView for which the resources are loaded
   */
  constructor(view: any) {
    this.view = view;
  }

  /**
   * loadGltf asynchronously and create resources for rendering
   * @param gltfFile
   * @param externalFiles
   */
  async loadGltf(gltfFile: any, externalFiles: any) {
    let isGlb = undefined;
    let buffers = undefined;
    let json = undefined;
    let data = undefined;
    let filename = "";
    if (typeof gltfFile === "string") {
      let response = await axios.get(
        "https://agile-hamlet-83897.herokuapp.com/https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/cf4ce3202cec1ee2fa39cb9bcb764c0b8655703c/2.0/Box/glTF/Box.gltf",
        {
          responseType: "json",
        }
      );
      json = response.data;
      data = response.data;
      filename = gltfFile;
    } else {
      console.error("Passed invalid type to loadGltf " + typeof gltfFile);
    }

    if (isGlb) {
      //   const glbParser = new GlbParser(data);
      //   const glb = glbParser.extractGlbData();
      //   json = glb.json;
      //   buffers = glb.buffers;
    }

    const gltf = new glTF(filename);
    // gltf.ktxDecoder = this.view.ktxDecoder;
    //Make sure draco decoder instance is ready
    gltf.fromJson(json);

    // because the gltf image paths are not relative
    // to the gltf, we have to resolve all image paths before that
    // for (const image of gltf.images) {
    //   image.resolveRelativePath(getContainingFolder(gltf.path));
    // }

    await gltfLoader.load(gltf, this.view.context, buffers);

    return gltf;
  }
}

export { ResourceLoader };
