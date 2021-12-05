#version 310 es
precision highp float;

////////////////////////////
// Helpers
////////////////////////////

const float M_PI = 3.141592653589793;


layout(location=0) in vec3 v_Position;


#ifdef HAS_NORMAL_VEC3
#ifdef HAS_TANGENT_VEC4
in mat3 v_TBN;
#else
in vec3 v_Normal;
#endif
#endif


#ifdef HAS_COLOR_0_VEC3
in vec3 v_Color;
#endif
#ifdef HAS_COLOR_0_VEC4
in vec4 v_Color;
#endif


vec4 getVertexColor()
{
   vec4 color = vec4(1.0);

#ifdef HAS_COLOR_0_VEC3
    color.rgb = v_Color.rgb;
#endif
#ifdef HAS_COLOR_0_VEC4
    color = v_Color;
#endif

   return color;
}


struct NormalInfo {
    vec3 ng;   // Geometric normal
    vec3 n;    // Pertubed normal
    vec3 t;    // Pertubed tangent
    vec3 b;    // Pertubed bitangent
};


float clampedDot(vec3 x, vec3 y)
{
    return clamp(dot(x, y), 0.0, 1.0);
}


float max3(vec3 v)
{
    return max(max(v.x, v.y), v.z);
}


float applyIorToRoughness(float roughness, float ior)
{
    // Scale roughness with IOR so that an IOR of 1.0 results in no microfacet refraction and
    // an IOR of 1.5 results in the default amount of microfacet refraction.
    return roughness * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
}


layout(location = 1) in vec3 v_Normal;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}