const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const TOKEN_KEY = "ticketbox.admin.tokens";

function saveTokens(tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function loadTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(token) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

export async function refreshSession(refreshToken) {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const payload = await res.json();
  const data = payload.data ?? payload;
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

export async function request(path, options = {}) {
  const doRequest = async (authOverride) => {
    const fetchOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    };
    if (authOverride) {
      fetchOptions.headers.Authorization = `Bearer ${authOverride}`;
    }
    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
    return response;
  };

  let response = await doRequest();

  if (response.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
    const tokens = loadTokens();
    if (tokens?.refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshSession(tokens.refreshToken);
          isRefreshing = false;
          onRefreshed(newToken);
        } catch (err) {
          isRefreshing = false;
          clearTokens();
          window.location.href = "/";
          throw err;
        }
      }

      const newToken = await new Promise((resolve) => addRefreshSubscriber(resolve));
      response = await doRequest(newToken);
    }
  }

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = { message: "Request failed." };
    }
    const error = new Error(payload.message ?? "Request failed.");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }

  const payload = await response.json();
  return payload.data ?? payload;
}

export async function login(email, password) {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  saveTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return result;
}

export async function currentUser(accessToken) {
  return request("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function logout(refreshToken) {
  await request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  clearTokens();
}

export function loadStoredTokens() {
  return loadTokens();
}

export function clearStoredTokens() {
  clearTokens();
}
