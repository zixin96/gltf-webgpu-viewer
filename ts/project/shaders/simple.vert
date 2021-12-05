#version 310 es

layout(set=0, binding=0) uniform VertexUniforms {
    mat4 u_ViewProjectionMatrix;
    mat4 u_ModelMatrix;               
    mat4 u_NormalMatrix;
};

layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;

layout(location=0) out vec3 v_Position;
layout(location=1) out vec3 v_Normal;

vec4 getPosition()
{
    vec4 pos = vec4(a_position, 1.0);
    return pos;
}

vec3 getNormal()
{
    vec3 normal = a_normal;
    return normalize(normal);
}

void main()
{
    vec4 pos = u_ModelMatrix * getPosition();
    v_Position = vec3(pos.xyz) / pos.w;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(getNormal(), 0.0)));
    gl_Position = u_ViewProjectionMatrix * pos;
}
