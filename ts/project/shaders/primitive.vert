// change this each time we test a new model
#define GLSLIFY 1
#define GLSLIFY 1
#ifdef HAS_MORPH_TARGETS
uniform highp sampler2DArray u_MorphTargetsSampler;
#endif

#ifdef USE_MORPHING
uniform float u_morphWeights[WEIGHT_COUNT];
#endif

#ifdef HAS_JOINTS_0_VEC4
in vec4 a_joints_0;
#endif

#ifdef HAS_JOINTS_1_VEC4
in vec4 a_joints_1;
#endif

#ifdef HAS_WEIGHTS_0_VEC4
in vec4 a_weights_0;
#endif

#ifdef HAS_WEIGHTS_1_VEC4
in vec4 a_weights_1;
#endif

#ifdef USE_SKINNING
uniform sampler2D u_jointsSampler;
#endif

#ifdef USE_SKINNING

mat4 getMatrixFromTexture(sampler2D s, int index)
{
    mat4 result = mat4(1);
    int texSize = textureSize(s, 0)[0];
    int pixelIndex = index * 4;
    for (int i = 0; i < 4; ++i)
    {
        int x = (pixelIndex + i) % texSize;
        //Rounding mode of integers is undefined:
        //https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf (section 12.33)
        int y = (pixelIndex + i - x) / texSize; 
        result[i] = texelFetch(s, ivec2(x,y), 0);
    }
    return result;
}

mat4 getSkinningMatrix()
{
    mat4 skin = mat4(0);

#if defined(HAS_WEIGHTS_0_VEC4) && defined(HAS_JOINTS_0_VEC4)
    skin +=
        a_weights_0.x * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.x) * 2) +
        a_weights_0.y * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.y) * 2) +
        a_weights_0.z * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.z) * 2) +
        a_weights_0.w * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.w) * 2);
#endif

#if defined(HAS_WEIGHTS_1_VEC4) && defined(HAS_JOINTS_1_VEC4)
    skin +=
        a_weights_1.x * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.x) * 2) +
        a_weights_1.y * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.y) * 2) +
        a_weights_1.z * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.z) * 2) +
        a_weights_1.w * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.w) * 2);
#endif

    return skin;
}

mat4 getSkinningNormalMatrix()
{
    mat4 skin = mat4(0);

#if defined(HAS_WEIGHTS_0_VEC4) && defined(HAS_JOINTS_0_VEC4)
    skin +=
        a_weights_0.x * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.x) * 2 + 1) +
        a_weights_0.y * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.y) * 2 + 1) +
        a_weights_0.z * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.z) * 2 + 1) +
        a_weights_0.w * getMatrixFromTexture(u_jointsSampler, int(a_joints_0.w) * 2 + 1);
#endif

#if defined(HAS_WEIGHTS_1_VEC4) && defined(HAS_JOINTS_1_VEC4)
    skin +=
        a_weights_1.x * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.x) * 2 + 1) +
        a_weights_1.y * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.y) * 2 + 1) +
        a_weights_1.z * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.z) * 2 + 1) +
        a_weights_1.w * getMatrixFromTexture(u_jointsSampler, int(a_joints_1.w) * 2 + 1);
#endif

    return skin;
}

#endif // !USE_SKINNING

#ifdef USE_MORPHING

#ifdef HAS_MORPH_TARGETS
vec4 getDisplacement(int vertexID, int targetIndex, int texSize)
{
    int x = vertexID % texSize;
    //Rounding mode of integers is undefined:
    //https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf (section 12.33)
    int y = (vertexID - x) / texSize; 
    return texelFetch(u_MorphTargetsSampler, ivec3(x, y, targetIndex), 0);
}
#endif

vec4 getTargetPosition(int vertexID)
{
    vec4 pos = vec4(0);
#ifdef HAS_MORPH_TARGET_POSITION
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec4 displacement = getDisplacement(vertexID, MORPH_TARGET_POSITION_OFFSET + i, texSize);
        pos += u_morphWeights[i] * displacement;
    }
#endif

    return pos;
}

vec3 getTargetNormal(int vertexID)
{
    vec3 normal = vec3(0);

#ifdef HAS_MORPH_TARGET_NORMAL
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec3 displacement = getDisplacement(vertexID, MORPH_TARGET_NORMAL_OFFSET + i, texSize).xyz;
        normal += u_morphWeights[i] * displacement;
    }
#endif

    return normal;
}

vec3 getTargetTangent(int vertexID)
{
    vec3 tangent = vec3(0);

#ifdef HAS_MORPH_TARGET_TANGENT
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec3 displacement = getDisplacement(vertexID, MORPH_TARGET_TANGENT_OFFSET + i, texSize).xyz;
        tangent += u_morphWeights[i] * displacement;
    }
#endif

    return tangent;
}

vec2 getTargetTexCoord0(int vertexID)
{
    vec2 uv = vec2(0);

#ifdef HAS_MORPH_TARGET_TEXCOORD_0
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec2 displacement = getDisplacement(vertexID, MORPH_TARGET_TEXCOORD_0_OFFSET + i, texSize).xy;
        uv += u_morphWeights[i] * displacement;
    }
#endif

    return uv;
}

