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
    // Fallback for a device that missed the real-time revoke (e.g. no live
    // stream): the next API call learns the session was taken over → log out.
    if (
      typeof window !== "undefined" &&
      body?.code === "SESSION_REVOKED" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login?kicked=1";
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
