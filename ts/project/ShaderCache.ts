import { stringHash } from "./gltf/utils";
import { gltfShader } from "./gltfShader";
import { gltfWebGPU } from "./gltfWebGPU";

// This class generates and caches the shader source text for a given permutation
class ShaderCache {
  sources: Map<string, string>; // shader name -> source code
  shaders: any; // name & permutations hashed -> compiled shader
  programs: any; // (vertex shader, fragment shader) -> program
  gl: gltfWebGPU;

  /**
   * Update the original shader source map with #includes<> substituted with actual code
   * @param sources a map of shader name -> source code
   * @param gl the instance of gltfWebGPU
   */
  constructor(sources: Map<string, string>, gl: gltfWebGPU) {
    this.sources = sources;
    this.shaders = new Map();
    this.programs = new Map();
    this.gl = gl;

    // resovle / expande sources
    for (let [key, src] of this.sources) {
      let changed = false;
      for (let [includeName, includeSource] of this.sources) {
        const pattern = "#include <" + includeName + ">";

        if (src.includes(pattern)) {
          // only replace the first occurance
          src = src.replace(pattern, includeSource);

          // remove the others
          while (src.includes(pattern)) {
            src = src.replace(pattern, "");
          }

          changed = true;
        }
      }

      if (changed) {
        this.sources.set(key, src);
      }
    }
  }

  // example args: "pbr.vert", ["NORMALS", "TANGENTS"]
  selectShader(shaderIdentifier: any, permutationDefines: any) {
    // first check shaders for the exact permutation
    // if not present, check sources and compile it
    // if not present, return null object

    const src = this.sources.get(shaderIdentifier);
    if (src === undefined) {
      console.log("Shader source for " + shaderIdentifier + " not found");
      return null;
    }

    const isVert = shaderIdentifier.endsWith(".vert");
    let hash = stringHash(shaderIdentifier);

    // console.log(shaderIdentifier);

    // generate all #define
    let defines = "#version 300 es\n";
    for (let define of permutationDefines) {
      // console.log(define);
      hash ^= stringHash(define);
      defines += "#define " + define + "\n";
    }

    let shader = this.shaders.get(hash);

    if (shader === undefined) {
      // console.log(defines);
      // compile this variant
      shader = this.gl.compileShader(shaderIdentifier, isVert, defines + src);
      this.shaders.set(hash, shader);
    }

    return hash;
  }

  getShaderProgram(vertexShaderHash: any, fragmentShaderHash: any) {
    // just use a long string for this (the javascript engine should be fast enough with comparing this)
    const hash = String(vertexShaderHash) + "," + String(fragmentShaderHash);

    let program = this.programs.get(hash);

    if (program) {
      // program already linked
      return program;
    } // link this shader program type!
    else {
      let linkedProg = this.gl.linkProgram(
        this.shaders.get(vertexShaderHash),
        this.shaders.get(fragmentShaderHash)
      );
      if (linkedProg) {
        let program = new gltfShader(linkedProg, hash, this.gl);
        this.programs.set(hash, program);
        return program;
      }
    }

    return undefined;
  }
}

export { ShaderCache };
