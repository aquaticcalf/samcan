import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { stat } from "node:fs/promises"

const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL(".", import.meta.url))

const rootDir = __dirname

function resolvePath(pathname: string): string {
    // Strip leading slash so we stay under the repo root
    const clean = pathname.startsWith("/") ? pathname.slice(1) : pathname
    return join(rootDir, clean)
}

function guessContentType(pathname: string): string {
    if (pathname.endsWith(".html")) return "text/html; charset=utf-8"
    if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8"
    if (pathname.endsWith(".mjs")) return "text/javascript; charset=utf-8"
    if (pathname.endsWith(".css")) return "text/css; charset=utf-8"
    if (pathname.endsWith(".json")) return "application/json; charset=utf-8"
    return "text/plain; charset=utf-8"
}

const server = Bun.serve({
    port: Number(process.env.PORT || 3000),
    async fetch(req) {
        const url = new URL(req.url)
        let pathname = url.pathname

        if (pathname === "/") {
            pathname = "/demo.html"
        }

        // Basic hardening: no directory traversal outside rootDir
        if (pathname.includes("..")) {
            return new Response("Not found", { status: 404 })
        }

        // Handle bare module specifiers like "earcut" -> node_modules
        let filePath: string
        if (!pathname.includes("/") && !pathname.startsWith(".")) {
            // This is a bare module specifier, resolve from node_modules
            const modulePath = `/node_modules/${pathname}/src/index.js`
            const resolved = await ensureFile(resolvePath(modulePath))
            if (resolved) {
                filePath = resolved
                pathname = modulePath
            } else {
                // Try the package.json main field for earcut
                const altModulePath = `/node_modules/${pathname}/src/earcut.js`
                const altResolved = await ensureFile(resolvePath(altModulePath))
                if (altResolved) {
                    filePath = altResolved
                    pathname = altModulePath
                } else {
                    return new Response("Not found", { status: 404 })
                }
            }
        } else {
            // Resolve requested path to a real file, with a small
            // convenience for extensionless module imports like
            // `/dist/core/api` -> `/dist/core/api.js` or
            // `/dist/core/math/path` -> `/dist/core/math/path/index.js`.
            filePath = resolvePath(pathname)
        }

        async function ensureFile(path: string): Promise<string | null> {
            try {
                const info = await stat(path)
                if (info.isFile()) return path
            } catch {}
            return null
        }

        let resolved = await ensureFile(filePath)

        // If no file and no extension, try `.js` and directory index
        if (!resolved) {
            const lastSlash = pathname.lastIndexOf("/")
            const lastDot = pathname.lastIndexOf(".")
            const hasExtension = lastDot > lastSlash
            if (!hasExtension) {
                // Try .js first
                const jsPathname = `${pathname}.js`
                resolved = await ensureFile(resolvePath(jsPathname))
                if (resolved) {
                    pathname = jsPathname
                } else {
                    // Try directory index
                    const indexPathname = pathname.endsWith("/")
                        ? `${pathname}index.js`
                        : `${pathname}/index.js`
                    resolved = await ensureFile(resolvePath(indexPathname))
                    if (resolved) {
                        pathname = indexPathname
                    } else {
                        // Special case: some imports are broken and reference
                        // files that should be in math/ subdirectory
                        if (pathname.startsWith("/dist/core/")) {
                            const mathPathname = pathname.replace(
                                "/dist/core/",
                                "/dist/core/math/",
                            )
                            const mathJsPathname = `${mathPathname}.js`
                            resolved = await ensureFile(
                                resolvePath(mathJsPathname),
                            )
                            if (resolved) {
                                pathname = mathJsPathname
                            }
                        }
                    }
                }
            }
        }

        if (!resolved) {
            // Debug: log what we tried
            console.log(`404 for ${pathname}, tried: ${filePath}`)
            return new Response("Not found", { status: 404 })
        }

        filePath = resolved

        const file = await Bun.file(filePath)
        return new Response(file, {
            headers: {
                "Content-Type": guessContentType(pathname),
                "Cache-Control": "no-store",
            },
        })
    },
})

console.log(`samcan demo server running at http://localhost:${server.port}`)
