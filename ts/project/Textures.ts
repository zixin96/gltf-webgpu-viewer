import { Texture, TextureInfo } from "@gltf-transform/core";

const textureInfoMap = new Map();
textureInfoMap.set(9728, "nearest");
textureInfoMap.set(9729, "linear");

// MIPMAP_LINEAR
textureInfoMap.set(9986, "linear");
textureInfoMap.set(9987, "linear");

// MIPMAP_NEAREST
textureInfoMap.set(9984, "nearest");
textureInfoMap.set(9985, "nearest");

textureInfoMap.set(33071, "clamp-to-edge");
textureInfoMap.set(10497, "repeat");
textureInfoMap.set(33648, "mirror-repeat");

export class Textures {
  public static uLength = 1;
  public static vLength = 1;

  public static async CreateTexture(
    device: GPUDevice,
    textureObj: Texture,
    textureInfo: TextureInfo
  ) {
    let rawImageArray = new Uint8ClampedArray(
      textureObj.getImage() as ArrayBuffer
    );
    let blob = new Blob([rawImageArray], { type: textureObj.getMimeType() });
    let urlCreator = window.URL || window.webkitURL;
    let imageUrl = urlCreator.createObjectURL(blob);
    const img = document.createElement("img");
    img.src = imageUrl;
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    //sampler and texture
    const sampler = device.createSampler({
      minFilter: textureInfoMap.get(textureInfo.getMinFilter()),
      magFilter: textureInfoMap.get(textureInfo.getMagFilter()),
      mipmapFilter: textureInfoMap.get(textureInfo.getMinFilter()), // MIPMAP only makes sense for min filter
      addressModeU: textureInfoMap.get(textureInfo.getWrapS()),
      addressModeV: textureInfoMap.get(textureInfo.getWrapT()),
    });

    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );

    return {
      texture,
      sampler,
    };
  }
}
