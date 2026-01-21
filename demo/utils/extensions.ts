import { stat } from "node:fs/promises"
import { resolve } from "@/demo/utils/path"

export async function ensureFile(path: string): Promise<string | null> {
    try {
        const info = await stat(path)
        if (info.isFile()) return path
    } catch {}
    return null
}

export async function resolveExtensionless(
    pathname: string,
): Promise<string | null> {
    const resolved = await ensureFile(resolve(pathname))
    if (resolved) return resolved

    const lastSlash = pathname.lastIndexOf("/")
    const lastDot = pathname.lastIndexOf(".")
    const hasExtension = lastDot > lastSlash

    if (!hasExtension) {
        const jsPathname = `${pathname}.js`
        const jsResolved = await ensureFile(resolve(jsPathname))
        if (jsResolved) return jsResolved

        const indexPathname = pathname.endsWith("/")
            ? `${pathname}index.js`
            : `${pathname}/index.js`
        const indexResolved = await ensureFile(resolve(indexPathname))
        if (indexResolved) return indexResolved

        if (pathname.startsWith("/dist/core/")) {
            const mathPathname = pathname.replace(
                "/dist/core/",
                "/dist/core/math/",
            )
            const mathJsPathname = `${mathPathname}.js`
            const mathResolved = await ensureFile(resolve(mathJsPathname))
            if (mathResolved) return mathResolved
        }
    }

    return null
}
