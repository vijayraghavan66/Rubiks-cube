const DRAG_THRESHOLD = 20;

export class InputController {
  constructor({
    renderer,
    canvas,
    onFaceMove,
    onLayerTurn,
    onScramble,
    onReset,
    onSpace,
  }) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.onFaceMove = onFaceMove;
    this.onLayerTurn = onLayerTurn;
    this.onScramble = onScramble;
    this.onReset = onReset;
    this.onSpace = onSpace;

    this.pointerState = {
      mode: "idle",
      startX: 0,
      startY: 0,
      pickInfo: null,
      consumed: false,
    };

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));

    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    window.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointercancel", (event) => this.onPointerUp(event));

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.renderer.zoomBy(event.deltaY);
    }, { passive: false });
  }

  onKeyDown(event) {
    const key = event.key;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      event.preventDefault();
      this.renderer.rotateCameraByArrow(key);
      return;
    }

    if (key === " ") {
      event.preventDefault();
      this.onSpace();
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      this.onReset();
      return;
    }

    const face = key.toUpperCase();
    if (["R", "L", "U", "D", "F", "B"].includes(face)) {
      event.preventDefault();
      const turns = event.shiftKey ? -1 : 1;
      this.onFaceMove(face, turns, "keyboard");
      return;
    }

    if (key.toLowerCase() === "s") {
      event.preventDefault();
      this.onScramble();
    }
  }

  onPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    this.canvas.setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;

    const pickInfo = this.renderer.pick(event.clientX, event.clientY);
    this.pointerState = {
      mode: pickInfo ? "layer-pending" : "orbit",
      startX: event.clientX,
      startY: event.clientY,
      pickInfo,
      consumed: false,
    };
  }

  onPointerMove(event) {
    if (this.pointerState.mode === "idle") {
      return;
    }

    if (this.pointerId != null && event.pointerId !== this.pointerId) {
      return;
    }

    const dx = event.clientX - this.pointerState.startX;
    const dy = event.clientY - this.pointerState.startY;

    if (this.pointerState.mode === "orbit") {
      this.renderer.orbitBy(dx, dy);
      this.pointerState.startX = event.clientX;
      this.pointerState.startY = event.clientY;
      return;
    }

    if (this.pointerState.mode === "layer-pending") {
      const dragDistance = Math.hypot(dx, dy);
      if (dragDistance < DRAG_THRESHOLD || this.pointerState.consumed) {
        return;
      }

      const turn = this.renderer.inferDragTurn(this.pointerState.pickInfo, dx, dy);
      if (turn) {
        this.onLayerTurn(turn.axis, turn.layer, turn.turns, "mouse");
        this.pointerState.consumed = true;
      } else {
        this.pointerState.mode = "orbit";
      }
    }
  }

  onPointerUp(event) {
    if (event && this.pointerId != null && event.pointerId !== this.pointerId) {
      return;
    }

    if (this.pointerId != null && this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }

    this.pointerId = null;
    this.pointerState = {
      mode: "idle",
      startX: 0,
      startY: 0,
      pickInfo: null,
      consumed: false,
    };
  }
}
