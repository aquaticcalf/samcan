import { resolveModule } from "@/demo/handlers/modules"
import { serveIndex, serveStatic } from "@/demo/handlers/static"

const server = Bun.serve({
    port: Number(process.env.PORT || 3000),
    async fetch(req) {
        const url = new URL(req.url)
        const pathname = url.pathname

        if (pathname === "/") {
            return serveIndex()
        }

        if (!pathname.includes("/") && !pathname.startsWith(".")) {
            const resolved = await resolveModule(pathname)
            if (resolved) {
                const file = await Bun.file(resolved)
                return new Response(file, {
                    headers: {
                        "Content-Type": "text/javascript; charset=utf-8",
                        "Cache-Control": "no-store",
                    },
                })
            }
            return new Response("Not found", { status: 404 })
        }

        const response = await serveStatic(pathname)
        if (response) return response

        return new Response("Not found", { status: 404 })
    },
})

console.log(`samcan demo server running at http://localhost:${server.port}`)
