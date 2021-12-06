import { GltfObject } from "./GltfObject";
import { glTF } from "./glTF";

class gltfAccessor extends GltfObject {
  // supported accessor's key words
  bufferView: number | undefined;
  byteOffset: number;
  componentType: number | undefined; // accessor contains this type of elements
  count: number | undefined;
  max: number[] | undefined;
  min: number[] | undefined;
  type: string | undefined; // accessor contains this kind of element (VEC3, SCALAR, etc. )

  // non gltf
  gpuBuffer: GPUBuffer | undefined; // each accessor holds the GPUBuffer that contains the data
  typedView: any; // provides a view to the accessor data in form of a typed array

  // for debugging
  name: string | undefined;

  constructor() {
    super();
    this.bufferView = undefined;
    this.byteOffset = 0;
    this.componentType = undefined;
    this.count = undefined;
    this.type = undefined;
    this.max = undefined;
    this.min = undefined;
    this.name = undefined;

    // non gltf
    this.gpuBuffer = undefined;
    this.typedView = undefined;
  }

  getTypedView(gltf: glTF) {
    if (this.typedView !== undefined) {
      return this.typedView;
    }

    if (this.bufferView !== undefined) {
      const bufferView = gltf.bufferViews[this.bufferView];
      const buffer = gltf.buffers[bufferView.buffer!];
      const byteOffset = this.byteOffset + bufferView.byteOffset;

      const componentSize = this.getComponentSize(this.componentType);
      let componentCount = this.getComponentCount(this.type);

      let arrayLength = 0;
      if (bufferView.byteStride !== 0) {
        if (componentSize !== 0) {
          arrayLength =
            (bufferView.byteStride / componentSize) * (this.count! - 1) +
            componentCount!;
        } else {
          console.warn(
            "Invalid component type in accessor '" +
              (this.name ? this.name : "") +
              "'"
          );
        }
      } else {
        arrayLength = this.count! * componentCount!;
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
    }

    return this.typedView;
  }

  getComponentCount(type: string | undefined) {
    return ComponentCount.get(type!);
  }

  getComponentSize(componentType: number | undefined) {
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
}

const ComponentCount = new Map([
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
