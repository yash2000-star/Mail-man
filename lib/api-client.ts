/** Calling Mail-man's own API from the browser, with errors as values instead of exceptions. */

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; error: string; code?: string };

const OFFLINE = "Could not reach the server. Check your connection.";

/** JSON request to an /api route. `body` is sent as JSON when given. */
export async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
    let response: Response;
    try {
        response = await fetch(url, {
            method: init.method ?? "GET",
            headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        });
    } catch {
        return { ok: false, status: 0, error: OFFLINE };
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const err = (data ?? {}) as { error?: unknown; code?: unknown };
        return {
            ok: false,
            status: response.status,
            error: typeof err.error === "string" ? err.error : "Something went wrong. Please try again.",
            code: typeof err.code === "string" ? err.code : undefined,
        };
    }
    return { ok: true, data: data as T };
}
