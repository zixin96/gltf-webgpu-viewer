import { GltfObject } from "./GltfObject";
// import { GL } from "../gltfWebGPU";
import { initGlForMembers } from "./utils";

class gltfPrimitive extends GltfObject {
  attributes: any;
  targets: any;
  indices: any;
  material: any;
  mode: any;

  // non gltf
  glAttributes: any;
  morphTargetTextureInfo: any;
  // defines contain an array of "HAS_NORMAL_VEC3 1" if having normal as vec3, etc.
  // will be useful in shader
  defines: any;
  skip: any;
  hasWeights: any;
  hasJoints: any;
  hasNormals: any;
  hasTangents: any;
  hasTexcoord: any;
  hasColor: any;

  // The primitive centroid is used for depth sorting.
  centroid: any;

  constructor() {
    super();
    this.attributes = [];
    this.targets = [];
    this.indices = undefined;
    this.material = undefined;
    // this.mode = GL.TRIANGLES;
    this.mode = undefined; // ! figure out what GL is

    // non gltf
    this.glAttributes = [];
    this.morphTargetTextureInfo = undefined;
    this.defines = [];
    this.skip = true;
    this.hasWeights = false;
    this.hasJoints = false;
    this.hasNormals = false;
    this.hasTangents = false;
    this.hasTexcoord = false;
    this.hasColor = false;

    // The primitive centroid is used for depth sorting.
    this.centroid = undefined;
  }

  fromJson(jsonPrimitive: any) {
    super.fromJson(jsonPrimitive);

    if (jsonPrimitive.extensions !== undefined) {
      // this.fromJsonPrimitiveExtensions(jsonPrimitive.extensions);
    }
  }

