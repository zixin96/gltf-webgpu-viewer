import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU";
// ! change THIS! temp solution
const GL = {
  BYTE: 0,
  UNSIGNED_BYTE: 0,

  SHORT: 0,
  UNSIGNED_SHORT: 0,

  UNSIGNED_INT: 0,
  FLOAT: 0,
};
class gltfAccessor extends GltfObject {
  bufferView: any;
  byteOffset: any;
  componentType: any;
  normalized: any;
  count: any;
  type: any;
  max: any;
  min: any;
  sparse: any;
  name: any;

  // non gltf
  glBuffer: any;
  typedView: any;
  filteredView: any;
  normalizedFilteredView: any;
  normalizedTypedView: any;

  constructor() {
    super();
    this.bufferView = undefined;
    this.byteOffset = 0;
    this.componentType = undefined;
    this.normalized = false;
    this.count = undefined;
    this.type = undefined;
    this.max = undefined;
    this.min = undefined;
    this.sparse = undefined;
    this.name = undefined;

    // non gltf
    this.glBuffer = undefined;
    this.typedView = undefined;
    this.filteredView = undefined;
    this.normalizedFilteredView = undefined;
    this.normalizedTypedView = undefined;
  }

  /**
   * getTypedView provides a view to the accessors data in form of
   * a TypedArray
   * This data can directly be passed to vertexAttribPointer (webGPU is different)
   * @param gltf
   * @returns a typed array of indices/vertices/... data
   */
  getTypedView(gltf: any) {
    if (this.typedView !== undefined) {
      return this.typedView;
    }

    if (this.bufferView !== undefined) {
      const bufferView = gltf.bufferViews[this.bufferView];
      const buffer = gltf.buffers[bufferView.buffer];
      const byteOffset = this.byteOffset + bufferView.byteOffset;

      const componentSize = this.getComponentSize(this.componentType);
      let componentCount = this.getComponentCount(this.type);

      let arrayLength = 0;
      if (bufferView.byteStride !== 0) {
        if (componentSize !== 0) {
          arrayLength =
            (bufferView.byteStride / componentSize) * (this.count - 1) +
            componentCount!;
        } else {
          console.warn(
            "Invalid component type in accessor '" +
              (this.name ? this.name : "") +
              "'"
          );
        }
      } else {
        arrayLength = this.count * componentCount!;
      }

      if (arrayLength * componentSize > buffer.buffer.byteLength - byteOffset) {
        arrayLength = (buffer.buffer.byteLength - byteOffset) / componentSize;
        console.warn(
          "Count in accessor '" +
            (this.name ? this.name : "") +
            "' is too large."
        );
      }

      // ! figure out what GL is
      // switch (this.componentType) {
      //   case GL.BYTE:
      //     this.typedView = new Int8Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      //   case GL.UNSIGNED_BYTE:
      //     this.typedView = new Uint8Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      //   case GL.SHORT:
      //     this.typedView = new Int16Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      //   case GL.UNSIGNED_SHORT:
      //     this.typedView = new Uint16Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      //   case GL.UNSIGNED_INT:
      //     this.typedView = new Uint32Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      //   case GL.FLOAT:
      //     this.typedView = new Float32Array(
      //       buffer.buffer,
      //       byteOffset,
      //       arrayLength
      //     );
      //     break;
      // }
    }

    if (this.typedView === undefined) {
      console.warn(
        "Failed to convert buffer view to typed view!: " + this.bufferView
      );
    } else if (this.sparse !== undefined) {
      // this.applySparse(gltf, this.typedView);
    }

    return this.typedView;
  }

  /**
   * getNormalizedTypedView provides an alternative view to the accessors data,
   * where quantized data is already normalized. This is useful if the data is not passed
   * to vertexAttribPointer but used immediately (like e.g. animations)
   * @param gltf
   * @returns
   */
  getNormalizedTypedView(gltf: any) {
    if (this.normalizedTypedView !== undefined) {
      return this.normalizedTypedView;
    }

    const typedView = this.getTypedView(gltf);
    this.normalizedTypedView = this.normalized
      ? gltfAccessor.dequantize(typedView, this.componentType)
      : typedView;
    return this.normalizedTypedView;
  }

  getComponentCount(type: any) {
    return CompononentCount.get(type);
  }

  getComponentSize(componentType: any) {
    // GL.FLOAT === 5126 === FLOAT in glTF files
    switch (componentType) {
      case GL.BYTE:
      case GL.UNSIGNED_BYTE:
        return 1;
      case GL.SHORT:
      case GL.UNSIGNED_SHORT:
        return 2;
      case GL.UNSIGNED_INT:
      case GL.FLOAT:
        return 4;
      default:
        return 0;
    }
  }

  // ! Will NOT get executed in box
  static dequantize(typedArray: any, componentType: any) {
    switch (componentType) {
      case GL.BYTE:
        return new Float32Array(typedArray).map((c) =>
          Math.max(c / 127.0, -1.0)
        );
      case GL.UNSIGNED_BYTE:
        return new Float32Array(typedArray).map((c) => c / 255.0);
      case GL.SHORT:
        return new Float32Array(typedArray).map((c) =>
          Math.max(c / 32767.0, -1.0)
        );
      case GL.UNSIGNED_SHORT:
        return new Float32Array(typedArray).map((c) => c / 65535.0);
      default:
        return typedArray;
    }
  }
}

const CompononentCount = new Map([
  ["SCALAR", 1],
  ["VEC2", 2],
  ["VEC3", 3],
  ["VEC4", 4],
  ["MAT2", 4],
  ["MAT3", 9],
  ["MAT4", 16],
]);

export { gltfAccessor };
