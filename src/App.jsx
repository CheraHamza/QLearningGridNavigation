import { useState, useEffect, useRef, useCallback } from "react";
import { useGridWorld } from "./hooks/useGridWorld";
import { fetchAction, trainBatch, resetAgent, healthCheck } from "./api/agent";
import GridBoard from "./components/GridBoard";
import Controls from "./components/Controls";
import StatusPanel from "./components/StatusPanel";
import HistoryPanel from "./components/HistoryPanel";
import ModelManager from "./components/ModelManager";
import {
	RefreshCcw,
	Cpu,
	Play,
	Square,
	Zap,
	PenTool,
	Trash2,
} from "lucide-react";

export default function App() {
	const {
		state,
		reward,
		done,
		gridSize,
		episode,
		lastAction,
		history,
		steps,
		maxSteps,
		obstacles,
		initialize,
		step,
		reset,
		toggleObstacle,
		clearObstacles,
		setObstaclesDirectly,
	} = useGridWorld();

	const [isAutoRunning, setIsAutoRunning] = useState(false);
	const [currentEpsilon, setCurrentEpsilon] = useState(1.0);
	const [isTraining, setIsTraining] = useState(false);
	const [trainResult, setTrainResult] = useState(null);
	const [editMode, setEditMode] = useState(false);

	// Backend connection status: "connected" | "connecting" | "disconnected"
	const [backendStatus, setBackendStatus] = useState("connecting");

	const stepRef = useRef(step);
	const resetRef = useRef(reset);
	const skipResetOnObstacleChangeRef = useRef(false);
	stepRef.current = step;
	resetRef.current = reset;

	// --- Backend health polling ---
	const checkBackend = useCallback(async (timeoutMs) => {
		try {
			await healthCheck(timeoutMs);
			setBackendStatus("connected");
			return true;
		} catch {
			return false;
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		let retryId = null;
		let failCount = 0;

		function startRetryPolling() {
			if (retryId) return; // already polling
			retryId = setInterval(async () => {
				setBackendStatus("connecting");
				// Use a 15 s timeout for retries (shorter than initial cold-start)
				const ok = await checkBackend(15000);
				if (cancelled) return;
				if (ok) {
					clearInterval(retryId);
					retryId = null;
					failCount = 0;
				} else {
					failCount++;
					// After 2+ consecutive failures, mark disconnected
					if (failCount >= 2) setBackendStatus("disconnected");
				}
			}, 10000);
		}

		// Initial probe — use a long timeout (60 s) for Render cold-starts
		(async () => {
			const ok = await checkBackend(60000);
			if (cancelled) return;
			if (!ok) {
				setBackendStatus("connecting");
				startRetryPolling();
			}
		})();

		// Heartbeat: check every 30 s when connected (short 10 s timeout)
		const heartbeat = setInterval(async () => {
			const ok = await checkBackend(10000);
			if (cancelled) return;
			if (!ok) {
				setBackendStatus("connecting");
				startRetryPolling();
			}
		}, 30000);

		return () => {
			cancelled = true;
			clearInterval(heartbeat);
			if (retryId) clearInterval(retryId);
		};
	}, [checkBackend]);

	useEffect(() => {
		initialize();
	}, [initialize]);

	// Keyboard navigation
	useEffect(() => {
		function handleKeyDown(e) {
			if (done) return;
			const actions = {
				ArrowUp: "up",
				ArrowDown: "down",
				ArrowLeft: "left",
				ArrowRight: "right",
			};
			if (actions[e.key]) stepRef.current(actions[e.key]);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [done]);

	async function stepFromBackend() {
		if (!state) return;

		const payload = {
			position: state.position,
			target: state.target,
			obstacles,
			reward,
			done,
		};

		try {
			const data = await fetchAction(payload);

			if (data.epsilon !== undefined) {
				setCurrentEpsilon(data.epsilon);
			}

			if (!data.action) {
				throw new Error("No action returned from backend");
			}

			if (data.action === "stop") {
				setTimeout(() => resetRef.current(), 10);
				return;
			}

			stepRef.current(data.action);
		} catch (error) {
			console.error("Backend step failed:", error);
			setIsAutoRunning(false);
		}
	}

	// Auto-run loop
	useEffect(() => {
		let timeoutId;
		if (isAutoRunning) {
			timeoutId = setTimeout(stepFromBackend, 50);
		}
		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAutoRunning, done, state]);

	function handleModelLoaded(newEpsilon, envConfig) {
		setCurrentEpsilon(newEpsilon);
		setTrainResult(null);
		skipResetOnObstacleChangeRef.current = true;
		if (envConfig?.obstacles) {
			setObstaclesDirectly(envConfig.obstacles);
		} else {
			setObstaclesDirectly([]);
		}
		reset();
	}

	async function handleTurboTrain(episodes = 500) {
		setIsTraining(true);
		setIsAutoRunning(false);
		try {
			const data = await trainBatch(episodes, obstacles);
			setCurrentEpsilon(data.epsilon);

			// Compute summary stats
			const successes = data.results.filter((r) => r.reached_target).length;
			const avgSteps =
				data.results.reduce((sum, r) => sum + r.steps, 0) / data.results.length;
			const last50 = data.results.slice(-50);
			const last50Success = last50.filter((r) => r.reached_target).length;

			setTrainResult({
				episodes: data.episodes_trained,
				successRate: ((successes / data.results.length) * 100).toFixed(1),
				avgSteps: avgSteps.toFixed(1),
				last50SuccessRate: ((last50Success / last50.length) * 100).toFixed(1),
				epsilon: data.epsilon.toFixed(4),
			});

			reset();
		} catch (error) {
			console.error("Turbo train failed:", error);
		} finally {
			setIsTraining(false);
		}
	}

	// Reset agent when obstacles change (environment changed = old Q-table invalid)
	const prevObstaclesRef = useRef(obstacles);
	useEffect(() => {
		const prev = prevObstaclesRef.current;
		prevObstaclesRef.current = obstacles;

		// Skip on initial render
		if (prev === obstacles) return;

		// Skip reset if the obstacle change came from loading a model
		if (skipResetOnObstacleChangeRef.current) {
			skipResetOnObstacleChangeRef.current = false;
			return;
		}

		// Environment changed — reset the backend agent & training results
		setTrainResult(null);
		resetAgent()
			.then((data) => setCurrentEpsilon(data.epsilon))
			.catch(() => {});
	}, [obstacles]);

	if (!state) return null;

	return (
		<div className="app">
			<header className="app-header">
				<h1>RL Grid Navigation</h1>
				<p className="app-subtitle">Reinforcement Learning Agent Playground</p>
				<div className={`backend-status backend-status--${backendStatus}`}>
					<span className="backend-status-dot" />
					{backendStatus === "connected" && "Backend connected"}
					{backendStatus === "connecting" && "Waking up backend…"}
					{backendStatus === "disconnected" && "Backend unreachable"}
				</div>
			</header>

			<main className="app-content">
				<div className="main-area">
					<GridBoard
						state={state}
						gridSize={gridSize}
						history={history}
						obstacles={obstacles}
						editMode={editMode}
						onToggleObstacle={toggleObstacle}
					/>
					<Controls onStep={step} done={done} />
				</div>

				<aside className="sidebar">
					<StatusPanel
						episode={episode}
						steps={steps}
						maxSteps={maxSteps}
						reward={reward}
						epsilon={currentEpsilon}
						done={done}
						lastAction={lastAction}
					/>

					<div className="card">
						<h3 className="card-title">Agent Controls</h3>
						<div className="agent-controls">
							<button className="btn btn-secondary" onClick={reset}>
								<RefreshCcw size={16} />
								Reset Environment
							</button>
							<button
								className="btn btn-primary"
								onClick={stepFromBackend}
								disabled={backendStatus !== "connected"}
							>
								<Cpu size={16} />
								AI Step
							</button>
							<button
								className={`btn ${isAutoRunning ? "btn-danger" : "btn-accent"}`}
								onClick={() => setIsAutoRunning(!isAutoRunning)}
								disabled={backendStatus !== "connected"}
							>
								{isAutoRunning ? (
									<>
										<Square size={16} />
										Stop Auto-Run
									</>
								) : (
									<>
										<Play size={16} />
										Start Auto-Run
									</>
								)}
							</button>
						</div>
					</div>

					<div className="card">
						<h3 className="card-title">Obstacles</h3>
						<div className="agent-controls">
							<button
								className={`btn ${editMode ? "btn-danger" : "btn-secondary"}`}
								onClick={() => setEditMode(!editMode)}
							>
								<PenTool size={16} />
								{editMode ? "Done Editing" : "Edit Obstacles"}
							</button>
							{obstacles.length > 0 && (
								<button className="btn btn-secondary" onClick={clearObstacles}>
									<Trash2 size={16} />
									Clear All ({obstacles.length})
								</button>
							)}
						</div>
					</div>

					<div className="card">
						<h3 className="card-title">Turbo Training</h3>
						<p className="turbo-hint">
							Run episodes server-side for much faster training.
						</p>
						<div className="turbo-controls">
							<button
								className="btn btn-accent"
								onClick={() => handleTurboTrain(100)}
								disabled={isTraining || backendStatus !== "connected"}
							>
								<Zap size={16} />
								{isTraining ? "Training..." : "100 Episodes"}
							</button>
							<button
								className="btn btn-accent"
								onClick={() => handleTurboTrain(500)}
								disabled={isTraining || backendStatus !== "connected"}
							>
								<Zap size={16} />
								{isTraining ? "Training..." : "500 Episodes"}
							</button>
							<button
								className="btn btn-accent"
								onClick={() => handleTurboTrain(2000)}
								disabled={isTraining || backendStatus !== "connected"}
							>
								<Zap size={16} />
								{isTraining ? "Training..." : "2000 Episodes"}
							</button>
						</div>
						{trainResult && (
							<div className="train-results">
								<p>
									<strong>{trainResult.episodes}</strong> episodes trained
								</p>
								<p>
									Overall success rate:{" "}
									<strong>{trainResult.successRate}%</strong>
								</p>
								<p>
									Last 50 success rate:{" "}
									<strong>{trainResult.last50SuccessRate}%</strong>
								</p>
								<p>
									Avg steps: <strong>{trainResult.avgSteps}</strong>
								</p>
								<p>
									Epsilon: <strong>{trainResult.epsilon}</strong>
								</p>
							</div>
						)}
					</div>

					<ModelManager onLoadModel={handleModelLoaded} obstacles={obstacles} />
					<HistoryPanel history={history} />
				</aside>
			</main>
		</div>
	);
}
