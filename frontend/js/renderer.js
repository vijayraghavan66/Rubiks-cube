import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { getFaceDefinition } from "./cube-model.js";

const CUBIE_SPACING = 1.05;
const TURN_DURATION_MS = 280;
const CAMERA_DAMPING = 0.16;

const COLORS = {
  core: 0x101418,
  U: 0xf5f5f5,
  D: 0xf6d94f,
  R: 0xd9373c,
  L: 0xf08d2f,
  F: 0x2ea968,
  B: 0x2d62c9,
};

const AXIS_TO_VECTOR = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

function axisFromVector(vector) {
  const abs = {
    x: Math.abs(vector.x),
    y: Math.abs(vector.y),
    z: Math.abs(vector.z),
  };

  if (abs.x >= abs.y && abs.x >= abs.z) {
    return { axis: "x", sign: Math.sign(vector.x) || 1 };
  }
  if (abs.y >= abs.x && abs.y >= abs.z) {
    return { axis: "y", sign: Math.sign(vector.y) || 1 };
  }
  return { axis: "z", sign: Math.sign(vector.z) || 1 };
}

function orientationMatrixToQuaternion(orientation) {
  const matrix = new THREE.Matrix4();
  matrix.set(
    orientation[0][0], orientation[0][1], orientation[0][2], 0,
    orientation[1][0], orientation[1][1], orientation[1][2], 0,
    orientation[2][0], orientation[2][1], orientation[2][2], 0,
    0, 0, 0, 1,
  );
  const quaternion = new THREE.Quaternion();
  quaternion.setFromRotationMatrix(matrix);
  return quaternion;
}

function buildSticker(color) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.78),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.08,
    }),
  );
}

export class CubeRenderer {
  constructor(container, cubeModel) {
    this.container = container;
    this.cubeModel = cubeModel;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();

    this.cubieRoot = new THREE.Group();
    this.scene.add(this.cubieRoot);

    this.cubieMeshById = new Map();
    this.interactiveMeshes = [];
    this.stickerMeshes = [];

    this.turnQueue = [];
    this.activeTurn = null;

    this.cameraState = {
      yaw: 0.68,
      pitch: 0.52,
      distance: 9,
      targetYaw: 0.68,
      targetPitch: 0.52,
      targetDistance: 9,
    };

    this.callbacks = {
      onMoveApplied: () => {},
      onScrambleTextRequested: () => {},
    };

    this.lastFrameTime = 0;

    this.initScene();
    this.createCubies();
    this.syncAllCubies();
    this.attach();
    this.updateCamera();
    this.startLoop();
  }

  initScene() {
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x09131a, 12, 25);

