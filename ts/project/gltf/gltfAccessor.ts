import { GltfObject } from "./GltfObject";

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

      switch (this.componentType) {
        case AccessorDataType.BYTE:
          this.typedView = new Int8Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
        case AccessorDataType.UNSIGNED_BYTE:
          this.typedView = new Uint8Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
        case AccessorDataType.SHORT:
          this.typedView = new Int16Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
        case AccessorDataType.UNSIGNED_SHORT:
          this.typedView = new Uint16Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
        case AccessorDataType.UNSIGNED_INT:
          this.typedView = new Uint32Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
        case AccessorDataType.FLOAT:
          this.typedView = new Float32Array(
            buffer.buffer,
            byteOffset,
            arrayLength
          );
          break;
      }
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
    switch (componentType) {
      case AccessorDataType.BYTE:
      case AccessorDataType.UNSIGNED_BYTE:
        return 1;
      case AccessorDataType.SHORT:
      case AccessorDataType.UNSIGNED_SHORT:
        return 2;
      case AccessorDataType.UNSIGNED_INT:
      case AccessorDataType.FLOAT:
        return 4;
      default:
        return 0;
    }
  }

  // ! Will NOT get executed in box
  static dequantize(typedArray: any, componentType: any) {
    switch (componentType) {
      case AccessorDataType.BYTE:
        return new Float32Array(typedArray).map((c) =>
          Math.max(c / 127.0, -1.0)
        );
      case AccessorDataType.UNSIGNED_BYTE:
        return new Float32Array(typedArray).map((c) => c / 255.0);
      case AccessorDataType.SHORT:
        return new Float32Array(typedArray).map((c) =>
          Math.max(c / 32767.0, -1.0)
        );
      case AccessorDataType.UNSIGNED_SHORT:
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

// https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html
// 3.6.2.2. Accessor Data Types
const AccessorDataType = {
  BYTE: 5120,
  UNSIGNED_BYTE: 5121,
  SHORT: 5122,
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
};

export { gltfAccessor };
