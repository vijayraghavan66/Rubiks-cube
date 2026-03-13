const IDENTITY_ORIENTATION = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1],
];

const FACE_TO_LAYER = {
	R: { axis: "x", layer: 1, cwSign: -1 },
	L: { axis: "x", layer: -1, cwSign: 1 },
	U: { axis: "y", layer: 1, cwSign: -1 },
	D: { axis: "y", layer: -1, cwSign: 1 },
	F: { axis: "z", layer: 1, cwSign: -1 },
	B: { axis: "z", layer: -1, cwSign: 1 },
};

function deepCloneMatrix(matrix) {
	return matrix.map((row) => [...row]);
}

function normalizeTurns(turns) {
	let value = turns % 4;
	if (value === 3) {
		value = -1;
	}
	if (value === -3) {
		value = 1;
	}
	return value;
}

function positiveQuarterTurns(turns) {
	return ((turns % 4) + 4) % 4;
}

function rotateVector(vector, axis, quarterTurn) {
	const q = positiveQuarterTurns(quarterTurn);
	let { x, y, z } = vector;

	for (let i = 0; i < q; i += 1) {
		if (axis === "x") {
			[y, z] = [-z, y];
		} else if (axis === "y") {
			[x, z] = [z, -x];
		} else if (axis === "z") {
			[x, y] = [-y, x];
		}
	}

	return { x, y, z };
}

function rotateOrientation(orientation, axis, quarterTurn) {
	const columns = [
		{ x: orientation[0][0], y: orientation[1][0], z: orientation[2][0] },
		{ x: orientation[0][1], y: orientation[1][1], z: orientation[2][1] },
		{ x: orientation[0][2], y: orientation[1][2], z: orientation[2][2] },
	].map((col) => rotateVector(col, axis, quarterTurn));

	return [
		[columns[0].x, columns[1].x, columns[2].x],
		[columns[0].y, columns[1].y, columns[2].y],
		[columns[0].z, columns[1].z, columns[2].z],
	];
}

function matrixEquals(a, b) {
	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			if (a[r][c] !== b[r][c]) {
				return false;
			}
		}
	}
	return true;
}

export class CubeModel {
	constructor() {
		this.cubies = [];
		this.moveHistory = [];
		this.reset();
	}

	reset() {
		this.cubies = [];
		this.moveHistory = [];
		let id = 0;

		for (let x = -1; x <= 1; x += 1) {
			for (let y = -1; y <= 1; y += 1) {
				for (let z = -1; z <= 1; z += 1) {
					this.cubies.push({
						id: id += 1,
						home: { x, y, z },
						position: { x, y, z },
						orientation: deepCloneMatrix(IDENTITY_ORIENTATION),
					});
				}
			}
		}
	}

	clone() {
		const clone = new CubeModel();
		clone.cubies = this.cubies.map((cubie) => ({
			id: cubie.id,
			home: { ...cubie.home },
			position: { ...cubie.position },
			orientation: deepCloneMatrix(cubie.orientation),
		}));
		clone.moveHistory = [...this.moveHistory];
		return clone;
	}

	equals(otherCube) {
		if (!otherCube || this.cubies.length !== otherCube.cubies.length) {
			return false;
		}

		for (let i = 0; i < this.cubies.length; i += 1) {
			const a = this.cubies[i];
			const b = otherCube.cubies[i];
			if (
				a.id !== b.id
				|| a.position.x !== b.position.x
				|| a.position.y !== b.position.y
				|| a.position.z !== b.position.z
			) {
				return false;
			}

			if (!matrixEquals(a.orientation, b.orientation)) {
				return false;
			}
		}

		return true;
	}

	isSolved() {
		return this.cubies.every((cubie) => {
			const inHome = (
				cubie.home.x === cubie.position.x
				&& cubie.home.y === cubie.position.y
				&& cubie.home.z === cubie.position.z
			);
			return inHome && matrixEquals(cubie.orientation, IDENTITY_ORIENTATION);
		});
	}

	getCubieById(cubieId) {
		return this.cubies.find((cubie) => cubie.id === cubieId) || null;
	}

	getLayerCubies(axis, layer) {
		return this.cubies.filter((cubie) => cubie.position[axis] === layer);
	}

	rotateLayer(axis, layer, quarterTurns, recordMove = true, notation = null) {
		const normalizedTurns = normalizeTurns(quarterTurns);
		if (normalizedTurns === 0) {
			return;
		}

		const positiveTurns = positiveQuarterTurns(normalizedTurns);

		const affected = this.getLayerCubies(axis, layer);
		for (const cubie of affected) {
			cubie.position = rotateVector(cubie.position, axis, positiveTurns);
			cubie.orientation = rotateOrientation(cubie.orientation, axis, positiveTurns);
		}

		if (recordMove) {
			this.moveHistory.push(notation || `${axis}${layer}:${normalizedTurns}`);
		}
	}

	rotateFace(face, turns = 1, recordMove = true) {
		const faceDef = FACE_TO_LAYER[face];
		if (!faceDef) {
			return;
		}

		const quarterTurns = faceDef.cwSign * turns;
		this.rotateLayer(faceDef.axis, faceDef.layer, quarterTurns, recordMove, this.toMoveToken(face, turns));
	}

	toMoveToken(face, turns) {
		const normalized = normalizeTurns(turns);
		if (normalized === 2) {
			return `${face}2`;
		}
		if (normalized === -1) {
			return `${face}'`;
		}
		return face;
	}

	applyMoveToken(token, recordMove = true) {
		const clean = token.trim();
		if (!clean) {
			return;
		}

		const face = clean[0].toUpperCase();
		if (!FACE_TO_LAYER[face]) {
			return;
		}

		let turns = 1;
		if (clean.includes("2")) {
			turns = 2;
		} else if (clean.includes("'")) {
			turns = -1;
		}

		this.rotateFace(face, turns, recordMove);
	}

	applyAlgorithm(algorithm, recordMove = true) {
		const tokens = algorithm
			.split(/\s+/)
			.map((move) => move.trim())
			.filter(Boolean);
		tokens.forEach((token) => this.applyMoveToken(token, recordMove));
	}
}

export function getFaceDefinition(face) {
	return FACE_TO_LAYER[face] || null;
}
