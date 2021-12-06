// Metallic Roughness
layout(set=0, binding=2) uniform MetallicRoughness {
    // vec4 needs to be first, o.w needs padding
    vec4 u_BaseColorFactor;
    float u_MetallicFactor;
    float u_RoughnessFactor;
};

// Specular Glossiness
layout(set=0, binding=3) uniform SpecularGlossiness {
    vec3 u_SpecularFactor;
    vec4 u_DiffuseFactor;
    float u_GlossinessFactor;
};


// Sheen
layout(set=0, binding=4) uniform Sheen {
    float u_SheenRoughnessFactor;
    vec3 u_SheenColorFactor;
};


// Clearcoat
layout(set=0, binding=5) uniform Clearcoat {
    float u_ClearcoatFactor;
    float u_ClearcoatRoughnessFactor;
};


// Specular
layout(set=0, binding=6) uniform Specular {
    vec3 u_KHR_materials_specular_specularColorFactor;
    float u_KHR_materials_specular_specularFactor;
};


// Transmission
layout(set=0, binding=7) uniform Transmission {
    float u_TransmissionFactor;
};

// Volume
layout(set=0, binding=8) uniform Volume {
    float u_ThicknessFactor;
    vec3 u_AttenuationColor;
    float u_AttenuationDistance;
};

//PBR Next IOR
layout(set=0, binding=9) uniform IOR {
    float u_Ior;
};

// Alpha mode
layout(set=0, binding=10) uniform AlphaMode {
    float u_AlphaCutoff;
};

layout(set=0, binding=11) uniform Camera {
    vec3 u_Camera;
};

#ifdef MATERIAL_TRANSMISSION
uniform ivec2 u_ScreenSize;
#endif

layout(set=0, binding=12) uniform FragmentMVP  {
    mat4 u_ModelMatrix;
    mat4 u_ViewMatrix;
    mat4 u_ProjectionMatrix;
};

struct MaterialInfo
{
    float ior;
    float perceptualRoughness;      // roughness value, as authored by the model creator (input to shader)
    vec3 f0;                        // full reflectance color (n incidence angle)

    float alphaRoughness;           // roughness mapped to a more linear change in the roughness (proposed by [2])
    vec3 c_diff;

    vec3 f90;                       // reflectance color at grazing angle
    float metallic;

    vec3 baseColor;

    float sheenRoughnessFactor;
    vec3 sheenColorFactor;

    vec3 clearcoatF0;
    vec3 clearcoatF90;
    float clearcoatFactor;
    vec3 clearcoatNormal;
    float clearcoatRoughness;

    // KHR_materials_specular 
    float specularWeight; // product of specularFactor and specularTexture.a

    float transmissionFactor;

    float thickness;
    vec3 attenuationColor;
    float attenuationDistance;
};


// Get normal, tangent and bitangent vectors.
NormalInfo getNormalInfo(vec3 v)
{
    vec2 UV = getNormalUV();
    vec3 uv_dx = dFdx(vec3(UV, 0.0));
    vec3 uv_dy = dFdy(vec3(UV, 0.0));

    vec3 t_ = (uv_dy.t * dFdx(v_Position) - uv_dx.t * dFdy(v_Position)) /
        (uv_dx.s * uv_dy.t - uv_dy.s * uv_dx.t);

    vec3 n, t, b, ng;

    // Compute geometrical TBN:
#ifdef HAS_NORMAL_VEC3
#ifdef HAS_TANGENT_VEC4
    // Trivial TBN computation, present as vertex attribute.
    // Normalize eigenvectors as matrix is linearly interpolated.
    t = normalize(v_TBN[0]);
    b = normalize(v_TBN[1]);
    ng = normalize(v_TBN[2]);
#else
    // Normals are either present as vertex attributes or approximated.
    ng = normalize(v_Normal);
#endif
#else
    ng = normalize(cross(dFdx(v_Position), dFdy(v_Position)));
#endif
    t = normalize(t_ - ng * dot(ng, t_));
    b = cross(ng, t);

    // For a back-facing surface, the tangential basis vectors are negated.
    if (gl_FrontFacing == false)
    {
        t *= -1.0;
        b *= -1.0;
        ng *= -1.0;
    }

    // Compute pertubed normals:
#ifdef HAS_NORMAL_MAP
    n = texture(u_NormalSampler, UV).rgb * 2.0 - vec3(1.0);
    n *= vec3(u_NormalScale, u_NormalScale, 1.0);
    n = mat3(t, b, ng) * normalize(n);
#else
    n = ng;
#endif

    NormalInfo info;
    info.ng = ng;
    info.t = t;
    info.b = b;
    info.n = n;
    return info;
}


