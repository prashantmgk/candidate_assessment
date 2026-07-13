// --- in-memory ---
// I have commented out the in-memory token storage due it's obvious downsides explained in the README.

// let _token = null;

// export function getToken() {
//   return _token;
// }

// export function setToken(token) {
//   _token = token;
// }

// export function clearToken() {
//   _token = null;
// }

// --- localStorage ---
const TOKEN_KEY = "techkraft_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * isForm: set true for the login call, which the backend expects as
 * form-encoded (OAuth2PasswordRequestForm), not JSON like every other
 * endpoint. Pass a URLSearchParams instance as `body` in that case.
 */
export async function apiFetch(path, { method = "GET", body, headers = {}, isForm = false } = {}) {
  const token = getToken();

  const finalHeaders = { ...headers };
  if (!isForm && body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (!resp.ok) {
    // stale/expired/invalid token - drop it so the UI doesn't keep
    // presenting a "logged in" state that the backend already rejected
    if (resp.status === 401) {
      clearToken();
    }

    let detail = resp.statusText;
    try {
      const errBody = await resp.json();
      detail = errBody.detail || detail;
    } catch {
      // response wasn't JSON - fall back to statusText
    }
    const error = new Error(detail);
    error.status = resp.status;
    throw error;
  }

  if (resp.status === 204) return null; // DELETE /candidates/{id}
  return resp.json();
}