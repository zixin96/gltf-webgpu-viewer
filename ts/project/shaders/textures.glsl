// IBL
precision lowp sampler;

layout(set=0, binding=13) uniform IBLTexture {
    int u_MipCount;
    mat3 u_EnvRotation;
};

layout(set=0, binding=14)    uniform sampler u_LambertianEnvSampler;
layout(set=0, binding=15)   uniform sampler u_GGXEnvSampler;
layout(set=0, binding=16)    uniform sampler u_GGXLUT;
layout(set=0, binding=17)   uniform sampler u_CharlieEnvSampler;
layout(set=0, binding=18)    uniform sampler u_CharlieLUT;
layout(set=0, binding=19)   uniform sampler u_SheenELUT;

// General Material
layout(set=0, binding=20)  uniform sampler u_NormalSampler;
layout(set=0, binding=21)  uniform    sampler u_EmissiveSampler;
layout(set=0, binding=22)  uniform       sampler u_OcclusionSampler;

layout(set=0, binding=23) uniform GeneralMaterial {

    float u_NormalScale;
    int u_NormalUVSet;
    mat3 u_NormalUVTransform;

    int u_EmissiveUVSet;
    mat3 u_EmissiveUVTransform;

    int u_OcclusionUVSet;
    float u_OcclusionStrength;
    mat3 u_OcclusionUVTransform;
};




layout(location=2) in vec2 v_texcoord_0;
layout(location=3) in vec2 v_texcoord_1;


vec2 getNormalUV()
{
    // vec3 uv = vec3(u_NormalUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
    vec3 uv = vec3(0.0, 0.0, 1.0);

#ifdef HAS_NORMAL_UV_TRANSFORM
    uv = u_NormalUVTransform * uv;
#endif

    return uv.xy;
}


