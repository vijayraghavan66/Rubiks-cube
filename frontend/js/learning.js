export const LESSONS = [
  {
    id: "white-cross",
    title: "1. White Cross",
    objective: "Build a white cross on the Down face while matching side colors with center pieces.",
    algorithm: "F R U R' U' F'",
    explanation:
      "Start by locating white edge pieces and bring them to the top layer. Align each edge with its side center, then insert it to the bottom to form a complete, color-matched cross.",
    tips: [
      "Use U turns to align an edge before inserting.",
      "Double-check side color matching before locking an edge.",
    ],
    practiceScramble: "R U F' U2 L D R' F",
  },
  {
    id: "white-corners",
    title: "2. White Corners",
    objective: "Insert all white corners to complete the first layer.",
    algorithm: "R U R' U'",
    explanation:
      "Place each white corner above its destination slot. Repeat the right trigger until the corner is correctly oriented and inserted.",
    tips: [
      "Corner belongs where its three colors meet.",
      "If a corner is stuck in the bottom layer, eject it first, then reinsert.",
    ],
    practiceScramble: "R U R' U' F' U F U2",
  },
  {
    id: "middle-layer",
    title: "3. Middle Layer",
    objective: "Insert non-yellow edges into the middle layer.",
    algorithm: "U R U' R' U' F' U F",
    explanation:
      "Find an edge in the top layer without yellow. Align it with its center, then use the right or left insertion algorithm depending on target direction.",
    tips: [
      "Top color alignment first, insertion second.",
      "If all top edges have yellow, kick out a bad middle edge.",
    ],
    practiceScramble: "F U R U' R' F' U2 L U L'",
  },
  {
    id: "yellow-cross",
    title: "4. Yellow Cross",
    objective: "Orient yellow edges to form a yellow cross on the Up face.",
    algorithm: "F R U R' U' F'",
    explanation:
      "Apply the algorithm from line, L-shape, or dot states until all yellow edges point up.",
    tips: [
      "For L-shape, keep it in the top-left orientation before applying.",
      "For line, keep it horizontal.",
    ],
    practiceScramble: "R U2 R2 F R F' U2 R' F R F'",
  },
  {
    id: "yellow-corners",
    title: "5. Yellow Corners",
    objective: "Orient yellow corner stickers to complete the yellow face.",
    algorithm: "R U R' U R U2 R'",
    explanation:
      "Use a corner orientation algorithm repeatedly while keeping solved corners in place and cycling unsolved ones.",
    tips: [
      "Focus on orientation, not exact corner location yet.",
      "Repeat patiently; this step is algorithm-heavy.",
    ],
    practiceScramble: "F R U R' U' F' U R U2 R'",
  },
  {
    id: "final-permutation",
    title: "6. Final Permutation",
    objective: "Permute last-layer corners and edges to solve the cube.",
    algorithm: "R U' R U R U R U' R' U' R2",
    explanation:
      "After orienting yellow, finish by permuting pieces. Use corner cycles first, then edge cycles until the cube is solved.",
    tips: [
      "Do not break solved blocks.",
      "Keep track of where each solved side should move.",
    ],
    practiceScramble: "R2 U R U R' U' R' U' R' U R'",
  },
];
