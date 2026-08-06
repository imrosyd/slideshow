// Global fetch interceptor: when any authenticated request (one that carries
// an Authorization: Bearer header, e.g. an expired JWT) comes back 401,
// redirect to /login instead of leaving the page silently broken.
let installed = false;

function hasAuthorizationHeader(init?: RequestInit): boolean {
  const headers = init?.headers;
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("Authorization");
  if (Array.isArray(headers)) return headers.some(([key]) => key.toLowerCase() === "authorization");
  return Object.keys(headers).some((key) => key.toLowerCase() === "authorization");
}

export function installAuthFetchInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    const response = await originalFetch(...args);

    if (response.status === 401 && hasAuthorizationHeader(init) && window.location.pathname !== "/login") {
      sessionStorage.removeItem("admin-auth-token");
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }

    return response;
  };
}
