export class GridWorld {
	constructor(
		height = 10,
		width = 10,
		startingPosition = [0, 0],
		targetPosition = [8, 8],
		obstacles = [],
		checkpoints = [],
	) {
		this.height = height;
		this.width = width;
		this.startingPosition = [...startingPosition];
		this.targetPosition = [...targetPosition];
		this.obstacles = new Set(obstacles.map(([x, y]) => `${x}-${y}`));
		this.checkpoints = checkpoints.map(([x, y]) => [x, y]);
		this.currentCheckpointIndex = 0;

		this.currentPosition = [...startingPosition];
		this.maxSteps = height * width;
		this.steps = 0;
	}

	isObstacle(x, y) {
		return this.obstacles.has(`${x}-${y}`);
	}

	setObstacles(obstacles) {
		this.obstacles = new Set(obstacles.map(([x, y]) => `${x}-${y}`));
	}

	setTarget(x, y) {
		this.targetPosition = [x, y];
	}

	setCheckpoints(checkpoints) {
		this.checkpoints = checkpoints.map(([x, y]) => [x, y]);
		this.currentCheckpointIndex = 0;
	}

	isGoalActive() {
		return this.currentCheckpointIndex >= this.checkpoints.length;
	}

	getCheckpointIndex(x, y) {
		return this.checkpoints.findIndex(([cx, cy]) => cx === x && cy === y);
	}

	reset() {
		this.currentPosition = [...this.startingPosition];
		this.currentCheckpointIndex = 0;
		this.steps = 0;
		return this.getState();
	}

	getState() {
		return {
			position: [...this.currentPosition],
			target: [...this.targetPosition],
			currentCheckpointIndex: this.currentCheckpointIndex,
			checkpoints: this.checkpoints.map((c) => [...c]),
			goalActive: this.isGoalActive(),
		};
	}

	step(action) {
		let [x, y] = this.currentPosition;
		let newX = x;
		let newY = y;
		let reward = -0.01;
		let done = false;

		switch (action) {
			case "up":
				if (y > 0) newY = y - 1;
				else reward = -0.1;
				break;

			case "down":
				if (y < this.height - 1) newY = y + 1;
				else reward = -0.1;
				break;

			case "left":
				if (x > 0) newX = x - 1;
				else reward = -0.1;
				break;

			case "right":
				if (x < this.width - 1) newX = x + 1;
				else reward = -0.1;
				break;

			default:
				break;
		}

		// Check obstacle collision – treat like hitting a wall
		if (this.isObstacle(newX, newY)) {
			newX = x;
			newY = y;
			reward = -0.1;
		}

		this.currentPosition = [newX, newY];
		this.steps++;

		// Check if reached the next checkpoint in sequence
		const checkpointIdx = this.getCheckpointIndex(newX, newY);
		if (checkpointIdx === this.currentCheckpointIndex) {
			reward = 0.5; // Intermediate reward for correct checkpoint
			this.currentCheckpointIndex++;
		}

		// Check goal - only active if all checkpoints visited
		if (newX === this.targetPosition[0] && newY === this.targetPosition[1]) {
			if (this.isGoalActive()) {
				reward = 1.0;
				done = true;
			} else {
				reward = -0.1; // Penalty for reaching goal without all checkpoints
			}
		}

		if (this.steps >= this.maxSteps) {
			done = true;
		}

		return {
			state: this.getState(),
			reward,
			done,
			steps: this.steps,
			maxSteps: this.maxSteps,
		};
	}
}
