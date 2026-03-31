const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Wrapper around fetch that adds a timeout via AbortController.
 * Prevents requests from hanging indefinitely on cold-start / sleeping backends.
 */
function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() =>
		clearTimeout(id),
	);
}

/**
 * Lightweight health check – used to detect if the backend is reachable.
 * Default timeout is 60 s to accommodate Render free-tier cold-starts
 * (the instance can take 30-60 s to spin up from sleep).
 */
export async function healthCheck(timeoutMs = 60000) {
	const response = await fetchWithTimeout(`${API_URL}/health`, {}, timeoutMs);
	if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
	return response.json();
}

export async function fetchAction(payload) {
	const response = await fetchWithTimeout(`${API_URL}/act`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Backend error: ${response.status}`);
	}

	return response.json();
}

export async function fetchModels() {
	const response = await fetchWithTimeout(`${API_URL}/models`);
	return response.json();
}

export async function saveModel(name, environment = {}) {
	await fetchWithTimeout(`${API_URL}/models`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, environment }),
	});
}

export async function loadModel(id) {
	const response = await fetchWithTimeout(`${API_URL}/models/${id}/load`, {
		method: "POST",
	});
	return response.json();
}

export async function deleteModel(id) {
	await fetchWithTimeout(`${API_URL}/models/${id}`, { method: "DELETE" });
}

export async function resetAgent() {
	const response = await fetchWithTimeout(`${API_URL}/reset`, {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Backend error: ${response.status}`);
	}
	return response.json();
}

export async function trainBatch(
	episodes = 500,
	obstacles = [],
	targetPosition = [8, 8],
	checkpoints = [],
) {
	// Training can be slow for many episodes — use a generous timeout (5 min)
	const response = await fetchWithTimeout(
		`${API_URL}/train`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				episodes,
				obstacles,
				target_position: targetPosition,
				checkpoints,
			}),
		},
		300000,
	);

	if (!response.ok) {
		throw new Error(`Backend error: ${response.status}`);
	}

	return response.json();
}
