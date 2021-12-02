export class triangleShaders {
  public static wgslShaders() {
    const vertex = `
    struct VSOut {
        [[builtin(position)]] Position: vec4<f32>;
        [[location(0)]] color: vec3<f32>;
    };
    
    [[stage(vertex)]]
    fn main([[location(0)]] inPos: vec3<f32>,
            [[location(1)]] inColor: vec3<f32>) -> VSOut {
        var vsOut: VSOut;
        vsOut.Position = vec4<f32>(inPos, 1.0);
        vsOut.color = inColor;
        return vsOut;
    }
                `;

    const fragment = `
    [[stage(fragment)]]
    fn main([[location(0)]] inColor: vec3<f32>) -> [[location(0)]] vec4<f32> {
        return vec4<f32>(inColor, 1.0);
    }
    
                `;

    return { vertex, fragment };
  }
}

export class rawGltfShaders {
  public static primitiveVertexShader() {
    return ``;
  }

  public static pbrFragmentShader() {
    return ``;
  }
}
