# System Architecture - Rubik's Cube Learning Platform

## 1) Core Design

The app uses a front-end-only architecture with a strict separation between:

- Cube state engine (pure logic)
- 3D rendering and animation
- Input translation (keyboard/mouse)
- Learning/training/timer domain features
- UI rendering and orchestration

## 2) Data Model

The cube uses a cubie model.

Each of the 27 cubies stores:

- immutable `home` coordinate: `(x, y, z)` in `{-1, 0, 1}`
- mutable `position` coordinate
- mutable `orientation` as an integer 3x3 rotation matrix

A layer turn is implemented by applying a quarter-turn rotation to:

- position vectors of affected cubies
- orientation basis of affected cubies

This guarantees mathematically valid cube states after arbitrarily many legal moves.

## 3) Rendering Model

- Three.js scene with one mesh group per cubie
- Stickers are attached to cubie meshes based on home-face color mapping
- During a move, affected cubies are attached to a temporary pivot group
- Pivot rotates smoothly over 250ms
- At completion, cubies are detached and snapped to exact discrete transforms from the cube model

## 4) Input Model

Keyboard:

- Face notation for outer-layer turns
- Shift modifier for prime turns
- Space and Backspace for app-level actions

Mouse:

- Empty-space drag -> orbit camera
- Face drag -> inferred layer turn
  - raycast cubie + face normal
  - drag threshold filtering
  - project world tangent axes to screen
  - derive best drag direction
  - infer rotation axis and layer index

## 5) Feature Modules

- Scramble generator: random legal sequence
- Learning mode: six beginner-method lessons with practice states
- Algorithm trainer: setup state + expected target state validation
- Speed mode timer: scramble -> inspection -> run -> auto-stop on solved

## 6) State Flow

`main.js` is the orchestration layer:

- initializes all modules
- routes events between renderer, input, and UI
- enforces busy checks and mode transitions
- updates localStorage-backed speed statistics
