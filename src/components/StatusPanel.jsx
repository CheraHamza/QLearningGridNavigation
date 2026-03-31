import {
	Battery,
	BatteryLow,
	BatteryMedium,
	BatteryFull,
	BatteryWarning,
} from "lucide-react";
import { ActionIcon } from "./ActionIcon";

export default function StatusPanel({
	episode,
	steps,
	maxSteps,
	reward,
	epsilon,
	done,
	lastAction,
	checkpoints = [],
	currentCheckpointIndex = 0,
}) {
	const stepsRemaining = maxSteps - steps;
	const energyPercent = (stepsRemaining / maxSteps) * 100;

	const getBatteryIcon = () => {
		if (energyPercent <= 10) return <BatteryWarning size={18} />;
		if (energyPercent <= 25) return <BatteryLow size={18} />;
		if (energyPercent <= 60) return <BatteryMedium size={18} />;
		return <BatteryFull size={18} />;
	};

	const getEnergyColor = () => {
		if (energyPercent <= 10) return "var(--color-danger)";
		if (energyPercent <= 25) return "var(--color-warning, #f59e0b)";
		if (energyPercent <= 60) return "var(--color-accent)";
		return "var(--color-success)";
	};

	return (
		<div className="card status-panel">
			<h3 className="card-title">Status</h3>

			{/* Energy Bar */}
			<div className="energy-bar-container">
				<div className="energy-bar-header">
					<span className="energy-bar-icon" style={{ color: getEnergyColor() }}>
						{getBatteryIcon()}
					</span>
					<span className="energy-bar-label">Energy</span>
					<span className="energy-bar-value">
						{stepsRemaining} / {maxSteps}
					</span>
				</div>
				<div className="energy-bar-track">
					<div
						className="energy-bar-fill"
						style={{
							width: `${energyPercent}%`,
							backgroundColor: getEnergyColor(),
						}}
					/>
				</div>
			</div>

			<div className="status-grid">
				<div className="stat">
					<span className="stat-label">Episode</span>
					<span className="stat-value">{episode}</span>
				</div>
				<div className="stat">
					<span className="stat-label">Steps</span>
					<span className="stat-value">
						{steps}
						<span className="stat-secondary"> / {maxSteps}</span>
					</span>
				</div>
				<div className="stat">
					<span className="stat-label">Reward</span>
					<span
						className={`stat-value ${reward > 0 ? "text-success" : reward < 0 ? "text-danger" : ""}`}
					>
						{reward.toFixed(3)}
					</span>
				</div>
				<div className="stat">
					<span className="stat-label">Epsilon</span>
					<span className="stat-value">{epsilon.toFixed(3)}</span>
				</div>
				<div className="stat">
					<span className="stat-label">Status</span>
					<span
						className={`stat-badge ${done ? "badge-done" : "badge-active"}`}
					>
						{done ? "Done" : "Active"}
					</span>
				</div>
				<div className="stat">
					<span className="stat-label">Last Action</span>
					<span className="stat-value stat-action">
						<ActionIcon action={lastAction} size={16} />
					</span>
				</div>
				{checkpoints.length > 0 && (
					<div className="stat">
						<span className="stat-label">Checkpoints</span>
						<span className="stat-value">
							{currentCheckpointIndex}
							<span className="stat-secondary"> / {checkpoints.length}</span>
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
