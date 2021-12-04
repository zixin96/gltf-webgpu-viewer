import { UniformStruct } from "./gltf/utils";

// ! gltfShader may not be a proper name
// ! could be gltfShaderProgram
class gltfShader {
  // ! should this be pipeline?
  program: any;
  hash: any;
  uniforms: any;
  attributes: any;
  unknownAttributes: any;
  unknownUniforms: any;
  gl: any;

  constructor(program: any, hash: any, gl: any) {
    this.program = program;
    this.hash = hash;
    this.uniforms = new Map();
    this.attributes = new Map();
    this.unknownAttributes = [];
    this.unknownUniforms = [];
    this.gl = gl;

    if (this.program !== undefined) {
      // const uniformCount = this.gl.context.getProgramParameter(
      //   this.program,
      //   GL.ACTIVE_UNIFORMS
      // );
      // for (let i = 0; i < uniformCount; ++i) {
      //   const info = this.gl.context.getActiveUniform(this.program, i);
      //   const loc = this.gl.context.getUniformLocation(this.program, info.name);
      //   this.uniforms.set(info.name, { type: info.type, loc: loc });
      // }
      // const attribCount = this.gl.context.getProgramParameter(
      //   this.program,
      //   GL.ACTIVE_ATTRIBUTES
      // );
      // for (let i = 0; i < attribCount; ++i) {
      //   const info = this.gl.context.getActiveAttrib(this.program, i);
      //   const loc = this.gl.context.getAttribLocation(this.program, info.name);
      //   this.attributes.set(info.name, loc);
      // }
      // ! don't know how to get active uniforms and attributes
      // ! maybe hardcoded temporarily
      this.uniforms.set("Placeholder", { type: "Placeholder", loc: 9999 });
      this.attributes.set("Placeholder", 9999);
    }
  }

  getAttributeLocation(name: any) {
    const loc = this.attributes.get(name);
    if (loc === undefined) {
      if (this.unknownAttributes.find((n: any) => n === name) === undefined) {
        console.log("Attribute '%s' does not exist", name);
        this.unknownAttributes.push(name);
      }
      return -1;
    }
    return loc;
  }

  getUniformLocation(name: any) {
    const uniform = this.uniforms.get(name);
    if (uniform === undefined) {
      if (this.unknownUniforms.find((n: any) => n === name) === undefined) {
        this.unknownUniforms.push(name);
      }
      return -1;
    }
    return uniform.loc;
  }

  updateUniform(objectName: any, object: any, log = false) {
    if (object instanceof UniformStruct) {
      // this.updateUniformStruct(objectName, object, log);
    } else if (Array.isArray(object)) {
      // this.updateUniformArray(objectName, object, log);
    } else {
      this.updateUniformValue(objectName, object, log);
    }
  }
  // upload the values of a uniform with the given name using type resolve to get correct function call
  updateUniformValue(uniformName: any, value: any, log: any) {
    const uniform = this.uniforms.get(uniformName);

    if (uniform !== undefined) {
      //   switch (uniform.type) {
      //     case GL.FLOAT: {
      //       if (Array.isArray(value) || value instanceof Float32Array) {
      //         this.gl.context.uniform1fv(uniform.loc, value);
      //       } else {
      //         this.gl.context.uniform1f(uniform.loc, value);
      //       }
      //       break;
      //     }
      //     case GL.FLOAT_VEC2:
      //       this.gl.context.uniform2fv(uniform.loc, value);
      //       break;
      //     case GL.FLOAT_VEC3:
      //       this.gl.context.uniform3fv(uniform.loc, value);
      //       break;
      //     case GL.FLOAT_VEC4:
      //       this.gl.context.uniform4fv(uniform.loc, value);
      //       break;
      //     case GL.INT: {
      //       if (
      //         Array.isArray(value) ||
      //         value instanceof Uint32Array ||
      //         value instanceof Int32Array
      //       ) {
      //         this.gl.context.uniform1iv(uniform.loc, value);
      //       } else {
      //         this.gl.context.uniform1i(uniform.loc, value);
      //       }
      //       break;
      //     }
      //     case GL.INT_VEC2:
      //       this.gl.context.uniform2iv(uniform.loc, value);
      //       break;
      //     case GL.INT_VEC3:
      //       this.gl.context.uniform3iv(uniform.loc, value);
      //       break;
      //     case GL.INT_VEC4:
      //       this.gl.context.uniform4iv(uniform.loc, value);
      //       break;
      //     case GL.FLOAT_MAT2:
      //       this.gl.context.uniformMatrix2fv(uniform.loc, false, value);
      //       break;
      //     case GL.FLOAT_MAT3:
      //       this.gl.context.uniformMatrix3fv(uniform.loc, false, value);
      //       break;
      //     case GL.FLOAT_MAT4:
      //       this.gl.context.uniformMatrix4fv(uniform.loc, false, value);
      //       break;
      //   }
    } else if (log) {
      console.warn("Unkown uniform: " + uniformName);
    }
  }
}

export { gltfShader };
