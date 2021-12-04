[[block]] struct Uniforms {
    u_ViewProjectionMatrix : mat4x4<f32>;
    u_ModelMatrix : mat4x4<f32>;               
    u_NormalMatrix : mat4x4<f32>;                
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

struct Input {
    [[location(0)]] a_position : vec3<f32>;
    [[location(1)]] a_normal : vec3<f32>;
};

struct Output {
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] v_Position : vec3<f32>;
    [[location(1)]] v_Normal : vec3<f32>;
};

fn getPosition() -> vec4<f32> {
    let pos:vec4<f32> = vec4<f32>(a_position, 1.0);
    return pos;
}

fn getNormal() -> vec3<f32> {
    let normal:vec3<f32> = a_normal;
    return normalize(normal);
}

[[stage(vertex)]]
fn main(input: Input) -> Output {                
    var output: Output;
    let pos:vec4<f32> = uniforms.u_ModelMatrix * getPosition(); 
    output.v_Position = vec3<f32>(pos.xyz) / pos.w;             
    output.v_Normal =  normalize(vec3<f32>(uniforms.u_NormalMatrix * vec4<f32>(getNormal(), 0.0)));
    output.Position = uniforms.u_ViewProjectionMatrix * pos;      
    return output;
}