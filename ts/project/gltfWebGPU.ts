// ! what should GL be in webGPU???
/*
let GL = {
  BYTE: 5120,
  BYTE: 5120,
  BYTE: 5120,
  BYTE: 5120,
  BYTE: 5120,
  BYTE: 5120,
  BYTE: 5120,
};
*/
class gltfWebGPU {
  context: GPUCanvasContext;

  // ⚙️ API Data Structures
  adapter!: GPUAdapter;
  device!: GPUDevice;
  queue!: GPUQueue;

  vertexBuffers: any;

  constructor(context: GPUCanvasContext) {
    this.context = context;
    // if (GL === undefined) {
    //   GL = context;
    // }
  }

  // ! Where to call this???
  async initializeAPI(): Promise<boolean> {
    try {
      // 🏭 Entry to WebGPU
      const entry: GPU = navigator.gpu;
      if (!entry) {
        return false;
      }

      // 🔌 Physical Device Adapter
      this.adapter = (await entry.requestAdapter()) as GPUAdapter;

      // 💻 Logical Device
      this.device = await this.adapter.requestDevice();

      // 📦 Queue
      this.queue = this.device.queue;
    } catch (e) {
      console.error(e);
      return false;
    }

    return true;
  }

  /**
   *
   * @param loc uniform texture location
   * @param gltf
   * @param textureInfo
   * @param texSlot
   * @returns
   */
  // setTexture(loc, gltf, textureInfo, texSlot) {
  //   if (loc === -1) {
  //     return false;
  //   }

  //   let gltfTex = gltf.textures[textureInfo.index];

  //   if (gltfTex === undefined) {
  //     console.warn("Texture is undefined: " + textureInfo.index);
  //     return false;
  //   }

  //   const image = gltf.images[gltfTex.source];
  //   if (image === undefined) {
  //     console.warn("Image is undefined for texture: " + gltfTex.source);
  //     return false;
  //   }

  //   if (gltfTex.glTexture === undefined) {
  //     if (
  //       image.mimeType === ImageMimeType.KTX2 ||
  //       image.mimeType === ImageMimeType.GLTEXTURE
  //     ) {
  //       // these image resources are directly loaded to a GPU resource by resource loader
  //       gltfTex.glTexture = image.image;
  //     } else {
  //       // other images will be uploaded in a later step
  //       gltfTex.glTexture = this.context.createTexture();
  //     }
  //   }

  //   this.context.activeTexture(GL.TEXTURE0 + texSlot);
  //   this.context.bindTexture(gltfTex.type, gltfTex.glTexture);

  //   this.context.uniform1i(loc, texSlot);

  //   if (!gltfTex.initialized) {
  //     const gltfSampler = gltf.samplers[gltfTex.sampler];

  //     if (gltfSampler === undefined) {
  //       console.warn("Sampler is undefined for texture: " + textureInfo.index);
  //       return false;
  //     }

  //     this.context.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false);

  //     // upload images that are not directly loaded as GPU resource
  //     if (
  //       image.mimeType === ImageMimeType.PNG ||
  //       image.mimeType === ImageMimeType.JPEG ||
  //       image.mimeType === ImageMimeType.HDR
  //     ) {
  //       // the check `GL.SRGB8_ALPHA8 === undefined` is needed as at the moment node-gles does not define the full format enum
  //       const internalformat =
  //         textureInfo.linear || GL.SRGB8_ALPHA8 === undefined
  //           ? GL.RGBA
  //           : GL.SRGB8_ALPHA8;
  //       this.context.texImage2D(
  //         image.type,
  //         image.miplevel,
  //         internalformat,
  //         GL.RGBA,
  //         GL.UNSIGNED_BYTE,
  //         image.image
  //       );
  //     }

  //     this.setSampler(gltfSampler, gltfTex.type, textureInfo.generateMips);

  //     if (textureInfo.generateMips) {
  //       switch (gltfSampler.minFilter) {
  //         case GL.NEAREST_MIPMAP_NEAREST:
  //         case GL.NEAREST_MIPMAP_LINEAR:
  //         case GL.LINEAR_MIPMAP_NEAREST:
  //         case GL.LINEAR_MIPMAP_LINEAR:
  //           this.context.generateMipmap(gltfTex.type);
  //           break;
  //         default:
  //           break;
  //       }
  //     }

  //     gltfTex.initialized = true;
  //   }

  //   return gltfTex.initialized;
  // }

  createWebGPUBuffer(arr: Float32Array | Uint16Array, usage: number) {
    // 📏 Align to 4 bytes
    let desc = {
      size: (arr.byteLength + 3) & ~3,
      usage,
      mappedAtCreation: true,
    };
    let buffer = this.device.createBuffer(desc);
    const writeArray =
      arr instanceof Uint16Array
        ? new Uint16Array(buffer.getMappedRange())
        : new Float32Array(buffer.getMappedRange());
    writeArray.set(arr);
    buffer.unmap();
    return buffer;
  }

  setIndices(gltf: any, accessorIndex: any) {
    let gltfAccessor = gltf.accessors[accessorIndex];

    if (gltfAccessor.glBuffer === undefined) {
      let data = gltfAccessor.getTypedView(gltf);
      if (data === undefined) {
        return false;
      }
      gltfAccessor.glBuffer = this.createWebGPUBuffer(
        data,
        GPUBufferUsage.INDEX
      );

      // this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
      // this.context.bufferData(GL.ELEMENT_ARRAY_BUFFER, data, GL.STATIC_DRAW);
    } else {
      // this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
    }

    return true;
  }

