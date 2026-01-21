import { ensureFile } from "@/demo/utils/extensions"
import { resolve } from "@/demo/utils/path"

export async function resolveModule(pathname: string): Promise<string | null> {
    const modulePath = `/node_modules/${pathname}/src/index.js`
    const resolved = await ensureFile(resolve(modulePath))

    if (resolved) {
        return resolved
    }

    const altModulePath = `/node_modules/${pathname}/src/earcut.js`
    const altResolved = await ensureFile(resolve(altModulePath))

    if (altResolved) {
        return altResolved
    }

    return null
}
