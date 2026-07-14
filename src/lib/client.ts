// Browser-side fetch helpers. All requests are same-origin and send cookies.

export class ClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ClientError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: { error?: string; code?: string } | undefined;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    // Any 401 means this device no longer holds a usable session (revoked by a
    // takeover, cleared by an admin reset, or simply expired). Without a
    // redirect the app hangs on its loading state forever, so send the user
    // back to sign in. The auth pages themselves are exempt.
    const onAuthPage =
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/register"));
    if (typeof window !== "undefined" && res.status === 401 && !onAuthPage) {
      window.location.href =
        body?.code === "SESSION_REVOKED" ? "/login?kicked=1" : "/login";
    }
    throw new ClientError(res.status, body?.error ?? res.statusText, body?.code);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { credentials: "include" }).then((r) => parse<T>(r));
}

export function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  return fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((r) => parse<T>(r));
}
