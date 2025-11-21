import { Bench } from "tinybench"
import { Timeline, AnimationTrack, Keyframe } from "../core/animation"
import { Artboard } from "../core/scene/nodes/artboard"
import { Color } from "../core/math/color"
import { SceneNode } from "../core/scene/node"

type BenchRow = Record<string, unknown>

function createTimelineWithTracks(
    trackCount: number,
    keyframesPerTrack: number,
    duration: number,
): { timeline: Timeline; duration: number } {
    const artboard = new Artboard(1920, 1080, Color.white())
    const timeline = new Timeline(duration, 60)

    for (let i = 0; i < trackCount; i++) {
        const node = new SceneNode()
        artboard.addChild(node)

        const track = new AnimationTrack(node, "transform.position.x")

        for (let k = 0; k < keyframesPerTrack; k++) {
            const t =
                keyframesPerTrack === 1
                    ? 0
                    : (duration * k) / (keyframesPerTrack - 1)
            const value = k % 2 === 0 ? 0 : 500
            const keyframe = new Keyframe(t, value, "linear")
            track.addKeyframe(keyframe)
        }

        timeline.addTrack(track)
    }

    return { timeline, duration }
}

function createSceneHierarchy(nodeCount: number): {
    root: Artboard
    nodes: SceneNode[]
} {
    const root = new Artboard(1920, 1080, Color.white())
    const nodes: SceneNode[] = [root]

    while (nodes.length < nodeCount) {
        const parentIndex = Math.floor(Math.random() * nodes.length)
        const parent = nodes[parentIndex]!
        const child = new SceneNode()

        parent.addChild(child)
        nodes.push(child)
    }

    return { root, nodes }
}

function buildMarkdownTable(rows: BenchRow[]): string {
    const colWidth = 32

    const pad = (value: unknown) => String(value ?? "").padEnd(colWidth)

    const header =
        `|${pad("name")}|` +
        `${pad("ops/s")}|` +
        `${pad("latency avg (ns)")}|` +
        `${pad("samples")}|`

    const separator =
        `|${"-".repeat(colWidth)}|` +
        `${"-".repeat(colWidth)}|` +
        `${"-".repeat(colWidth)}|` +
        `${"-".repeat(colWidth)}|`

    if (rows.length === 0) {
        return `${header}\n${separator}`
    }

    const body = rows
        .map((row) => {
            const name = row["Task name"]
            const ops = row["Throughput avg (ops/s)"]
            const latency = row["Latency avg (ns)"]
            const samples = row["Samples"]
            return (
                `|${pad(name)}|` +
                `${pad(ops)}|` +
                `${pad(latency)}|` +
                `${pad(samples)}|`
            )
        })
        .join("\n")

    return `${header}\n${separator}\n${body}`
}

async function updateReadme(section: string) {
    const readme = await Bun.file("readme.md").text()
    const lines = readme.split("\n")
    const heading = "### benchmarks"

    let headingIndex = lines.findIndex((line) => line === heading)

    if (headingIndex === -1) {
        // Append new section at the end
        if (lines[lines.length - 1] !== "") {
            lines.push("")
        }
        lines.push(heading, "", ...section.split("\n"), "")
    } else {
        const startIndex = headingIndex + 1
        let endIndex = lines.length

        for (let i = startIndex; i < lines.length; i++) {
            if (lines[i]!.startsWith("### ")) {
                endIndex = i
                break
            }
        }

        const newLines = section.split("\n")
        lines.splice(startIndex, endIndex - startIndex, "", ...newLines, "")
    }

    await Bun.write("readme.md", lines.join("\n"))
}

async function runTimelineBenchmarks(): Promise<string> {
    const bench = new Bench({ time: 500 })

    const configs = [
        { name: "timeline-eval-10-tracks", tracks: 10, keyframes: 2 },
        { name: "timeline-eval-100-tracks", tracks: 100, keyframes: 2 },
        { name: "timeline-eval-500-tracks", tracks: 500, keyframes: 2 },
    ] as const

    const duration = 5

    for (const config of configs) {
        const { timeline } = createTimelineWithTracks(
            config.tracks,
            config.keyframes,
            duration,
        )

        bench.add(config.name, () => {
            const t = Math.random() * duration
            timeline.evaluate(t)
        })
    }

    await bench.run()

    console.log("\ntimeline benchmarks")
    console.table(bench.table())

    const rows = bench.table() as BenchRow[]
    const table = buildMarkdownTable(rows)
    return `<details>
<summary>timeline</summary>

${table}

</details>`
}

async function runSceneBenchmarks(): Promise<string> {
    const bench = new Bench({ time: 500 })

    const configs = [
        { name: "scene-world-transform-1k-nodes", nodes: 1000 },
        { name: "scene-world-transform-5k-nodes", nodes: 5000 },
    ] as const

    for (const config of configs) {
        const { root, nodes } = createSceneHierarchy(config.nodes)
        const target = nodes[nodes.length - 1]!

        bench.add(config.name, () => {
            root.transform.position.x += 1
            root.notifyTransformChanged()
            target.getWorldTransform()
        })
    }

    await bench.run()

    console.log("\nscene graph benchmarks")
    console.table(bench.table())

    const rows = bench.table() as BenchRow[]
    const table = buildMarkdownTable(rows)
    return `<details>
<summary>scene graph</summary>

${table}

</details>`
}

async function main() {
    console.log("running samcan benchmarks... (tinybench)")

    const timelineSection = await runTimelineBenchmarks()
    const sceneSection = await runSceneBenchmarks()

    const section = `${timelineSection}\n\n${sceneSection}`
    await updateReadme(section)
}

await main()

export {}
