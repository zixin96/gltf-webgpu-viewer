export class SimpleTextureShader {
  public static ambientIntensity: string = "0.2";
  public static diffuseIntensity: string = "0.8";
  public static specularIntensity: string = "0.4";
  public static shininess: string = "30.0";
  public static specularColor: string = "(1.0, 1.0, 1.0)";
  public static isPhong: string = "0";
  public static isTwoSideLighting = "1";

  public static glslShaders() {
    const vertex = `
          #version 450
          layout(location=0) in vec4 position;
          layout(location=1) in vec4 normal;
          layout(location=2) in vec2 uv;
           
          layout(set=0, binding=0) uniform VertexUniforms {
              mat4 viewProjectionMatrix;
              mat4 modelMatrix;               
              mat4 normalMatrix;
          };
  
          layout(location=0) out vec4 vPosition;
          layout(location=1) out vec4 vNormal;
          layout(location=2) out vec2 vUV;
          
          void main() {
              vec4 mPosition = modelMatrix * position;
              vPosition = mPosition;                
              vNormal = normalMatrix * normal;     
              vUV = uv;                        
              gl_Position = viewProjectionMatrix * mPosition;
          }`;

    const fragment = `
          #version 450    
          layout(location=0) in vec4 vPosition;
          layout(location=1) in vec4 vNormal;
          layout(location=2) in vec2 vUV;
      
          layout(set=0, binding=1) uniform FragmentUniforms {
              vec4 lightPosition;
              vec4 eyePosition;
          };
          layout(set=0, binding=2) uniform sampler textureSampler;
          layout(set=0, binding=3) uniform texture2D textureData;
  
          layout(location=0) out vec4 fragColor;
  
          void main() {
              vec3 textureColor =  texture(sampler2D(textureData, textureSampler), vUV).rgb;
  
              vec3 N = normalize(vNormal.xyz);                
              vec3 L = normalize(lightPosition.xyz - vPosition.xyz);      
              vec3 V = normalize(eyePosition.xyz - vPosition.zyx);          
              vec3 H = normalize(L + V); 
              int twoSide = ${this.isTwoSideLighting};
              float diffuse = ${this.diffuseIntensity} * max(dot(N, L), 0.0); 
              if(twoSide == 1){
                  diffuse += ${this.diffuseIntensity} * max(dot(-N, L), 0.0); 
              }
              int isp = ${this.isPhong};
              float specular;
              if(isp == 1){               
                  specular = ${this.specularIntensity} * pow(max(dot(V, reflect(-L, N)), 0.0), ${this.shininess});
                  if(twoSide == 1){
                     specular += ${this.specularIntensity} * pow(max(dot(V, reflect(-L, -N)), 0.0), ${this.shininess});
                  }
              } else{
                  specular = ${this.specularIntensity} * pow(max(dot(N, H), 0.0), ${this.shininess});
                  if(twoSide == 1){
                      specular += ${this.specularIntensity} * pow(max(dot(-N, H), 0.0), ${this.shininess});
                  }
              }
              vec3 finalColor = textureColor * (${this.ambientIntensity} + diffuse) + vec3${this.specularColor}*specular;  
              fragColor = vec4(finalColor, 1.0);
          }`;

    return { vertex, fragment };
  }
}
