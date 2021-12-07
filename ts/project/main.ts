import { WebIO, Texture } from "@gltf-transform/core";
import { glMatrix } from "gl-matrix";

async function main() {
  const io = new WebIO();
  const doc = await io.read(
    "https://agile-hamlet-83897.herokuapp.com/https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/BoxTextured/glTF-Binary/BoxTextured.glb"
  );

  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh) => {
      let testArray = mesh
        .listPrimitives()[0]
        .getAttribute("POSITION")
        ?.getElement(1, []);
      console.log(testArray);

      const tex = mesh.listPrimitives()[0].getMaterial()?.getBaseColorTexture();
      const texSize = tex?.getSize();
      const rawData = tex?.getImage() as Uint8ClampedArray;
      const imageD = new ImageData(rawData, texSize![0], texSize![1]);
      const imageBitmap = createImageBitmap(imageD);
    });
}

main();
// import { CANVAS_SIZE } from "./constants";
// import { GltfView } from "./GltfView";
// import glslangModule from "@webgpu/glslang/dist/web-devel-onefile/glslang";

// async function main() {
//   // get <canvas> from index.html and fix its size to be CANVAS_SIZE x CANVAS_SIZE
//   const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
//   canvas.width = canvas.height = CANVAS_SIZE;
//   // get a GPUAdapter, GPUDevice, and Glslang (in order to use glsl shaders)
//   const adapter = await navigator.gpu?.requestAdapter();
//   const device = (await adapter?.requestDevice()) as GPUDevice;
//   const glslang = (await glslangModule()) as any;
//   // create a GltfView
//   const view = new GltfView(canvas, device, glslang);
//   // create a ResourceLoader
//   const resourceLoader = view.createResourceLoader();
//   // create a GltfState
//   const state = view.createState();
//   // load gltf
//   state.gltf = await resourceLoader.loadGltf("BoxTextured"); // FIXME: user can choose which file to load
//   // choose the scene to render
//   const defaultScene = state.gltf.scene;
//   state.sceneIndex = defaultScene === undefined ? 0 : defaultScene;
//   if (state.gltf.scenes.length === 0) {
//     // if there is no scene, return immediately
//     return;
//   }
//   const scene = state.gltf.scenes[state.sceneIndex];
//   scene.applyTransformHierarchy(state.gltf);
//   state.userCamera.aspectRatio = canvas.width / canvas.height;
//   state.userCamera.fitViewToScene(state.gltf, state.sceneIndex);
//   view.renderer.init(state, scene);
//   const update = () => {
//     view.renderer.webGPU.draw();
//     window.requestAnimationFrame(update);
//   };
//   // After this start executing animation loop.
//   window.requestAnimationFrame(update);
// }

// main();

// import * as THREE from "three";

// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
// import { RoughnessMipmapper } from "three/examples/jsm/utils/RoughnessMipmapper.js";

// let camera: any, scene: any, renderer: any;

// init();
// render();

// function init() {
//   const container = document.createElement("div");
//   document.body.appendChild(container);

//   camera = new THREE.PerspectiveCamera(
//     45,
//     window.innerWidth / window.innerHeight,
//     0.25,
//     20
//   );
//   camera.position.set(-1.8, 0.6, 2.7);

//   scene = new THREE.Scene();

//   new RGBELoader()
//     // .setPath("textures/equirectangular/")
//     .load(
//       "https://agile-hamlet-83897.herokuapp.com/https://github.com/mrdoob/three.js/raw/dev/examples/textures/equirectangular/royal_esplanade_1k.hdr",
//       function (texture) {
//         texture.mapping = THREE.EquirectangularReflectionMapping;

//         scene.background = texture;
//         scene.environment = texture;

//         render();

//         // model

//         // use of RoughnessMipmapper is optional
//         const roughnessMipmapper = new RoughnessMipmapper(renderer);

//         // const loader = new GLTFLoader().setPath(
//         //   "models/gltf/DamagedHelmet/glTF/"
//         // );
//         const loader = new GLTFLoader();
//         loader.load(
//           "https://agile-hamlet-83897.herokuapp.com/https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf",
//           function (gltf) {
//             console.log(gltf.scene);
//             console.log(gltf.animations);
//             console.log(gltf.scenes);
//             console.log(gltf.cameras);
//             console.log(gltf.asset);

//             gltf.scene.traverse(function (child: any) {
//               if (child.isMesh) {
//                 roughnessMipmapper.generateMipmaps(child.material);
//               }
//             });

//             scene.add(gltf.scene);

//             roughnessMipmapper.dispose();

//             render();
//           }
//         );
//       }
//     );

//   renderer = new THREE.WebGLRenderer({ antialias: true });
//   renderer.setPixelRatio(window.devicePixelRatio);
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   renderer.toneMapping = THREE.ACESFilmicToneMapping;
//   renderer.toneMappingExposure = 1;
//   renderer.outputEncoding = THREE.sRGBEncoding;
//   container.appendChild(renderer.domElement);

//   const controls = new OrbitControls(camera, renderer.domElement);
//   controls.addEventListener("change", render); // use if there is no animation loop
//   controls.minDistance = 2;
//   controls.maxDistance = 10;
//   controls.target.set(0, 0, -0.2);
//   controls.update();

//   window.addEventListener("resize", onWindowResize);
// }

// function onWindowResize() {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();

//   renderer.setSize(window.innerWidth, window.innerHeight);

//   render();
// }

// //

// function render() {
//   renderer.render(scene, camera);
// }