    const ambient = new THREE.AmbientLight(0xffffff, 0.36);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xcde9ff, 0x13202b, 0.42);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff8e8, 1.2);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaec9ff, 0.55);
    fillLight.position.set(-6, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x5bc2ff, 0.25);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0d1720,
        transparent: true,
        opacity: 0.64,
        roughness: 0.9,
        metalness: 0.04,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  createCubies() {
    for (const cubie of this.cubeModel.cubies) {
      const group = new THREE.Group();
      group.userData.cubieId = cubie.id;

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.94, 0.94),
        new THREE.MeshStandardMaterial({ color: COLORS.core, roughness: 0.35, metalness: 0.2 }),
      );
      core.userData.cubieId = cubie.id;
      core.castShadow = true;
      core.receiveShadow = true;
      this.interactiveMeshes.push(core);
      group.add(core);

      const faces = this.getCubieFaceColors(cubie.home);
      Object.entries(faces).forEach(([face, color]) => {
        const sticker = buildSticker(color);
        sticker.userData.cubieId = cubie.id;
        sticker.userData.faceCode = face;

        if (face === "R") {
          sticker.position.x = 0.48;
          sticker.rotation.y = Math.PI / 2;
        } else if (face === "L") {
          sticker.position.x = -0.48;
          sticker.rotation.y = -Math.PI / 2;
        } else if (face === "U") {
          sticker.position.y = 0.48;
          sticker.rotation.x = -Math.PI / 2;
        } else if (face === "D") {
          sticker.position.y = -0.48;
          sticker.rotation.x = Math.PI / 2;
        } else if (face === "F") {
          sticker.position.z = 0.48;
        } else if (face === "B") {
          sticker.position.z = -0.48;
          sticker.rotation.y = Math.PI;
        }

        this.interactiveMeshes.push(sticker);
        this.stickerMeshes.push(sticker);
        sticker.castShadow = true;
        sticker.receiveShadow = true;
        group.add(sticker);
      });

      this.cubieRoot.add(group);
      this.cubieMeshById.set(cubie.id, group);
    }
  }

  getCubieFaceColors(home) {
    const faces = {};
    if (home.y === 1) faces.U = COLORS.U;
    if (home.y === -1) faces.D = COLORS.D;
    if (home.x === 1) faces.R = COLORS.R;
    if (home.x === -1) faces.L = COLORS.L;
    if (home.z === 1) faces.F = COLORS.F;
    if (home.z === -1) faces.B = COLORS.B;
    return faces;
  }

  attach() {
    this.renderer.domElement.classList.add("cube-canvas");
    this.container.appendChild(this.renderer.domElement);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = Math.max(width / Math.max(height, 1), 0.1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  updateCamera() {
    const c = this.cameraState;
    const cp = Math.cos(c.pitch);
    const x = c.distance * cp * Math.sin(c.yaw);
    const y = c.distance * Math.sin(c.pitch);
    const z = c.distance * cp * Math.cos(c.yaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  tickCameraSmoothing() {
    const c = this.cameraState;
    c.yaw += (c.targetYaw - c.yaw) * CAMERA_DAMPING;
    c.pitch += (c.targetPitch - c.pitch) * CAMERA_DAMPING;
    c.distance += (c.targetDistance - c.distance) * CAMERA_DAMPING;
    this.updateCamera();
  }

  orbitBy(deltaX, deltaY) {
    this.cameraState.targetYaw += deltaX * 0.006;
    this.cameraState.targetPitch += deltaY * 0.006;
    this.cameraState.targetPitch = Math.max(-1.2, Math.min(1.2, this.cameraState.targetPitch));
  }

  zoomBy(delta) {
    const scale = delta > 0 ? 1.08 : 0.92;
    this.cameraState.targetDistance = Math.max(5, Math.min(14, this.cameraState.targetDistance * scale));
  }

  rotateCameraByArrow(key) {
    const step = 0.12;
    if (key === "ArrowLeft") this.cameraState.targetYaw -= step;
    if (key === "ArrowRight") this.cameraState.targetYaw += step;
    if (key === "ArrowUp") this.cameraState.targetPitch += step;
    if (key === "ArrowDown") this.cameraState.targetPitch -= step;
    this.cameraState.targetPitch = Math.max(-1.2, Math.min(1.2, this.cameraState.targetPitch));
  }

  setCallbacks(callbacks) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks,
    };
  }

  syncCubie(cubie) {
    const mesh = this.cubieMeshById.get(cubie.id);
    if (!mesh) return;

    mesh.position.set(
      cubie.position.x * CUBIE_SPACING,
      cubie.position.y * CUBIE_SPACING,
      cubie.position.z * CUBIE_SPACING,
    );
    mesh.quaternion.copy(orientationMatrixToQuaternion(cubie.orientation));
  }

  syncAllCubies() {
    for (const cubie of this.cubeModel.cubies) {
      this.syncCubie(cubie);
    }
  }

  queueFaceMove(face, turns = 1, source = "input") {
    const def = getFaceDefinition(face);
    if (!def) return;

    const worldTurns = def.cwSign * turns;
    const token = this.cubeModel.toMoveToken(face, turns);

    this.turnQueue.push({
      axis: def.axis,
      layer: def.layer,
      turns: worldTurns,
      notation: token,
      source,
    });
  }

  queueLayerTurn(axis, layer, turns, source = "drag") {
    const normalized = turns % 4;
    if (normalized === 0) return;
    this.turnQueue.push({
      axis,
      layer,
      turns,
      notation: `${axis}${layer}:${turns}`,
      source,
    });
  }

  queueAlgorithm(algorithm, source = "algorithm") {
    const tokens = algorithm.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    tokens.forEach((token) => {
      const face = token[0].toUpperCase();
      let turns = 1;
      if (token.includes("2")) turns = 2;
      if (token.includes("'")) turns = -1;
      this.queueFaceMove(face, turns, source);
    });
  }

  applyAlgorithmInstant(algorithm, source = "instant") {
    const tokens = algorithm.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    tokens.forEach((token) => {
      this.cubeModel.applyMoveToken(token, true);
      this.callbacks.onMoveApplied({
        notation: token,
        source,
        solved: this.cubeModel.isSolved(),
      });
    });
    this.syncAllCubies();
  }

  clearPendingTurns() {
    this.turnQueue = [];
  }

  startTurn(turn) {
    const axisVector = AXIS_TO_VECTOR[turn.axis].clone();
    const selected = this.cubeModel.getLayerCubies(turn.axis, turn.layer);

    const pivot = new THREE.Group();
    this.cubieRoot.add(pivot);

    const meshes = selected
      .map((cubie) => this.cubieMeshById.get(cubie.id))
      .filter(Boolean);

    meshes.forEach((mesh) => pivot.attach(mesh));

    this.activeTurn = {
      ...turn,
      pivot,
      meshes,
      axisVector,
      startTime: performance.now(),
      totalAngle: turn.turns * (Math.PI / 2),
    };
  }

  finishTurn() {
    const turn = this.activeTurn;
    if (!turn) return;

    turn.pivot.setRotationFromAxisAngle(turn.axisVector, turn.totalAngle);
    turn.pivot.updateMatrixWorld(true);

    turn.meshes.forEach((mesh) => this.cubieRoot.attach(mesh));
    this.cubieRoot.remove(turn.pivot);

    this.cubeModel.rotateLayer(turn.axis, turn.layer, turn.turns, true, turn.notation);
    this.syncAllCubies();

    this.callbacks.onMoveApplied({
      axis: turn.axis,
      layer: turn.layer,
      turns: turn.turns,
      notation: turn.notation,
      source: turn.source,
      solved: this.cubeModel.isSolved(),
    });

    this.activeTurn = null;
  }

  updateTurnAnimation(now) {
    if (!this.activeTurn) {
      if (this.turnQueue.length > 0) {
        this.startTurn(this.turnQueue.shift());
      }
      return;
    }

    const turn = this.activeTurn;
    const elapsed = now - turn.startTime;
    const progress = Math.min(elapsed / TURN_DURATION_MS, 1);

    const smooth = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - (((-2 * progress) + 2) ** 3) / 2;
    const angle = turn.totalAngle * smooth;
    turn.pivot.setRotationFromAxisAngle(turn.axisVector, angle);

    if (progress >= 1) {
      this.finishTurn();
    }
  }

  startLoop() {
    const loop = (time) => {
      this.lastFrameTime = time;
      this.tickCameraSmoothing();
      this.updateTurnAnimation(time);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  isBusy() {
    return Boolean(this.activeTurn) || this.turnQueue.length > 0;
  }

  getIntersections(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.intersectObjects(this.interactiveMeshes, false);
  }

  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const intersects = this.raycaster.intersectObjects(this.stickerMeshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const cubieId = hit.object.userData.cubieId;
    if (!cubieId || !hit.face) return null;

    const normal = hit.face.normal.clone();
    normal.transformDirection(hit.object.matrixWorld);

    const snapped = axisFromVector(normal);
    const normalWorld = new THREE.Vector3(0, 0, 0);
    normalWorld[snapped.axis] = snapped.sign;

    return {
      cubieId,
      normalWorld,
      point: hit.point.clone(),
    };
  }

  projectDirectionToScreen(direction) {
    const center = new THREE.Vector3(0, 0, 0);
    const a = center.clone().project(this.camera);
    const b = center.clone().add(direction).project(this.camera);
    return new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
  }

  projectVectorAtPointToScreen(point, direction) {
    const a = point.clone().project(this.camera);
    const b = point.clone().add(direction).project(this.camera);
    const screenDelta = new THREE.Vector2(b.x - a.x, b.y - a.y);
    // Flip Y so positive means "up" in screen space.
    screenDelta.y *= -1;
    if (screenDelta.lengthSq() < 1e-8) {
      return null;
    }
    return screenDelta.normalize();
  }

  inferDragTurn(pickInfo, dragX, dragY) {
    const drag = new THREE.Vector2(dragX, dragY);
    if (drag.length() < 1) {
      return null;
    }

    const cubie = this.cubeModel.getCubieById(pickInfo.cubieId);
    if (!cubie) {
      return null;
    }

    const normal = pickInfo.normalWorld.clone().normalize();
    const cardinal = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];

    const tangentAxes = cardinal.filter((axis) => Math.abs(axis.dot(normal)) < 0.001);
    if (tangentAxes.length !== 2) {
      return null;
    }

    const pickPoint = pickInfo.point.clone();
    const projected = tangentAxes
      .map((axisVector) => {
        const screenDir = this.projectVectorAtPointToScreen(pickPoint, axisVector);
        return { axisVector, screenDir };
      })
      .filter((entry) => entry.screenDir && entry.screenDir.lengthSq() > 0);

    if (projected.length === 0) {
      return null;
    }

    const isHorizontalDrag = Math.abs(drag.x) >= Math.abs(drag.y);
    const targetComponent = isHorizontalDrag ? "x" : "y";
    const targetSign = isHorizontalDrag
      ? (Math.sign(drag.x) || 1)
      // Screen Y increases downward in pointer events, so upward drag is negative.
      : (Math.sign(-drag.y) || 1);

    let chosenAxis = null;
    let bestStrength = -1;
    for (const entry of projected) {
      const strength = Math.abs(entry.screenDir[targetComponent]);
      if (strength > bestStrength) {
        bestStrength = strength;
        chosenAxis = entry;
      }
    }

    if (!chosenAxis || bestStrength < 0.35) {
      return null;
    }

    // Align chosen world axis to positive screen direction of selected component,
    // then apply drag sign so opposite drags always reverse the turn.
    const axisScreenComponent = chosenAxis.screenDir[targetComponent];
    const axisToPositiveScreen = chosenAxis.axisVector.clone().multiplyScalar(Math.sign(axisScreenComponent) || 1);
    const moveDirection = axisToPositiveScreen.multiplyScalar(targetSign);

    const angularAxis = normal.clone().cross(moveDirection);
    if (angularAxis.lengthSq() < 1e-8) {
      return null;
    }

    const axisInfo = axisFromVector(angularAxis);
    const layer = cubie.position[axisInfo.axis];
    return {
      axis: axisInfo.axis,
      layer,
      turns: axisInfo.sign,
    };
  }
}
