import { GltfObject } from "./glTF.js";
import { glTF } from "./glTF.js";

class gltfImage extends GltfObject {
  uri: string;
  image: any;
  constructor(uri: string) {
    super();
    this.uri = uri;
    this.image = undefined;
  }

  async load() {
    if (this.image !== undefined) {
      return;
    }

    const img = document.createElement("img");
    img.src =
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxTextured/glTF/CesiumLogoFlat.png";
    await img.decode();
    this.image = await createImageBitmap(img);

    return;
  }
}

export { gltfImage };
