export function guessContentType(pathname: string): string {
    if (pathname.endsWith(".html")) return "text/html; charset=utf-8"
    if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8"
    if (pathname.endsWith(".mjs")) return "text/javascript; charset=utf-8"
    if (pathname.endsWith(".css")) return "text/css; charset=utf-8"
    if (pathname.endsWith(".json")) return "application/json; charset=utf-8"
    return "text/plain; charset=utf-8"
}
