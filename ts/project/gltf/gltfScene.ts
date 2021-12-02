import { mat4 } from "gl-matrix";
import { gltfNode } from "./gltfNode";
import { GltfObject } from "./GltfObject";

class gltfScene extends GltfObject {
  nodes: any;
  name: any;
  imageBasedLight: any;
  /**
   * nodes, name, imageBasedLight will be empty or undefined
   * @param nodes
   * @param name
   */
  constructor(nodes = [], name = undefined) {
    super();
    this.nodes = nodes;
    this.name = name;

    // non gltf
    this.imageBasedLight = undefined;
  }

  /**
   * Override GltfObject's initGl()
   * @param gltf established glTF object
   * @param webGPUContext
   */
  initGl(gltf: any, webGPUContext: any) {
    super.initGl(gltf, webGPUContext);

    // ! the following is skipped (for sample box)
    if (
      this.extensions !== undefined &&
      this.extensions.KHR_lights_image_based !== undefined
    ) {
      const index = this.extensions.KHR_lights_image_based.imageBasedLight;
      this.imageBasedLight = gltf.imageBasedLights[index];
    }
  }

  /**
   * Recursively apply transformation based on scene graph hierarchy
   * @param gltf
   * @param rootTransform
   */
  applyTransformHierarchy(gltf: any, rootTransform = mat4.create()) {
    function applyTransform(gltf: any, node: gltfNode, parentTransform: any) {
      mat4.multiply(
        node.worldTransform,
        parentTransform,
        node.getLocalTransform()
      );
      mat4.invert(node.inverseWorldTransform, node.worldTransform);
      mat4.transpose(node.normalMatrix, node.inverseWorldTransform);

      for (const child of node.children) {
        applyTransform(gltf, gltf.nodes[child], node.worldTransform);
      }
    }

    for (const node of this.nodes) {
      applyTransform(gltf, gltf.nodes[node], rootTransform);
    }
  }

  /**
   * @param gltf
   * @returns an array of all nodes in the scene
   */
  gatherNodes(gltf: any) {
    const nodes: gltfNode[] = [];

    function gatherNode(nodeIndex: number) {
      const node = gltf.nodes[nodeIndex];
      nodes.push(node);

      // recurse into children
      for (const child of node.children) {
        gatherNode(child);
      }
    }

    for (const node of this.nodes) {
      gatherNode(node);
    }

    return nodes;
  }
}

export { gltfScene };
