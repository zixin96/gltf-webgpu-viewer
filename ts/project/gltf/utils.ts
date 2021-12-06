import { glMatrix, vec3, mat4 } from "gl-matrix";
import { glTF } from "./glTF";
import { gltfAccessor } from "./gltfAccessor";

/**
 * Individual: Populate target object based on jsonObj
 * @param target: Empty object waiting to be filled
 * @param jsonObj: input json
 * @param ignore: properties to ignore
 */
function fromKeys(target: any, jsonObj: any, ignore = []) {
  for (let k of Object.keys(target)) {
    if (
      ignore &&
      ignore.find(function (elem) {
        return elem == k;
      }) !== undefined
    ) {
      continue; // skip
    }
    if (jsonObj[k] !== undefined) {
      let normalizedK = k.replace("^@", "");
      target[normalizedK] = jsonObj[k];
    }
  }
}

/**
 * Initialize gl for members
 * ! Needs clarification
 * @param gltfObj
 * @param gltf
 * @param device
 */
function initGlForMembers(gltfObj: any, gltf: any, device: GPUDevice) {
  // console.log("gltfObj: ", gltfObj);
  // console.log("gltf: ", gltf);
  // console.log("webGlContext: ", webGlContext);
  // console.log("-----------------");
  for (const name of Object.keys(gltfObj)) {
    const member = gltfObj[name];

    if (member === undefined) {
      continue;
    }
    if (member.initGl !== undefined) {
      member.initGl(gltf, device);
    }
    if (Array.isArray(member)) {
      for (const element of member) {
        if (
          element !== null &&
          element !== undefined &&
          element.initGl !== undefined
        ) {
          element.initGl(gltf, device);
        }
      }
    }
  }
}

/**
 * convert a normal array into Float32Array
 * @param array
 * @returns
 */
function jsToGl(array: any) {
  let tensor = new glMatrix.ARRAY_TYPE(array.length);

  for (let i = 0; i < array.length; ++i) {
    tensor[i] = array[i];
  }

  return tensor;
}

/**
 *
 * @param jsonObjects
 * @param GltfType
 * @returns an array of glTFXXX objects
 */
function objectsFromJsons(jsonObjects: any, GltfType: any) {
  if (jsonObjects === undefined) {
    return [];
  }

  const objects = [];
  for (const jsonObject of jsonObjects) {
    objects.push(objectFromJson(jsonObject, GltfType));
  }
  return objects;
}

/**
 *
 * @param jsonObject
 * @param GltfType
 * @returns a single glTFXXX object
 */
function objectFromJson(jsonObject: any, GltfType: any) {
  const object = new GltfType();
  object.fromJson(jsonObject);
  return object;
}

/**
 *
 * @param extensions
 * @returns IBLs if exists
 */
function getJsonIBLsFromExtensions(extensions: any) {
  if (extensions === undefined) {
    return [];
  }
  if (extensions.KHR_lights_image_based === undefined) {
    return [];
  }
  return extensions.KHR_lights_image_based.imageBasedLights;
}

/**
 * Compute scene extents as outMin and outMax
 * @param gltf
 * @param sceneIndex
 * @param outMin
 * @param outMax
 */
function getSceneExtents(
  gltf: glTF,
  sceneIndex: number,
  outMin: vec3,
  outMax: vec3
) {
  for (const i of [0, 1, 2]) {
    outMin[i] = Number.POSITIVE_INFINITY;
    outMax[i] = Number.NEGATIVE_INFINITY;
  }

  const scene = gltf.scenes[sceneIndex];

  let nodeIndices = scene.nodes.slice();
  while (nodeIndices.length > 0) {
    const node = gltf.nodes[nodeIndices.pop()];
    nodeIndices = nodeIndices.concat(node.children);

    if (node.mesh === undefined) {
      continue;
    }

    const mesh = gltf.meshes[node.mesh];
    if (mesh.primitives === undefined) {
      continue;
    }

    for (const primitive of mesh.primitives) {
      const attribute = primitive.glAttributes.find(
        (a: any) => a.attribute == "POSITION"
      );
      if (attribute === undefined) {
        continue;
      }

      const accessor = gltf.accessors[attribute.accessor];
      const assetMin = vec3.create();
      const assetMax = vec3.create();
      getExtentsFromAccessor(accessor, node.worldTransform, assetMin, assetMax);

      for (const i of [0, 1, 2]) {
        outMin[i] = Math.min(outMin[i], assetMin[i]);
        outMax[i] = Math.max(outMax[i], assetMax[i]);
      }
    }
  }
}

/**
 * Called from getSceneExtents()
 * @param accessor
 * @param worldTransform
 * @param outMin
 * @param outMax
 */
function getExtentsFromAccessor(
  accessor: gltfAccessor,
  worldTransform: mat4,
  outMin: vec3,
  outMax: vec3
) {
  const boxMin = vec3.create();
  let min = jsToGl(accessor.min) as vec3;
  // if (accessor.normalized) {
  //   vec3.normalize(min, min);
  // }
  vec3.transformMat4(boxMin, min, worldTransform);
  const boxMax = vec3.create();
  let max = jsToGl(accessor.max) as vec3;
  // if (accessor.normalized) {
  //   vec3.normalize(max, max);
  // }
  vec3.transformMat4(boxMax, max, worldTransform);
  const center = vec3.create();
  vec3.add(center, boxMax, boxMin);
  vec3.scale(center, center, 0.5);
  const centerToSurface = vec3.create();
  vec3.sub(centerToSurface, boxMax, center);
  const radius = vec3.length(centerToSurface);
  for (const i of [0, 1, 2]) {
    outMin[i] = center[i] - radius;
    outMax[i] = center[i] + radius;
  }
}

// marker interface used to for parsing the uniforms
class UniformStruct {}

function clamp(number: any, min: any, max: any) {
  return Math.min(Math.max(number, min), max);
}

export {
  fromKeys,
  initGlForMembers,
  jsToGl,
  objectsFromJsons,
  objectFromJson,
  getJsonIBLsFromExtensions,
  getSceneExtents,
  UniformStruct,
  clamp,
};