  enableAttribute(gltf: any, attributeLocation: any, gltfAccessor: any) {
    if (attributeLocation === -1) {
      console.warn("Tried to access unknown attribute");
      return false;
    }

    if (gltfAccessor.bufferView === undefined) {
      console.warn("Tried to access undefined bufferview");
      return true;
    }

    let gltfBufferView = gltf.bufferViews[gltfAccessor.bufferView];

    if (gltfAccessor.glBuffer === undefined) {
      let data = gltfAccessor.getTypedView(gltf);
      if (data === undefined) {
        return false;
      }
      gltfAccessor.glBuffer = this.createWebGPUBuffer(
        data,
        GPUBufferUsage.VERTEX
      );

      // this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
      // this.context.bufferData(GL.ARRAY_BUFFER, data, GL.STATIC_DRAW);
    } else {
      // this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
    }

    const attribDesc: GPUVertexAttribute = {
      shaderLocation: attributeLocation, // [[location(attributeLocation)]]
      offset: 0, // ! What should be the offset?
      format: "float32x3",
      // ! format probably needs to change based on gltfAccessor.getComponentCount(gltfAccessor.type) and gltfAccessor.componentType,
    };

    const bufferDesc: GPUVertexBufferLayout = {
      attributes: [attribDesc],
      arrayStride: gltfBufferView.byteStride,
      stepMode: "vertex",
    };

    this.vertexBuffers.push(bufferDesc);

    // ! bufferDesc needs to be passed into shader stages when we create GPUVertexState

    // this.context.vertexAttribPointer(
    //   attributeLocation,
    //   gltfAccessor.getComponentCount(gltfAccessor.type),
    //   gltfAccessor.componentType,
    //   gltfAccessor.normalized,
    //   gltfBufferView.byteStride,
    //   0
    // );
    // this.context.enableVertexAttribArray(attributeLocation);

    return true;
  }

  compileShader(shaderIdentifier: any, isVert: any, shaderSource: any) {
    // ! error checking is needed
    const shaderModuleDesc = {
      code: shaderSource,
    };
    const shaderModule = this.device.createShaderModule(shaderModuleDesc);
    if (isVert) {
      const vertex: GPUVertexState = {
        module: shaderModule,
        entryPoint: "main",
        buffers: this.vertexBuffers,
      };
      return vertex;
    } else {
      const colorState: GPUColorTargetState = {
        format: "bgra8unorm",
      };

      const fragment: GPUFragmentState = {
        module: shaderModule,
        entryPoint: "main",
        targets: [colorState],
      };
      return fragment;
    }
    // const shader = this.context.createShader(
    //   isVert ? GL.VERTEX_SHADER : GL.FRAGMENT_SHADER
    // );
    // this.context.shaderSource(shader, shaderSource);
    // this.context.compileShader(shader);
    // const compiled = this.context.getShaderParameter(shader, GL.COMPILE_STATUS);

    // if (!compiled) {
    // output surrounding source code
    // let info = "";
    // const messages = this.context.getShaderInfoLog(shader).split("\n");
    // for (const message of messages) {
    //   const matches = message.match(
    //     /(WARNING|ERROR): ([0-9]*):([0-9]*):(.*)/i
    //   );
    //   if (matches && matches.length == 5) {
    //     const lineNumber = parseInt(matches[3]) - 1;
    //     const lines = shaderSource.split("\n");
    //     info += `${matches[1]}: ${shaderIdentifier}+includes:${lineNumber}: ${matches[4]}`;
    //     for (
    //       let i = Math.max(0, lineNumber - 2);
    //       i < Math.min(lines.length, lineNumber + 3);
    //       i++
    //     ) {
    //       if (lineNumber === i) {
    //         info += "->";
    //       }
    //       info += "\t" + lines[i] + "\n";
    //     }
    //   } else {
    //     info += message + "\n";
    //   }
    // }
    // throw new Error(
    //   "Could not compile WebGL program '" + shaderIdentifier + "': " + info
    // );
    //   throw new Error("Could not compile WebGL program '" + shaderIdentifier);
    // }

    // return shader;
  }

  /**
   * Create pipeline
   * @param vertex
   * @param fragment
   * @returns
   * ! change name to createPipeline???
   */
  linkProgram(vertex: any, fragment: any) {
    // 🌑 Depth
    // ! consider move it elsewhere
    const depthStencil: GPUDepthStencilState = {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    };

    // 🦄 Uniform Data
    // ! consider move it elsewhere
    const pipelineLayoutDesc = { bindGroupLayouts: [] };
    const layout = this.device.createPipelineLayout(pipelineLayoutDesc);
    // 🟨 Rasterization
    const primitive: GPUPrimitiveState = {
      frontFace: "cw",
      cullMode: "none",
      topology: "triangle-list",
    };

    const pipelineDesc: GPURenderPipelineDescriptor = {
      layout,

      vertex,
      fragment,

      primitive,
      depthStencil,
    };
    return this.device.createRenderPipeline(pipelineDesc);
    // let program = this.context.createProgram();
    // this.context.attachShader(program, vertex);
    // this.context.attachShader(program, fragment);
    // this.context.linkProgram(program);
    // if (!this.context.getProgramParameter(program, GL.LINK_STATUS)) {
    //   var info = this.context.getProgramInfoLog(program);
    //   throw new Error("Could not link WebGL program. \n\n" + info);
    // }
    // return program;
  }
}

export { gltfWebGPU };