  initGl(gltf: any, webGPUContext: any) {
    // Use the default glTF material.
    if (this.material === undefined) {
      this.material = gltf.materials.length - 1;
    }

    initGlForMembers(this, gltf, webGPUContext);

    // ! in webGPU: this.device.limits.maxVertexAttributes
    // const maxAttributes = webGPUContext.getParameter(GL.MAX_VERTEX_ATTRIBS);
    const maxAttributes = 18; // ! temp placeholder here. figure out what GL is

    // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes

    if (this.extensions !== undefined) {
      //   if (this.extensions.KHR_draco_mesh_compression !== undefined) {
      //     const dracoDecoder = new DracoDecoder();
      //     if (dracoDecoder !== undefined && Object.isFrozen(dracoDecoder)) {
      //       let dracoGeometry = this.decodeDracoBufferToIntermediate(
      //         this.extensions.KHR_draco_mesh_compression,
      //         gltf
      //       );
      //       this.copyDataFromDecodedGeometry(
      //         gltf,
      //         dracoGeometry,
      //         this.attributes
      //       );
      //     } else {
      //       console.warn(
      //         "Failed to load draco compressed mesh: DracoDecoder not initialized"
      //       );
      //     }
      //   }
    }

    // VERTEX ATTRIBUTES
    for (const attribute of Object.keys(this.attributes)) {
      if (this.glAttributes.length >= maxAttributes) {
        console.error(
          "To many vertex attributes for this primitive, skipping " + attribute
        );
        break;
      }

      const idx = this.attributes[attribute];
      this.glAttributes.push({
        attribute: attribute,
        name: "a_" + attribute.toLowerCase(),
        accessor: idx,
      });
      this.defines.push(`HAS_${attribute}_${gltf.accessors[idx].type} 1`);
      switch (attribute) {
        case "POSITION":
          this.skip = false;
          break;
        case "NORMAL":
          this.hasNormals = true;
          break;
        case "TANGENT":
          this.hasTangents = true;
          break;
        case "TEXCOORD_0":
          this.hasTexcoord = true;
          break;
        case "TEXCOORD_1":
          this.hasTexcoord = true;
          break;
        case "COLOR_0":
          this.hasColor = true;
          break;
        case "JOINTS_0":
          this.hasJoints = true;
          break;
        case "WEIGHTS_0":
          this.hasWeights = true;
          break;
        case "JOINTS_1":
          this.hasJoints = true;
          break;
        case "WEIGHTS_1":
          this.hasWeights = true;
          break;
        default:
          console.log("Unknown attribute: " + attribute);
      }
    }

    // MORPH TARGETS
    // ! N/A to boxes
    if (this.targets !== undefined && this.targets.length > 0) {
      //   const max2DTextureSize = Math.pow(
      //     webGPUContext.getParameter(GL.MAX_TEXTURE_SIZE),
      //     2
      //   );
      //   const maxTextureArraySize = webGPUContext.getParameter(
      //     GL.MAX_ARRAY_TEXTURE_LAYERS
      //   );
      //   // Check which attributes are affected by morph targets and
      //   // define offsets for the attributes in the morph target texture.
      //   const attributeOffsets = {};
      //   let attributeOffset = 0;
      //   // Gather used attributes from all targets (some targets might
      //   // use more attributes than others)
      //   const attributes = Array.from(
      //     this.targets.reduce((acc, target) => {
      //       Object.keys(target).map((val) => acc.add(val));
      //       return acc;
      //     }, new Set())
      //   );
      //   const vertexCount = gltf.accessors[this.attributes[attributes[0]]].count;
      //   this.defines.push(`NUM_VERTICIES ${vertexCount}`);
      //   let targetCount = this.targets.length;
      //   if (targetCount * attributes.length > maxTextureArraySize) {
      //     targetCount = Math.floor(maxTextureArraySize / attributes.length);
      //     console.warn(
      //       `Morph targets exceed texture size limit. Only ${targetCount} of ${this.targets.length} are used.`
      //     );
      //   }
      //   for (const attribute of attributes) {
      //     // Add morph target defines
      //     this.defines.push(`HAS_MORPH_TARGET_${attribute} 1`);
      //     this.defines.push(
      //       `MORPH_TARGET_${attribute}_OFFSET ${attributeOffset}`
      //     );
      //     // Store the attribute offset so that later the
      //     // morph target texture can be assembled.
      //     attributeOffsets[attribute] = attributeOffset;
      //     attributeOffset += targetCount;
      //   }
      //   this.defines.push("HAS_MORPH_TARGETS 1");
      //   if (vertexCount <= max2DTextureSize) {
      //     // Allocate the texture buffer. Note that all target attributes must be vec3 types and
      //     // all must have the same vertex count as the primitives other attributes.
      //     const width = Math.ceil(Math.sqrt(vertexCount));
      //     const singleTextureSize = Math.pow(width, 2) * 4;
      //     const morphTargetTextureArray = new Float32Array(
      //       singleTextureSize * targetCount * attributes.length
      //     );
      //     // Now assemble the texture from the accessors.
      //     for (let i = 0; i < targetCount; ++i) {
      //       let target = this.targets[i];
      //       for (let [attributeName, offsetRef] of Object.entries(
      //         attributeOffsets
      //       )) {
      //         if (target[attributeName] != undefined) {
      //           const accessor = gltf.accessors[target[attributeName]];
      //           const offset = offsetRef * singleTextureSize;
      //           if (
      //             accessor.componentType != GL.FLOAT &&
      //             accessor.normalized == false
      //           ) {
      //             console.warn("Unsupported component type for morph targets");
      //             attributeOffsets[attributeName] = offsetRef + 1;
      //             continue;
      //           }
      //           const data = accessor.getNormalizedDeinterlacedView(gltf);
      //           switch (accessor.type) {
      //             case "VEC2":
      //             case "VEC3": {
      //               // Add padding to fit vec2/vec3 into rgba
      //               let paddingOffset = 0;
      //               let accessorOffset = 0;
      //               const componentCount = accessor.getComponentCount(
      //                 accessor.type
      //               );
      //               for (let j = 0; j < accessor.count; ++j) {
      //                 morphTargetTextureArray.set(
      //                   data.subarray(
      //                     accessorOffset,
      //                     accessorOffset + componentCount
      //                   ),
      //                   offset + paddingOffset
      //                 );
      //                 paddingOffset += 4;
      //                 accessorOffset += componentCount;
      //               }
      //               break;
      //             }
      //             case "VEC4":
      //               morphTargetTextureArray.set(data, offset);
      //               break;
      //             default:
      //               console.warn("Unsupported attribute type for morph targets");
      //               break;
      //           }
      //         }
      //         attributeOffsets[attributeName] = offsetRef + 1;
      //       }
      //     }
      //     // Add the morph target texture.
      //     // We have to create a WebGL2 texture as the format of the
      //     // morph target texture has to be explicitly specified
      //     // (gltf image would assume uint8).
      //     let texture = webGPUContext.createTexture();
      //     webGPUContext.bindTexture(webGPUContext.TEXTURE_2D_ARRAY, texture);
      //     // Set texture format and upload data.
      //     let internalFormat = webGPUContext.RGBA32F;
      //     let format = webGPUContext.RGBA;
      //     let type = webGPUContext.FLOAT;
      //     let data = morphTargetTextureArray;
      //     webGPUContext.texImage3D(
      //       webGPUContext.TEXTURE_2D_ARRAY,
      //       0, //level
      //       internalFormat,
      //       width,
      //       width,
      //       targetCount * attributes.length, //Layer count
      //       0, //border
      //       format,
      //       type,
      //       data
      //     );
      //     // Ensure mipmapping is disabled and the sampler is configured correctly.
      //     webGPUContext.texParameteri(
      //       GL.TEXTURE_2D_ARRAY,
      //       GL.TEXTURE_WRAP_S,
      //       GL.CLAMP_TO_EDGE
      //     );
      //     webGPUContext.texParameteri(
      //       GL.TEXTURE_2D_ARRAY,
      //       GL.TEXTURE_WRAP_T,
      //       GL.CLAMP_TO_EDGE
      //     );
      //     webGPUContext.texParameteri(
      //       GL.TEXTURE_2D_ARRAY,
      //       GL.TEXTURE_MIN_FILTER,
      //       GL.NEAREST
      //     );
      //     webGPUContext.texParameteri(
      //       GL.TEXTURE_2D_ARRAY,
      //       GL.TEXTURE_MAG_FILTER,
      //       GL.NEAREST
      //     );
      //     // Now we add the morph target texture as a gltf texture info resource, so that
      //     // we can just call webGl.setTexture(..., gltfTextureInfo, ...) in the renderer.
      //     const morphTargetImage = new gltfImage(
      //       undefined, // uri
      //       GL.TEXTURE_2D_ARRAY, // type
      //       0, // mip level
      //       undefined, // buffer view
      //       undefined, // name
      //       ImageMimeType.GLTEXTURE, // mimeType
      //       texture // image
      //     );
      //     gltf.images.push(morphTargetImage);
      //     gltf.samplers.push(
      //       new gltfSampler(
      //         GL.NEAREST,
      //         GL.NEAREST,
      //         GL.CLAMP_TO_EDGE,
      //         GL.CLAMP_TO_EDGE,
      //         undefined
      //       )
      //     );
      //     const morphTargetTexture = new gltfTexture(
      //       gltf.samplers.length - 1,
      //       gltf.images.length - 1,
      //       GL.TEXTURE_2D_ARRAY
      //     );
      //     // The webgl texture is already initialized -> this flag informs
      //     // webgl.setTexture about this.
      //     morphTargetTexture.initialized = true;
      //     gltf.textures.push(morphTargetTexture);
      //     this.morphTargetTextureInfo = new gltfTextureInfo(
      //       gltf.textures.length - 1,
      //       0,
      //       true
      //     );
      //     this.morphTargetTextureInfo.samplerName = "u_MorphTargetsSampler";
      //     this.morphTargetTextureInfo.generateMips = false;
      //   } else {
      //     console.warn("Mesh of Morph targets too big. Cannot apply morphing.");
      //   }
    }

    // ! centroid = (0, 0, 0) for box
    this.computeCentroid(gltf);
  }

