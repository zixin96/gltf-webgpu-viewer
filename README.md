Use webpack development mode for better debugging. Weird things in production mode: i, S instead of class name, breakpoints not hit all the time.

Need at least #version 310 es to use glslang

Existing shaders in Khronos are NOT compatible with WebGPU. To make it work, we need to add layout and non-opaque uniforms.
