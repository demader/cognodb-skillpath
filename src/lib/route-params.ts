/**
 * Decodes a dynamic route segment without ever throwing.
 *
 * Verified against this Next.js version: **page** components receive the segment
 * still percent-encoded ("Computer%20Vision"), while **route handlers** receive it
 * already decoded. So pages must decode and route handlers must not.
 *
 * `decodeURIComponent` throws a URIError on a malformed sequence — a name holding a
 * literal '%' would otherwise crash the route with an unhandled 500 instead of
 * reaching the intended notFound(). Falling back to the raw value turns that into
 * a clean miss.
 */
export function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
