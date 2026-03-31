import { useMemo } from "react";

export default function GridBoard({
	state,
	gridSize,
	history,
	obstacles = [],
	checkpoints = [],
	editMode = false,
	targetEditMode = false,
	checkpointEditMode = false,
	onToggleObstacle,
	onSetTarget,
	onToggleCheckpoint,
	steps = 0,
	maxSteps = 100,
}) {
	const {
		position,
		target,
		currentCheckpointIndex = 0,
		goalActive = true,
	} = state;
	const { height, width } = gridSize;

	const visitedCells = useMemo(() => {
		const visited = new Set();
		history.forEach((h) => visited.add(`${h.position[0]}-${h.position[1]}`));
		return visited;
	}, [history]);

	const obstacleSet = useMemo(
		() => new Set(obstacles.map(([x, y]) => `${x}-${y}`)),
		[obstacles],
	);

	const checkpointMap = useMemo(() => {
		const map = new Map();
		checkpoints.forEach(([x, y], index) => {
			map.set(`${x}-${y}`, index);
		});
		return map;
	}, [checkpoints]);

	function handleCellClick(x, y) {
		// Checkpoint edit mode
		if (checkpointEditMode && onToggleCheckpoint) {
			// Don't allow placing checkpoints on agent, target, or obstacles
			if (x === position[0] && y === position[1]) return;
			if (x === target[0] && y === target[1]) return;
			if (obstacleSet.has(`${x}-${y}`)) return;
			onToggleCheckpoint(x, y);
			return;
		}
		// Target edit mode
		if (targetEditMode && onSetTarget) {
			// Don't allow placing target on agent, obstacles, or checkpoints
			if (x === position[0] && y === position[1]) return;
			if (obstacleSet.has(`${x}-${y}`)) return;
			if (checkpointMap.has(`${x}-${y}`)) return;
			onSetTarget(x, y);
			return;
		}
		// Obstacle edit mode
		if (!editMode || !onToggleObstacle) return;
		// Don't allow placing obstacles on start, target, or checkpoints
		if (x === position[0] && y === position[1]) return;
		if (x === target[0] && y === target[1]) return;
		if (checkpointMap.has(`${x}-${y}`)) return;
		onToggleObstacle(x, y);
	}

	return (
		<div className="grid-board">
			{editMode && (
				<div className="edit-mode-banner">Click cells to toggle obstacles</div>
			)}
			{targetEditMode && (
				<div className="edit-mode-banner edit-mode-banner--target">
					Click a cell to set the target
				</div>
			)}
			{checkpointEditMode && (
				<div className="edit-mode-banner edit-mode-banner--checkpoint">
					Click cells to add/remove checkpoints (order matters!)
				</div>
			)}
			<div
				className="grid"
				style={{
					gridTemplateColumns: `repeat(${width}, var(--cell-size))`,
					gridTemplateRows: `repeat(${height}, var(--cell-size))`,
				}}
			>
				{Array.from({ length: height }).map((_, y) =>
					Array.from({ length: width }).map((_, x) => {
						const isAgent = position[0] === x && position[1] === y;
						const isTarget = target[0] === x && target[1] === y;
						const isObstacle = obstacleSet.has(`${x}-${y}`);
						const checkpointIndex = checkpointMap.get(`${x}-${y}`);
						const isCheckpoint = checkpointIndex !== undefined;
						const isVisitedCheckpoint =
							isCheckpoint && checkpointIndex < currentCheckpointIndex;
						const isNextCheckpoint =
							isCheckpoint && checkpointIndex === currentCheckpointIndex;
						const isVisited =
							!isAgent &&
							!isTarget &&
							!isObstacle &&
							!isCheckpoint &&
							visitedCells.has(`${x}-${y}`);

						const classes = [
							"cell",
							isAgent && "cell--agent",
							isTarget && !goalActive && "cell--target-inactive",
							isTarget && goalActive && "cell--target",
							isObstacle && "cell--obstacle",
							isCheckpoint && !isVisitedCheckpoint && "cell--checkpoint",
							isVisitedCheckpoint && "cell--checkpoint-visited",
							isNextCheckpoint && "cell--checkpoint-next",
							isVisited && "cell--visited",
							(editMode || targetEditMode || checkpointEditMode) &&
								"cell--editable",
						]
							.filter(Boolean)
							.join(" ");

						const energyPercent =
							maxSteps > 0 ? ((maxSteps - steps) / maxSteps) * 100 : 100;
						const energyLevel =
							energyPercent > 50
								? "high"
								: energyPercent > 25
									? "medium"
									: "low";

						return (
							<div
								key={`${x}-${y}`}
								className={classes}
								onClick={() => handleCellClick(x, y)}
							>
								{isAgent && (
									<div
										className={`agent-energy-container agent-energy--${energyLevel}`}
									>
										<svg className="agent-energy-ring" viewBox="0 0 36 36">
											<circle
												className="agent-energy-ring-bg"
												cx="18"
												cy="18"
												r="15.5"
											/>
											<circle
												className="agent-energy-ring-fill"
												cx="18"
												cy="18"
												r="15.5"
												style={{
													strokeDashoffset: 97.4 * (steps / maxSteps),
												}}
											/>
										</svg>
										<div className="agent-energy-center">
											<span className="agent-energy-text">
												{maxSteps - steps}
											</span>
										</div>
									</div>
								)}
								{isTarget && <div className="cell-dot target-dot" />}
								{isObstacle && !isAgent && (
									<div className="cell-dot obstacle-dot" />
								)}
								{isCheckpoint && !isAgent && (
									<div
										className={`checkpoint-marker ${isVisitedCheckpoint ? "checkpoint-marker--visited" : ""}`}
									>
										<span className="checkpoint-number">
											{checkpointIndex + 1}
										</span>
									</div>
								)}
								{isVisited && <div className="cell-dot visited-dot" />}
							</div>
						);
					}),
				)}
			</div>
		</div>
	);
}
