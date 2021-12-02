import { GltfObject } from "./GltfObject";
import axios from "axios";

class gltfBuffer extends GltfObject {
  uri: any;
  byteLength: any;
  name: any;

  // non gltf
  buffer: any; // raw data blob

  constructor() {
    super();
    this.uri = undefined;
    this.byteLength = undefined;
    this.name = undefined;

    // non gltf
    this.buffer = undefined; // raw data blob
  }

  /**
   * load raw binary data into this.buffer
   * @param gltf THIS IS NOT USED since we are using https request
   * @param additionalFiles
   * @returns
   */
  // load(gltf: glTF, additionalFiles = undefined) {
  load(additionalFiles = undefined) {
    if (this.buffer !== undefined) {
      console.error("buffer has already been loaded");
      return;
    }

    const self = this;
    return new Promise<void>(function (resolve) {
      if (
        !self.setBufferFromFiles(additionalFiles, resolve) &&
        /*!self.setBufferFromUri(gltf, resolve)*/
        !self.setBufferFromUri(resolve)
      ) {
        console.error("Was not able to resolve buffer with uri '%s'", self.uri);
        resolve();
      }
    });
  }

  /**
   * Given a uri (Box0.bin), put the binary raw data into this.buffer
   * @param gltf
   * @param callback
   * @returns
   */
  // setBufferFromUri(gltf: glTF, callback: any) {
  setBufferFromUri(callback: any) {
    if (this.uri === undefined) {
      return false;
    }

    const self = this;
    // * Note: here, Khronos uses axios.get('assets/models/2.0/Box/glTF/Box0.bin')
    // * to get to the raw file.
    // prefix with agile-hamlet to avoid CORS error
    axios
      .get(
        "https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/cf4ce3202cec1ee2fa39cb9bcb764c0b8655703c/2.0/Box/glTF/Box0.bin",
        { responseType: "arraybuffer" }
      )
      .then(function (response) {
        self.buffer = response.data;
        callback();
      });
    return true;
  }

  // ! Note: this function will be skipped (return false) in box
  setBufferFromFiles(files: any, callback: any) {
    if (this.uri === undefined || files === undefined) {
      return false;
    }
    return true;
  }
}

export { gltfBuffer };
