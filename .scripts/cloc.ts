import { $ } from "bun"

async function getCodeStats(
    dir: string,
): Promise<{ code: number; blank: number; comment: number }> {
    const output = await $`bunx cloc ${dir}`.text()
    const lines = output.split("\n")
    const dataLines = lines.filter(
        (line) =>
            /^\w+/.test(line) && /\d+\s+\d+\s+\d+\s+\d+$/.test(line.trim()),
    )
    if (dataLines.length === 0) return { code: 0, blank: 0, comment: 0 }
    const lastDataLine = dataLines[dataLines.length - 1]
    const parts = lastDataLine.trim().split(/\s+/)
    return {
        code: parseInt(parts[4]) || 0,
        blank: parseInt(parts[2]) || 0,
        comment: parseInt(parts[3]) || 0,
    }
}

async function updateReadme(table: string) {
    const readme = await Bun.file("readme.md").text()
    const lines = readme.split("\n")
    const startIndex =
        lines.findIndex((line) => line === "### lines of code") + 1
    const endIndex = lines.findIndex(
        (line, index) => index > startIndex && line.startsWith("#"),
    )
    if (startIndex === -1 || endIndex === -1) return

    lines.splice(startIndex, endIndex - startIndex, "", table, "")
    await Bun.write("readme.md", lines.join("\n"))
}

async function main() {
    const coreStats = await getCodeStats("core")
    const editorStats = await getCodeStats("editor")
    const testStats = await getCodeStats("test")
    const totalStats = {
        code: coreStats.code + editorStats.code + testStats.code,
        blank: coreStats.blank + editorStats.blank + testStats.blank,
        comment: coreStats.comment + editorStats.comment + testStats.comment,
    }

    const colWidth = 13

    const table = `|${"folder".padEnd(colWidth)}|${"code".padEnd(colWidth)}|${"empty".padEnd(colWidth)}|${"comments".padEnd(colWidth)}|${"total".padEnd(colWidth)}|
|${"-".repeat(colWidth)}|${"-".repeat(colWidth)}|${"-".repeat(colWidth)}|${"-".repeat(colWidth)}|${"-".repeat(colWidth)}|
|${"core".padEnd(colWidth)}|${coreStats.code.toString().padEnd(colWidth)}|${coreStats.blank.toString().padEnd(colWidth)}|${coreStats.comment.toString().padEnd(colWidth)}|${(coreStats.code + coreStats.blank + coreStats.comment).toString().padEnd(colWidth)}|
|${"editor".padEnd(colWidth)}|${editorStats.code.toString().padEnd(colWidth)}|${editorStats.blank.toString().padEnd(colWidth)}|${editorStats.comment.toString().padEnd(colWidth)}|${(editorStats.code + editorStats.blank + editorStats.comment).toString().padEnd(colWidth)}|
|${"test".padEnd(colWidth)}|${testStats.code.toString().padEnd(colWidth)}|${testStats.blank.toString().padEnd(colWidth)}|${testStats.comment.toString().padEnd(colWidth)}|${(testStats.code + testStats.blank + testStats.comment).toString().padEnd(colWidth)}|
|${"**total**".padEnd(colWidth)}|${("**" + totalStats.code.toString() + "**").padEnd(colWidth)}|${("**" + totalStats.blank.toString() + "**").padEnd(colWidth)}|${("**" + totalStats.comment.toString() + "**").padEnd(colWidth)}|${("**" + (totalStats.code + totalStats.blank + totalStats.comment).toString() + "**").padEnd(colWidth)}|`

    await updateReadme(table)
}

await main()

export {}
