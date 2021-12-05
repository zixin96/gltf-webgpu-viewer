#version 310 es

layout(set=0, binding=0) uniform VertexUniforms {
    mat4 u_ViewProjectionMatrix;
    mat4 u_ModelMatrix;               
    mat4 u_NormalMatrix;
};

layout(location=0) in vec4 a_position;
layout(location=1) in vec4 a_normal;

layout(location=0) out vec4 v_Position;
layout(location=1) out vec4 v_Normal;

void main() {
    vec4 mPosition = u_ModelMatrix * a_position;
    v_Position = mPosition;                
    v_Normal = u_NormalMatrix * a_normal;  
    gl_Position = u_ViewProjectionMatrix * mPosition;   
}