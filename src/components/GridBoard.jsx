import { useMemo } from "react";

export default function GridBoard({
	state,
	gridSize,
	history,
	obstacles = [],
	editMode = false,
	targetEditMode = false,
	onToggleObstacle,
	onSetTarget,
}) {
	const { position, target } = state;
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

	function handleCellClick(x, y) {
		if (targetEditMode && onSetTarget) {
			// Don't allow placing target on agent or obstacles
			if (x === position[0] && y === position[1]) return;
			if (obstacleSet.has(`${x}-${y}`)) return;
			onSetTarget(x, y);
			return;
		}
		if (!editMode || !onToggleObstacle) return;
		// Don't allow placing obstacles on start or target
		if (x === position[0] && y === position[1]) return;
		if (x === target[0] && y === target[1]) return;
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
						const isVisited =
							!isAgent &&
							!isTarget &&
							!isObstacle &&
							visitedCells.has(`${x}-${y}`);

						const classes = [
							"cell",
							isAgent && "cell--agent",
							isTarget && "cell--target",
							isObstacle && "cell--obstacle",
							isVisited && "cell--visited",
							(editMode || targetEditMode) && "cell--editable",
						]
							.filter(Boolean)
							.join(" ");

						return (
							<div
								key={`${x}-${y}`}
								className={classes}
								onClick={() => handleCellClick(x, y)}
							>
								{isAgent && <div className="cell-dot agent-dot" />}
								{isTarget && <div className="cell-dot target-dot" />}
								{isObstacle && !isAgent && (
									<div className="cell-dot obstacle-dot" />
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
