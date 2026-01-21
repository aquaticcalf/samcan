import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, "..", "..", "..")

export const rootDir = __dirname

export function resolve(pathname: string): string {
    const clean = pathname.startsWith("/") ? pathname.slice(1) : pathname
    return join(rootDir, clean)
}