vec2 getEmissiveUV()
{
    vec3 uv = vec3(u_EmissiveUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_EMISSIVE_UV_TRANSFORM
    uv = u_EmissiveUVTransform * uv;
#endif

    return uv.xy;
}


vec2 getOcclusionUV()
{
    vec3 uv = vec3(u_OcclusionUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_OCCLUSION_UV_TRANSFORM
    uv = u_OcclusionUVTransform * uv;
#endif

    return uv.xy;
}


// Metallic Roughness Material


#ifdef MATERIAL_METALLICROUGHNESS

layout(set=0, binding=24)   uniform sampler u_BaseColorSampler;
layout(set=0, binding=25)   uniform sampler u_MetallicRoughnessSampler;

layout(set=0, binding=26) uniform MMR {

    int u_BaseColorUVSet;
    mat3 u_BaseColorUVTransform;

    int u_MetallicRoughnessUVSet;
    mat3 u_MetallicRoughnessUVTransform;
};

layout(set=0, binding=27) uniform EmissiveFactor {
    vec3 u_EmissiveFactor;
};  


vec2 getBaseColorUV()
{
    vec3 uv = vec3(u_BaseColorUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_BASECOLOR_UV_TRANSFORM
    uv = u_BaseColorUVTransform * uv;
#endif

    return uv.xy;
}

vec2 getMetallicRoughnessUV()
{
    vec3 uv = vec3(u_MetallicRoughnessUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_METALLICROUGHNESS_UV_TRANSFORM
    uv = u_MetallicRoughnessUVTransform * uv;
#endif

    return uv.xy;
}

#endif


// Specular Glossiness Material


#ifdef MATERIAL_SPECULARGLOSSINESS

uniform sampler u_DiffuseSampler;
uniform int u_DiffuseUVSet;
uniform mat3 u_DiffuseUVTransform;

uniform sampler u_SpecularGlossinessSampler;
uniform int u_SpecularGlossinessUVSet;
uniform mat3 u_SpecularGlossinessUVTransform;


vec2 getSpecularGlossinessUV()
{
    vec3 uv = vec3(u_SpecularGlossinessUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_SPECULARGLOSSINESS_UV_TRANSFORM
    uv = u_SpecularGlossinessUVTransform * uv;
#endif

    return uv.xy;
}

vec2 getDiffuseUV()
{
    vec3 uv = vec3(u_DiffuseUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);

#ifdef HAS_DIFFUSE_UV_TRANSFORM
    uv = u_DiffuseUVTransform * uv;
#endif

    return uv.xy;
}

#endif


// Clearcoat Material


#ifdef MATERIAL_CLEARCOAT

uniform sampler u_ClearcoatSampler;
uniform int u_ClearcoatUVSet;
uniform mat3 u_ClearcoatUVTransform;

uniform sampler u_ClearcoatRoughnessSampler;
uniform int u_ClearcoatRoughnessUVSet;
uniform mat3 u_ClearcoatRoughnessUVTransform;

uniform sampler u_ClearcoatNormalSampler;
uniform int u_ClearcoatNormalUVSet;
uniform mat3 u_ClearcoatNormalUVTransform;
uniform float u_ClearcoatNormalScale;


vec2 getClearcoatUV()
{
    vec3 uv = vec3(u_ClearcoatUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_CLEARCOAT_UV_TRANSFORM
    uv = u_ClearcoatUVTransform * uv;
#endif
    return uv.xy;
}

vec2 getClearcoatRoughnessUV()
{
    vec3 uv = vec3(u_ClearcoatRoughnessUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_CLEARCOATROUGHNESS_UV_TRANSFORM
    uv = u_ClearcoatRoughnessUVTransform * uv;
#endif
    return uv.xy;
}

vec2 getClearcoatNormalUV()
{
    vec3 uv = vec3(u_ClearcoatNormalUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_CLEARCOATNORMAL_UV_TRANSFORM
    uv = u_ClearcoatNormalUVTransform * uv;
#endif
    return uv.xy;
}

#endif


// Sheen Material


#ifdef MATERIAL_SHEEN

uniform sampler u_SheenColorSampler;
uniform int u_SheenColorUVSet;
uniform mat3 u_SheenColorUVTransform;
uniform sampler u_SheenRoughnessSampler;
uniform int u_SheenRoughnessUVSet;
uniform mat3 u_SheenRoughnessUVTransform;


vec2 getSheenColorUV()
{
    vec3 uv = vec3(u_SheenColorUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_SHEENCOLOR_UV_TRANSFORM
    uv = u_SheenColorUVTransform * uv;
#endif
    return uv.xy;
}

vec2 getSheenRoughnessUV()
{
    vec3 uv = vec3(u_SheenRoughnessUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_SHEENROUGHNESS_UV_TRANSFORM
    uv = u_SheenRoughnessUVTransform * uv;
#endif
    return uv.xy;
}

#endif


// Specular Material


#ifdef MATERIAL_SPECULAR

uniform sampler u_SpecularSampler;
uniform int u_SpecularUVSet;
uniform mat3 u_SpecularUVTransform;
uniform sampler u_SpecularColorSampler;
uniform int u_SpecularColorUVSet;
uniform mat3 u_SpecularColorUVTransform;


vec2 getSpecularUV()
{
    vec3 uv = vec3(u_SpecularUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_SPECULAR_UV_TRANSFORM
    uv = u_SpecularUVTransform * uv;
#endif
    return uv.xy;
}

vec2 getSpecularColorUV()
{
    vec3 uv = vec3(u_SpecularColorUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_SPECULARCOLOR_UV_TRANSFORM
    uv = u_SpecularColorUVTransform * uv;
#endif
    return uv.xy;
}

#endif


// Transmission Material


#ifdef MATERIAL_TRANSMISSION

uniform sampler u_TransmissionSampler;
uniform int u_TransmissionUVSet;
uniform mat3 u_TransmissionUVTransform;
uniform sampler u_TransmissionFramebufferSampler;
uniform ivec2 u_TransmissionFramebufferSize;


vec2 getTransmissionUV()
{
    vec3 uv = vec3(u_TransmissionUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_TRANSMISSION_UV_TRANSFORM
    uv = u_TransmissionUVTransform * uv;
#endif
    return uv.xy;
}

#endif


// Volume Material


#ifdef MATERIAL_VOLUME

uniform sampler u_ThicknessSampler;
uniform int u_ThicknessUVSet;
uniform mat3 u_ThicknessUVTransform;


vec2 getThicknessUV()
{
    vec3 uv = vec3(u_ThicknessUVSet < 1 ? v_texcoord_0 : v_texcoord_1, 1.0);
#ifdef HAS_THICKNESS_UV_TRANSFORM
    uv = u_ThicknessUVTransform * uv;
#endif
    return uv.xy;
}

#endif
