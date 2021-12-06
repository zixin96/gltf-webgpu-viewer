import { glTF } from "./glTF";

class gltfLoader {
  static async load(gltf: glTF, device: GPUDevice) {
    const buffersPromise = gltfLoader.loadBuffers(gltf);
    await buffersPromise;
    return await Promise.all([buffersPromise]).then(() => gltf.initGl(device));
  }

  static loadBuffers(gltf: glTF) {
    const promises = [];

    for (const buffer of gltf.buffers) {
      promises.push(buffer.load());
    }

    return Promise.all(promises);
  }
}

export { gltfLoader };
