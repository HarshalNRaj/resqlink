import { getAccessToken } from "./verification";

const API_BASE_URL = "http://127.0.0.1:5000";

async function readResponse(response, fallback) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || fallback);
  }
  return data;
}

export async function checkBackend() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Could not connect to RELink backend");
  }

  return response.json();
}

export async function getRequests(view = "") {
  const token = getAccessToken();
  const query = view ? `?view=${encodeURIComponent(view)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/requests${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return readResponse(response, "Could not load resource requests.");
}

export async function updateDelivery(requestId, action) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/api/requests/${encodeURIComponent(requestId)}/delivery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action }),
    },
  );
  return readResponse(response, "Could not update delivery status.");
}

export async function reviewRequest(requestId, action, note = "") {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/api/requests/${encodeURIComponent(requestId)}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, note }),
    },
  );
  return readResponse(response, "Could not update the request.");
}

export async function respondToRequest(requestId, responseText) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/api/requests/${encodeURIComponent(requestId)}/response`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ response: responseText }),
    },
  );
  return readResponse(response, "Could not send your response.");
}