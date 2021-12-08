export class SimpleTextureShader {
  public static ambientIntensity: string = "0.2";
  public static diffuseIntensity: string = "0.8";
  public static specularIntensity: string = "0.4";
  public static shininess: string = "30.0";
  public static specularColor: string = "(1.0, 1.0, 1.0)";
  public static isPhong: string = "0";
  public static isTwoSideLighting = "1";

  public static wgslShaders() {
    const vertex = `
              [[block]] struct Uniforms {
                  viewProjectionMatrix : mat4x4<f32>;
                  modelMatrix : mat4x4<f32>;               
                  normalMatrix : mat4x4<f32>;                
              };
              [[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
  
              struct Input {
                  [[location(0)]] position : vec4<f32>;
                  [[location(1)]] normal : vec4<f32>;
                  [[location(2)]] uv : vec2<f32>;
              };
  
              struct Output {
                  [[builtin(position)]] Position : vec4<f32>;
                  [[location(0)]] vPosition : vec4<f32>;
                  [[location(1)]] vNormal : vec4<f32>;
                  [[location(2)]] vUV : vec2<f32>;
              };
          
              [[stage(vertex)]]
              fn main(input: Input) -> Output {                
                  var output: Output;
                  let mPosition:vec4<f32> = uniforms.modelMatrix * input.position; 
                  output.vPosition = mPosition;                  
                  output.vNormal =  uniforms.normalMatrix*input.normal;
                  output.Position = uniforms.viewProjectionMatrix * mPosition;     
                  output.vUV = input.uv;          
                  return output;
              }`;

    const fragment = `
              [[block]] struct Uniforms {
                  lightPosition : vec4<f32>;   
                  eyePosition : vec4<f32>;
              };
              [[binding(1), group(0)]] var<uniform> uniforms : Uniforms;            
              [[binding(2), group(0)]] var textureSampler : sampler;
              [[binding(3), group(0)]] var textureData : texture_2d<f32>;
  
              struct Input {
                  [[location(0)]] vPosition : vec4<f32>;
                  [[location(1)]] vNormal : vec4<f32>;
                  [[location(2)]] vUV : vec2<f32>;
              };
             
              [[stage(fragment)]]
              fn main(input: Input) -> [[location(0)]] vec4<f32> {
                  let textureColor:vec3<f32> = (textureSample(textureData, textureSampler, input.vUV)).rgb;
                  let N:vec3<f32> = normalize(input.vNormal.xyz);                
                  let L:vec3<f32> = normalize(uniforms.lightPosition.xyz - input.vPosition.xyz);     
                  let V:vec3<f32> = normalize(uniforms.eyePosition.xyz - input.vPosition.xyz);          
                  let H:vec3<f32> = normalize(L + V);
  
                  var twoSide:i32 = ${this.isTwoSideLighting};
                  var diffuse:f32 = ${this.diffuseIntensity} * max(dot(N, L), 0.0);
                  if(twoSide == 1){
                      diffuse = diffuse + ${this.diffuseIntensity} * max(dot(-N, L), 0.0);
                  } 
  
                  var specular:f32;
                  var isp:i32 = ${this.isPhong};
                  if(isp == 1){                   
                      specular = ${this.specularIntensity} * pow(max(dot(V, reflect(-L, N)),0.0), ${this.shininess});
                      if(twoSide == 1) {
                         specular = specular + ${this.specularIntensity} * 
                             pow(max(dot(V, reflect(-L, -N)),0.0), ${this.shininess});
                      }
                  } else {
                      specular = ${this.specularIntensity} * pow(max(dot(N, H),0.0), ${this.shininess});
                      if(twoSide == 1){                     
                         specular = specular + ${this.specularIntensity} * pow(max(dot(-N, H),0.0), ${this.shininess});
                      }
                  }               
                  let ambient:f32 = ${this.ambientIntensity};               
                  let finalColor:vec3<f32> = textureColor * (ambient + diffuse) + 
                      vec3<f32>${this.specularColor}*specular; 
                  return vec4<f32>(finalColor, 1.0);
              }`;

    return { vertex, fragment };
  }

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
          layout(location=2) out vec3 vUV;
          
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