#ifdef MATERIAL_CLEARCOAT
vec3 getClearcoatNormal(NormalInfo normalInfo)
{
#ifdef HAS_CLEARCOAT_NORMAL_MAP
    vec3 n = texture(u_ClearcoatNormalSampler, getClearcoatNormalUV()).rgb * 2.0 - vec3(1.0);
    n *= vec3(u_ClearcoatNormalScale, u_ClearcoatNormalScale, 1.0);
    n = mat3(normalInfo.t, normalInfo.b, normalInfo.ng) * normalize(n);
    return n;
#else
    return normalInfo.ng;
#endif
}
#endif


vec4 getBaseColor()
{
    vec4 baseColor = vec4(1);

#if defined(MATERIAL_SPECULARGLOSSINESS)
    baseColor = u_DiffuseFactor;
#elif defined(MATERIAL_METALLICROUGHNESS)
    baseColor = u_BaseColorFactor;
#endif

#if defined(MATERIAL_SPECULARGLOSSINESS) && defined(HAS_DIFFUSE_MAP)
    baseColor *= texture(u_DiffuseSampler, getDiffuseUV());
#elif defined(MATERIAL_METALLICROUGHNESS) && defined(HAS_BASE_COLOR_MAP)
    baseColor *= texture(u_BaseColorSampler, getBaseColorUV());
#endif

    return baseColor * getVertexColor();
}


#ifdef MATERIAL_SPECULARGLOSSINESS
MaterialInfo getSpecularGlossinessInfo(MaterialInfo info)
{
    info.f0 = u_SpecularFactor;
    info.perceptualRoughness = u_GlossinessFactor;

#ifdef HAS_SPECULAR_GLOSSINESS_MAP
    vec4 sgSample = texture(u_SpecularGlossinessSampler, getSpecularGlossinessUV());
    info.perceptualRoughness *= sgSample.a ; // glossiness to roughness
    info.f0 *= sgSample.rgb; // specular
#endif // ! HAS_SPECULAR_GLOSSINESS_MAP

    info.perceptualRoughness = 1.0 - info.perceptualRoughness; // 1 - glossiness
    info.c_diff = info.baseColor.rgb * (1.0 - max(max(info.f0.r, info.f0.g), info.f0.b));
    return info;
}
#endif


#ifdef MATERIAL_METALLICROUGHNESS
MaterialInfo getMetallicRoughnessInfo(MaterialInfo info)
{
    info.metallic = u_MetallicFactor;
    info.perceptualRoughness = u_RoughnessFactor;

#ifdef HAS_METALLIC_ROUGHNESS_MAP
    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
    vec4 mrSample = texture(u_MetallicRoughnessSampler, getMetallicRoughnessUV());
    info.perceptualRoughness *= mrSample.g;
    info.metallic *= mrSample.b;
#endif

    // Achromatic f0 based on IOR.
    info.c_diff = mix(info.baseColor.rgb,  vec3(0), info.metallic);
    info.f0 = mix(info.f0, info.baseColor.rgb, info.metallic);
    return info;
}
#endif


