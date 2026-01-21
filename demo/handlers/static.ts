import { join as pathJoin } from "node:path"
import { guessContentType } from "@/demo/utils/content"
import { ensureFile, resolveExtensionless } from "@/demo/utils/extensions"
import { resolve, rootDir } from "@/demo/utils/path"

export async function serveStatic(pathname: string): Promise<Response | null> {
    if (pathname.includes("..")) return null

    const filePath = resolve(pathname)
    const resolved = await resolveExtensionless(pathname)

    if (!resolved) {
        console.log(`404 for ${pathname}, tried: ${filePath}`)
        return null
    }

    const file = await Bun.file(resolved)
    return new Response(file, {
        headers: {
            "Content-Type": guessContentType(pathname),
            "Cache-Control": "no-store",
        },
    })
}

export function serveIndex(): Response {
    const htmlPath = pathJoin(rootDir, "demo", "demo.html")
    const file = Bun.file(htmlPath)
    return new Response(file, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    })
}

function join(...paths: string[]): string {
    return pathJoin(...paths)
}
