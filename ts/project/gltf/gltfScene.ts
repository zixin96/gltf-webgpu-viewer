import { mat4 } from "gl-matrix";
import { gltfNode } from "./gltfNode";
import { GltfObject } from "./GltfObject";
import { glTF } from "./glTF";

class gltfScene extends GltfObject {
  nodes: any;
  name: any;
  /**
   * nodes, name, will be empty or undefined
   * @param nodes
   * @param name
   */
  constructor(nodes = [], name = undefined) {
    super();
    this.nodes = nodes;
    this.name = name;
  }

  /**
   * Override GltfObject's initGl()
   * @param gltf established glTF object
   * @param device
   */
  initGl(gltf: glTF, device: GPUDevice) {
    super.initGl(gltf, device);

    // * In kronos, this.imageBasedLight (KHR_lights_image_based) was assigned here
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
