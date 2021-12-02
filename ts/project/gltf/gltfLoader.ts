import { glTF } from "./glTF";

class gltfLoader {
  static async load(gltf: glTF, webGPUContext: any, appendix = undefined) {
    // ! both buffers and additionalFiles are undefined in box
    // const buffers = gltfLoader.getBuffers(appendix);
    // const additionalFiles = gltfLoader.getAdditionalFiles(appendix);
    const buffers = undefined;
    const additionalFiles = undefined;

    const buffersPromise = gltfLoader.loadBuffers(
      gltf,
      buffers,
      additionalFiles
    );

    await buffersPromise; // images might be stored in the buffers
    const imagesPromise = gltfLoader.loadImages(gltf, additionalFiles);

    // after all buffers and images promise has been resolved,
    // call gltf.initGl
    return await Promise.all([buffersPromise, imagesPromise]).then(() =>
      gltf.initGl(webGPUContext)
    );
  }

  static loadBuffers(gltf: glTF, buffers: any, additionalFiles: any) {
    const promises = [];

    // ! this will NOT get executed in box
    if (buffers !== undefined && buffers[0] !== undefined) {
      //GLB
      //There is only one buffer for the glb binary data
      //see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#glb-file-format-specification
      if (buffers.length > 1) {
        console.warn(
          "Too many buffer chunks in GLB file. Only one or zero allowed"
        );
      }

      gltf.buffers[0].buffer = buffers[0];
      for (let i = 1; i < gltf.buffers.length; ++i) {
        promises.push(gltf.buffers[i].load(gltf, additionalFiles));
      }
    } else {
      // ! this will get executed in box
      for (const buffer of gltf.buffers) {
        promises.push(buffer.load(gltf, additionalFiles));
      }
    }
    return Promise.all(promises);
  }

  // ! this will return empty promises for box
  static loadImages(gltf: glTF, additionalFiles: any) {
    const imagePromises = [];
    for (let image of gltf.images) {
      imagePromises.push(image.load(gltf, additionalFiles));
    }
    return Promise.all(imagePromises);
  }

  //   static getBuffers(appendix: any) {
  //     return gltfLoader.getTypedAppendix(appendix, ArrayBuffer);
  //   }

  //   static getAdditionalFiles(appendix: any) {
  //     if (typeof File !== "undefined") {
  //       return gltfLoader.getTypedAppendix(appendix, File);
  //     } else {
  //       return;
  //     }
  //   }

  //   static getTypedAppendix(appendix: any, Type: any) {
  //     if (appendix && appendix.length > 0) {
  //       if (appendix[0] instanceof Type) {
  //         return appendix;
  //       }
  //     }
  //   }
}

export { gltfLoader };