vec2 getTargetTexCoord1(int vertexID)
{
    vec2 uv = vec2(0);

#ifdef HAS_MORPH_TARGET_TEXCOORD_1
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec2 displacement = getDisplacement(vertexID, MORPH_TARGET_TEXCOORD_1_OFFSET + i, texSize).xy;
        uv += u_morphWeights[i] * displacement;
    }
#endif

    return uv;
}

vec4 getTargetColor0(int vertexID)
{
    vec4 color = vec4(0);

#ifdef HAS_MORPH_TARGET_COLOR_0
    int texSize = textureSize(u_MorphTargetsSampler, 0)[0];
    for(int i = 0; i < WEIGHT_COUNT; i++)
    {
        vec4 displacement = getDisplacement(vertexID, MORPH_TARGET_COLOR_0_OFFSET + i, texSize);
        color += u_morphWeights[i] * displacement;
    }
#endif

    return color;
}

#endif // !USE_MORPHING

// uniforms
layout(set=0, binding=0) uniform VertexUniforms {
    mat4 u_ViewProjectionMatrix;
    mat4 u_ModelMatrix;               
    mat4 u_NormalMatrix;
};

// ins
layout(location=0) in vec3 a_position;
#ifdef HAS_NORMAL_VEC3
layout(location=1) in vec3 a_normal;
#endif
#ifdef HAS_TEXCOORD_0_VEC2
layout(location=2) in vec2 a_texcoord_0;
#endif
#ifdef HAS_TEXCOORD_1_VEC2
in vec2 a_texcoord_1;
#endif

// outs
layout(location=0) out vec3 v_Position;

#ifdef HAS_NORMAL_VEC3
#ifdef HAS_TANGENT_VEC4
layout(location=4) in vec4 a_tangent; // in max is 4
layout(location=5) out mat3 v_TBN; // out max is 5
#else
layout(location=1) out vec3 v_Normal;
#endif
#endif

layout(location=2) out vec2 v_texcoord_0;
layout(location=3) out vec2 v_texcoord_1;

#ifdef HAS_COLOR_0_VEC3
in vec3 a_color_0;
out vec3 v_Color;
#endif

#ifdef HAS_COLOR_0_VEC4
layout(location=3) in vec4 a_color_0;
layout(location=4) out vec4 v_Color;
#endif

vec4 getPosition()
{
    vec4 pos = vec4(a_position, 1.0);

#ifdef USE_MORPHING
    pos += getTargetPosition(gl_VertexID);
#endif

#ifdef USE_SKINNING
    pos = getSkinningMatrix() * pos;
#endif

    return pos;
}

#ifdef HAS_NORMAL_VEC3
vec3 getNormal()
{
    vec3 normal = a_normal;

#ifdef USE_MORPHING
    normal += getTargetNormal(gl_VertexID);
#endif

#ifdef USE_SKINNING
    normal = mat3(getSkinningNormalMatrix()) * normal;
#endif

    return normalize(normal);
}
#endif

#ifdef HAS_NORMAL_VEC3
#ifdef HAS_TANGENT_VEC4
vec3 getTangent()
{
    vec3 tangent = a_tangent.xyz;

#ifdef USE_MORPHING
    tangent += getTargetTangent(gl_VertexID);
#endif

#ifdef USE_SKINNING
    tangent = mat3(getSkinningMatrix()) * tangent;
#endif

    return normalize(tangent);
}
#endif
#endif

void main()
{
    gl_PointSize = 1.0f;
    vec4 pos = u_ModelMatrix * getPosition();
    v_Position = vec3(pos.xyz) / pos.w;

#ifdef HAS_NORMAL_VEC3
#ifdef HAS_TANGENT_VEC4
    vec3 tangent = getTangent();
    vec3 normalW = normalize(vec3(u_NormalMatrix * vec4(getNormal(), 0.0)));
    vec3 tangentW = normalize(vec3(u_ModelMatrix * vec4(tangent, 0.0)));
    vec3 bitangentW = cross(normalW, tangentW) * a_tangent.w;
    v_TBN = mat3(tangentW, bitangentW, normalW);
#else
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(getNormal(), 0.0)));
#endif
#endif

    v_texcoord_0 = vec2(0.0, 0.0);
    v_texcoord_1 = vec2(0.0, 0.0);

#ifdef HAS_TEXCOORD_0_VEC2
    v_texcoord_0 = a_texcoord_0;
#endif

#ifdef HAS_TEXCOORD_1_VEC2
    v_texcoord_1 = a_texcoord_1;
#endif

#ifdef USE_MORPHING
    v_texcoord_0 += getTargetTexCoord0(gl_VertexID);
    v_texcoord_1 += getTargetTexCoord1(gl_VertexID);
#endif

#if defined(HAS_COLOR_0_VEC3) 
    v_Color = a_color_0;
#if defined(USE_MORPHING)
    v_Color = clamp(v_Color + getTargetColor0(gl_VertexID).xyz, 0.0f, 1.0f);
#endif
#endif

#if defined(HAS_COLOR_0_VEC4) 
    v_Color = a_color_0;
#if defined(USE_MORPHING)
    v_Color = clamp(v_Color + getTargetColor0(gl_VertexID), 0.0f, 1.0f);
#endif
#endif

    gl_Position = u_ViewProjectionMatrix * pos;
}
