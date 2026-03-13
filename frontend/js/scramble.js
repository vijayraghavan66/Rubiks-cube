const FACES = ["R", "L", "U", "D", "F", "B"];
const MODIFIERS = ["", "'", "2"];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

export function generateScramble(length = 20) {
  const moves = [];

  while (moves.length < length) {
    const face = FACES[randomInt(FACES.length)];
    const last = moves[moves.length - 1];

    if (last && last[0] === face) {
      continue;
    }

    const modifier = MODIFIERS[randomInt(MODIFIERS.length)];
    moves.push(`${face}${modifier}`);
  }

  return moves;
}

export function scrambleToString(scrambleMoves) {
  return scrambleMoves.join(" ");
}

export function invertMove(move) {
  if (move.includes("2")) {
    return move;
  }
  if (move.includes("'")) {
    return move.replace("'", "");
  }
  return `${move}'`;
}

export function invertAlgorithm(algorithm) {
  const tokens = algorithm.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  return tokens.reverse().map(invertMove).join(" ");
}
