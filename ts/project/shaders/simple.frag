#version 310 es
precision highp float;

layout(location = 0) in vec4 v_Position;
layout(location = 1) in vec4 v_Normal;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}