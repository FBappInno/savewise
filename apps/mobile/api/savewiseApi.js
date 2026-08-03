const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://192.168.178.106:3000/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `API-Fehler ${response.status}`;

    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {
      // Antwort war nicht im JSON-Format.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getKnowledgeLibrary() {
  return apiRequest("/knowledge");
}

export function rebuildKnowledgeLibrary() {
  return apiRequest("/knowledge/rebuild", {
    method: "POST",
  });
}

export function getRelatedDiscoveries(discoveryId, limit = 5) {
  return apiRequest(
    `/knowledge/related/${encodeURIComponent(discoveryId)}?limit=${limit}`
  );
}

export function getInterestDiscoveries(interestKey, limit = 50) {
  return apiRequest(
    `/knowledge/interests/${encodeURIComponent(
      interestKey
    )}/discoveries?limit=${limit}`
  );
}

export function getCurrentTrends() {
  return apiRequest("/knowledge/trends/current");
}