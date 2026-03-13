import { invertAlgorithm } from "./scramble.js";

export const TRAINING_ALGORITHMS = [
  {
    id: "right-trigger",
    name: "Right Trigger",
    algorithm: "R U R' U'",
    setup: "F R U R' U' F'",
    goal: "Practice first-layer corner insertion rhythm.",
  },
  {
    id: "sune",
    name: "Sune",
    algorithm: "R U R' U R U2 R'",
    setup: "R U2 R2 F R F' U2 R' F R F'",
    goal: "Train last-layer orientation speed and finger tricks.",
  },
  {
    id: "sexy-wide",
    name: "Double Trigger",
    algorithm: "R U R' U' R U R' U'",
    setup: "L U2 L' U' F U F' U",
    goal: "Improve move fluidity and lookahead on repeated triggers.",
  },
  {
    id: "pll-u",
    name: "U Perm",
    algorithm: "R U' R U R U R U' R' U' R2",
    setup: "R2 U R U R' U' R' U' R' U R'",
    goal: "Train edge permutation execution under pressure.",
  },
];

export class AlgorithmTrainer {
  constructor(cubeModel) {
    this.cubeModel = cubeModel;
    this.active = false;
    this.current = null;
    this.expectedState = null;
    this.lastResult = null;
  }

  start(item) {
    this.active = true;
    this.current = item;
    this.lastResult = null;

    const target = this.cubeModel.clone();
    target.reset();
    target.applyAlgorithm(item.setup, false);
    target.applyAlgorithm(item.algorithm, false);
    this.expectedState = target;

    return {
      setup: item.setup,
      inverseSetup: invertAlgorithm(item.setup),
      algorithm: item.algorithm,
      goal: item.goal,
    };
  }

  stop() {
    this.active = false;
    this.current = null;
    this.expectedState = null;
    this.lastResult = null;
  }

  checkProgress() {
    if (!this.active || !this.expectedState) {
      return { active: false, success: false };
    }

    const success = this.cubeModel.equals(this.expectedState);
    this.lastResult = success;
    return {
      active: true,
      success,
      algorithm: this.current.algorithm,
      name: this.current.name,
    };
  }
}