  computeCentroid(gltf: any) {
    const positionsAccessor = gltf.accessors[this.attributes.POSITION];
    const positions = positionsAccessor.getNormalizedTypedView(gltf);

    if (this.indices !== undefined) {
      // Primitive has indices.

      const indicesAccessor = gltf.accessors[this.indices];

      const indices = indicesAccessor.getTypedView(gltf);

      const acc = new Float32Array(3);

      for (let i = 0; i < indices.length; i++) {
        const offset = 3 * indices[i];
        acc[0] += positions[offset];
        acc[1] += positions[offset + 1];
        acc[2] += positions[offset + 2];
      }

      const centroid = new Float32Array([
        acc[0] / indices.length,
        acc[1] / indices.length,
        acc[2] / indices.length,
      ]);

      this.centroid = centroid;
    } else {
      // Primitive does not have indices.

      const acc = new Float32Array(3);

      for (let i = 0; i < positions.length; i += 3) {
        acc[0] += positions[i];
        acc[1] += positions[i + 1];
        acc[2] += positions[i + 2];
      }

      const positionVectors = positions.length / 3;

      const centroid = new Float32Array([
        acc[0] / positionVectors,
        acc[1] / positionVectors,
        acc[2] / positionVectors,
      ]);

      this.centroid = centroid;
    }
  }

  getShaderIdentifier() {
    return "primitive.vert";
  }

  getDefines() {
    return this.defines;
  }
}

export { gltfPrimitive };
