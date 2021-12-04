layout(set=0, binding=0) uniform VertexUniforms {
    mat4 u_ViewProjectionMatrix;
    mat4 u_ModelMatrix;
    mat4 u_NormalMatrix;
};

in vec3 a_position;
in vec3 a_normal;

out vec3 v_Position;
out vec3 v_Normal;
out vec2 v_texcoord_0;
out vec2 v_texcoord_1;

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
    gl_PointSize = 1.0f;
    vec4 pos = u_ModelMatrix * getPosition();
    v_Position = vec3(pos.xyz) / pos.w;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(getNormal(), 0.0)));
    v_texcoord_0 = vec2(0.0, 0.0);
    v_texcoord_1 = vec2(0.0, 0.0);
    gl_Position = u_ViewProjectionMatrix * pos;
}
