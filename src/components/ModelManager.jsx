import { useState, useEffect } from "react";
import { fetchModels, saveModel, loadModel, deleteModel } from "../api/agent";
import { Save, Upload, Trash2 } from "lucide-react";

export default function ModelManager({
	onLoadModel,
	obstacles = [],
	target = [8, 8],
	checkpoints = [],
}) {
	const [models, setModels] = useState([]);
	const [newModelName, setNewModelName] = useState("");
	const [loading, setLoading] = useState(false);

	async function loadModels() {
		try {
			const data = await fetchModels();
			setModels(data);
		} catch {
			/* backend may be offline */
		}
	}

	useEffect(() => {
		loadModels();
	}, []);

	async function handleSave() {
		if (!newModelName.trim()) return;
		setLoading(true);
		try {
			const environment = { obstacles, target_position: target, checkpoints };
			await saveModel(newModelName.trim(), environment);
			setNewModelName("");
			await loadModels();
		} finally {
			setLoading(false);
		}
	}

	async function handleLoad(id) {
		setLoading(true);
		try {
			const data = await loadModel(id);
			if (data.status === "loaded") {
				onLoadModel(data.epsilon, data.environment);
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(id) {
		if (!confirm("Delete this model?")) return;
		await deleteModel(id);
		await loadModels();
	}

	return (
		<div className="card model-manager">
			<h3 className="card-title">Models</h3>

			<div className="model-save">
				<input
					className="input"
					placeholder="Model name..."
					value={newModelName}
					onChange={(e) => setNewModelName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSave()}
				/>
				<button
					className="btn btn-primary btn-icon"
					onClick={handleSave}
					disabled={loading || !newModelName.trim()}
					title="Save current model"
				>
					<Save size={16} />
				</button>
			</div>

			{models.length === 0 ? (
				<p className="text-secondary text-sm">No saved models</p>
			) : (
				<ul className="model-list">
					{models.map((m) => (
						<li key={m.id} className="model-item">
							<div className="model-info">
								<span className="model-name">{m.name}</span>
								<span className="model-meta">
									ε {m.epsilon.toFixed(3)} ·{" "}
									{m.environment?.obstacles?.length || 0} walls ·{" "}
									{m.environment?.checkpoints?.length || 0} checkpoints ·{" "}
									{m.environment?.target_position
										? `target (${m.environment.target_position[0]}, ${m.environment.target_position[1]})`
										: "default target"}{" "}
									· {new Date(m.created_at).toLocaleDateString()}
								</span>
							</div>
							<div className="model-actions">
								<button
									className="btn-ghost"
									onClick={() => handleLoad(m.id)}
									title="Load model"
								>
									<Upload size={14} />
								</button>
								<button
									className="btn-ghost btn-ghost--danger"
									onClick={() => handleDelete(m.id)}
									title="Delete model"
								>
									<Trash2 size={14} />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
