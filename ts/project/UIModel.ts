import { merge, fromEvent } from "rxjs";
import { map, filter, takeUntil, mergeMap } from "rxjs/operators";
const normalizeWheel = require("normalize-wheel");

class UIModel {
  orbit: any;
  pan: any;
  zoom: any;

  constructor() {
    const canvas = document.getElementById("gfx");
    const inputObservables = UIModel.getInputObservables(canvas);
    this.orbit = inputObservables.orbit;
    this.pan = inputObservables.pan;
    this.zoom = inputObservables.zoom;
  }

  // app has to be the vuejs app instance
  static getInputObservables(inputDomElement: any) {
    const move = fromEvent(document, "mousemove");
    const mousedown = fromEvent(inputDomElement, "mousedown");
    const cancelMouse = merge(
      fromEvent(document, "mouseup"),
      fromEvent(document, "mouseleave")
    );

    const mouseOrbit = mousedown.pipe(
      filter((event: any) => event.button === 0 && event.shiftKey === false),
      mergeMap(() => move.pipe(takeUntil(cancelMouse))),
      map((mouse: any) => ({
        deltaPhi: mouse.movementX,
        deltaTheta: mouse.movementY,
      }))
    );

    const mousePan = mousedown.pipe(
      filter((event: any) => event.button === 1 || event.shiftKey === true),
      mergeMap(() => move.pipe(takeUntil(cancelMouse))),
      map((mouse: any) => ({
        deltaX: mouse.movementX,
        deltaY: mouse.movementY,
      }))
    );

    const smbZoom = mousedown.pipe(
      filter((event: any) => event.button === 2),
      mergeMap(() => move.pipe(takeUntil(cancelMouse))),
      map((mouse: any) => ({ deltaZoom: mouse.movementY }))
    );
    const wheelZoom = fromEvent(inputDomElement, "wheel").pipe(
      map((wheelEvent) => normalizeWheel(wheelEvent)),
      map((normalizedZoom) => ({ deltaZoom: normalizedZoom.spinY }))
    );
    inputDomElement.addEventListener(
      "onscroll",
      (event: any) => event.preventDefault(),
      false
    );
    const mouseZoom = merge(smbZoom, wheelZoom);
    const observables = {
      orbit: merge(mouseOrbit),
      pan: mousePan,
      zoom: merge(mouseZoom),
    };

    // disable context menu
    inputDomElement.oncontextmenu = () => false;

    return observables;
  }
}

export { UIModel };
