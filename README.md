Use webpack development mode for better debugging. Weird things in production mode: i, S instead of class name, breakpoints not hit all the time.

Need at least #version 310 es to use glslang

Existing shaders in Khronos are NOT compatible with WebGPU. To make it work, we need to add layout and non-opaque uniforms.

Assumptions:

1. positions and normals always have GPUVertexFormat set to float32x3

Bind points:

set=0, binding=0: VertexUniforms in primitive.vert
set=0, binding=1: LightUniforms in punctual.glsl

The Map object holds key-value pairs and remembers the original insertion order of the keys.

Whenever there is a new gltf file, see the raw gltf json first to see what top-level properties do we need to support, and add them to glTF class.

localhost/:1

       Number of entries (3) did not match the number of entries (1) specified in [BindGroupLayout]

- While validating [BindGroupDescriptor] against [BindGroupLayout]
- While calling [Device].CreateBindGroup([BindGroupDescriptor]).

This error is because we didn't use uniform variables in the main() functions
