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
   * @returns
   */
  load() {
    if (this.buffer !== undefined) {
      console.error("buffer has already been loaded");
      return;
    }

    const self = this;
    return new Promise<void>(function (resolve) {
      if (!self.setBufferFromUri(resolve)) {
        console.error("Was not able to resolve buffer with uri '%s'", self.uri);
        resolve();
      }
    });
  }

  /**
   * Given a uri (Box0.bin), put the binary raw data into this.buffer
   * @param callback
   * @returns
   */
  setBufferFromUri(callback: any) {
    if (this.uri === undefined) {
      return false;
    }
    const self = this;
    let pureName = self.uri.substr(0, self.uri.indexOf("0"));
    if (pureName === "") {
      pureName = self.uri.substr(0, self.uri.indexOf("."));
    }
    // prefix with agile-hamlet to avoid CORS error
    axios
      .get(
        `https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/${pureName}/glTF/${self.uri}`,
        { responseType: "arraybuffer" }
      )
      .then(function (response) {
        self.buffer = response.data;
        callback();
      });
    return true;
  }
}

export { gltfBuffer };