#ifdef MATERIAL_SHEEN
MaterialInfo getSheenInfo(MaterialInfo info)
{
    info.sheenColorFactor = u_SheenColorFactor;
    info.sheenRoughnessFactor = u_SheenRoughnessFactor;

#ifdef HAS_SHEEN_COLOR_MAP
    vec4 sheenColorSample = texture(u_SheenColorSampler, getSheenColorUV());
    info.sheenColorFactor *= sheenColorSample.rgb;
#endif

#ifdef HAS_SHEEN_ROUGHNESS_MAP
    vec4 sheenRoughnessSample = texture(u_SheenRoughnessSampler, getSheenRoughnessUV());
    info.sheenRoughnessFactor *= sheenRoughnessSample.a;
#endif
    return info;
}
#endif


#ifdef MATERIAL_SPECULAR
MaterialInfo getSpecularInfo(MaterialInfo info)
{   
    vec4 specularTexture = vec4(1.0);
#ifdef HAS_SPECULAR_MAP
    specularTexture.a = texture(u_SpecularSampler, getSpecularUV()).a;
#endif
#ifdef HAS_SPECULAR_COLOR_MAP
    specularTexture.rgb = texture(u_SpecularColorSampler, getSpecularColorUV()).rgb;
#endif

    vec3 dielectricSpecularF0 = min(info.f0 * u_KHR_materials_specular_specularColorFactor * specularTexture.rgb, vec3(1.0));
    info.f0 = mix(dielectricSpecularF0, info.baseColor.rgb, info.metallic);
    info.specularWeight = u_KHR_materials_specular_specularFactor * specularTexture.a;
    info.c_diff = mix(info.baseColor.rgb, vec3(0), info.metallic);
    return info;
}
#endif


#ifdef MATERIAL_TRANSMISSION
MaterialInfo getTransmissionInfo(MaterialInfo info)
{
    info.transmissionFactor = u_TransmissionFactor;

#ifdef HAS_TRANSMISSION_MAP
    vec4 transmissionSample = texture(u_TransmissionSampler, getTransmissionUV());
    info.transmissionFactor *= transmissionSample.r;
#endif
    return info;
}
#endif


#ifdef MATERIAL_VOLUME
MaterialInfo getVolumeInfo(MaterialInfo info)
{
    info.thickness = u_ThicknessFactor;
    info.attenuationColor = u_AttenuationColor;
    info.attenuationDistance = u_AttenuationDistance;

#ifdef HAS_THICKNESS_MAP
    vec4 thicknessSample = texture(u_ThicknessSampler, getThicknessUV());
    info.thickness *= thicknessSample.g;
#endif
    return info;
}
#endif


#ifdef MATERIAL_CLEARCOAT
MaterialInfo getClearCoatInfo(MaterialInfo info, NormalInfo normalInfo)
{
    info.clearcoatFactor = u_ClearcoatFactor;
    info.clearcoatRoughness = u_ClearcoatRoughnessFactor;
    info.clearcoatF0 = vec3(info.f0);
    info.clearcoatF90 = vec3(1.0);

#ifdef HAS_CLEARCOAT_MAP
    vec4 clearcoatSample = texture(u_ClearcoatSampler, getClearcoatUV());
    info.clearcoatFactor *= clearcoatSample.r;
#endif

#ifdef HAS_CLEARCOAT_ROUGHNESS_MAP
    vec4 clearcoatSampleRoughness = texture(u_ClearcoatRoughnessSampler, getClearcoatRoughnessUV());
    info.clearcoatRoughness *= clearcoatSampleRoughness.g;
#endif

    info.clearcoatNormal = getClearcoatNormal(normalInfo);
    info.clearcoatRoughness = clamp(info.clearcoatRoughness, 0.0, 1.0);
    return info;
}
#endif


#ifdef MATERIAL_IOR
MaterialInfo getIorInfo(MaterialInfo info)
{
    info.f0 = vec3(pow(( u_Ior - 1.0) /  (u_Ior + 1.0), 2.0));
    info.ior = u_Ior;
    return info;
}
#endif


float albedoSheenScalingLUT(float NdotV, float sheenRoughnessFactor)
{
    //return texture(u_SheenELUT, vec2(NdotV, sheenRoughnessFactor)).r;
    return 0.0;
}
