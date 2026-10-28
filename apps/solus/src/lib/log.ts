/**
 * Server-side error logging that never records secrets or personal data.
 * Only stable identifiers (error name, code, HTTP status and the `solus:`
 * business code) are written: no messages that could echo passwords, tokens,
 * e-mails or SQL values.
 */
export function logServerError(scope: string, error: unknown) {
  const detail: Record<string, string | number> = {};
  if (error && typeof error === 'object') {
    const { name, code, status, message } = error as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };
    if (typeof name === 'string') detail.name = name;
    if (typeof code === 'string' || typeof code === 'number') detail.code = code;
    if (typeof status === 'number') detail.status = status;
    if (typeof message === 'string' && message.startsWith('solus:')) detail.reason = message;
  }
  console.error(`[solus] ${scope}`, detail);
}
