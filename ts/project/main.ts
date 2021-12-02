import Renderer from "./renderer";
import { CANVAS_SIZE } from "./constants";

const canvas = document.getElementById("gfx") as HTMLCanvasElement;
canvas.width = canvas.height = CANVAS_SIZE; // ! is this supposed to be 640 and 640?
const renderer = new Renderer(canvas);
renderer.start();
