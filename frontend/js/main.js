import { CubeModel } from "./cube-model.js";
import { CubeRenderer } from "./renderer.js";
import { InputController } from "./controls.js";
import { generateScramble, scrambleToString } from "./scramble.js";
import { LESSONS } from "./learning.js";
import { AlgorithmTrainer, TRAINING_ALGORITHMS } from "./trainer.js";
import { SpeedTimer } from "./timer.js";
import { AppUI } from "./ui.js";

const cubeModel = new CubeModel();
const cubeContainer = document.getElementById("cube-container");
const renderer = new CubeRenderer(cubeContainer, cubeModel);
const trainer = new AlgorithmTrainer(cubeModel);
const timer = new SpeedTimer();
const ui = new AppUI({ lessons: LESSONS, trainerItems: TRAINING_ALGORITHMS });

let speedMode = false;

function resetCube() {
  if (renderer.isBusy()) {
    ui.toast("Wait for current animation to finish.");
    return;
  }

  renderer.clearPendingTurns();
  cubeModel.reset();
  renderer.syncAllCubies();
  trainer.stop();
  timer.reset();
  ui.setTimer("0.00");
  ui.setScramble("Solved. Press Shuffle when ready.");
  ui.renderTrainerMessage("Pick an algorithm and start a drill.");
}

function applyScramble({ instant = false, forSpeedMode = false } = {}) {
  if (renderer.isBusy()) {
    ui.toast("Wait for current animation to finish.");
    return;
  }

  renderer.clearPendingTurns();
  cubeModel.reset();
  renderer.syncAllCubies();

  const scrambleMoves = generateScramble(20);
  const scrambleText = scrambleToString(scrambleMoves);
  ui.setScramble(scrambleText);

  if (instant) {
    renderer.applyAlgorithmInstant(scrambleText, "scramble");
  } else {
    renderer.queueAlgorithm(scrambleText, "scramble");
  }

  if (forSpeedMode) {
    timer.beginInspection();
    ui.toast("Inspection ready. Press Space to start timer.");
  }
}

function toggleSpeedMode() {
  speedMode = !speedMode;
  ui.setSpeedMode(speedMode);
  timer.reset();
  ui.setTimer("0.00");

  if (speedMode) {
    ui.toast("Speed mode enabled. Press Space to generate scramble.");
  } else {
    ui.toast("Speed mode disabled.");
  }
}

function onSpacePressed() {
  if (!speedMode) {
    // In normal mode, Space is a quick shortcut for animated shuffle.
    applyScramble({ instant: false, forSpeedMode: false });
    return;
  }

  const stats = timer.getStats();
  if (stats.phase === "idle") {
    applyScramble({ instant: true, forSpeedMode: true });
    return;
  }

  if (stats.phase === "inspection") {
    timer.start();
    ui.toast("Timer started. Solve the cube.");
  }
}

function startLessonPractice() {
  if (renderer.isBusy()) {
    ui.toast("Wait for current animation to finish.");
    return;
  }

  const lesson = ui.getCurrentLesson();
  renderer.clearPendingTurns();
  cubeModel.reset();
  renderer.syncAllCubies();
  renderer.applyAlgorithmInstant(lesson.practiceScramble, "lesson-practice");

  ui.setScramble(lesson.practiceScramble);
  ui.renderTrainerMessage(
    `${lesson.title} practice loaded. Execute the key algorithm:`,
    lesson.algorithm,
  );
  ui.toast("Lesson practice state is ready.");
}

function startTrainer() {
  if (renderer.isBusy()) {
    ui.toast("Wait for current animation to finish.");
    return;
  }

  const selectedId = ui.getSelectedTrainerId();
  const item = TRAINING_ALGORITHMS.find((entry) => entry.id === selectedId);
  if (!item) {
    return;
  }

  renderer.clearPendingTurns();
  cubeModel.reset();
  renderer.syncAllCubies();

  const session = trainer.start(item);
  renderer.applyAlgorithmInstant(session.setup, "trainer-setup");
  ui.setScramble(session.setup);
  ui.renderTrainerMessage(`Goal: ${session.goal}. Execute this algorithm:`, session.algorithm);
  ui.toast(`Trainer ready: ${item.name}`);
}

renderer.setCallbacks({
  onMoveApplied: ({ source, solved }) => {
    if (source === "keyboard" || source === "mouse") {
      const progress = trainer.checkProgress();
      if (progress.active && progress.success) {
        ui.toast(`Algorithm complete: ${progress.name}`);
      }
    }

    const stats = timer.getStats();
    if (speedMode && stats.phase === "running" && solved) {
      const time = timer.stop();
      ui.toast(`Solved in ${(time / 1000).toFixed(2)}s`);
      ui.renderStats(timer.getStats());
      ui.setTimer("0.00");
    }
  },
});

new InputController({
  renderer,
  canvas: renderer.renderer.domElement,
  onFaceMove: (face, turns, source) => renderer.queueFaceMove(face, turns, source),
  onLayerTurn: (axis, layer, turns, source) => renderer.queueLayerTurn(axis, layer, turns, source),
  onScramble: () => applyScramble({ instant: false, forSpeedMode: false }),
  onReset: resetCube,
  onSpace: onSpacePressed,
});

ui.onScramble(() => applyScramble({ instant: false, forSpeedMode: false }));
ui.onReset(resetCube);
ui.onSpeedToggle(toggleSpeedMode);
ui.onPracticeLesson(startLessonPractice);
ui.onStartTrainer(startTrainer);

ui.renderStats(timer.getStats());
ui.setSpeedMode(false);
ui.setScramble("Solved. Press Shuffle when ready.");

function updateTimerFrame() {
  const elapsed = timer.tick();
  if (elapsed != null) {
    ui.setTimer((elapsed / 1000).toFixed(2));
  }
  requestAnimationFrame(updateTimerFrame);
}

requestAnimationFrame(updateTimerFrame);
