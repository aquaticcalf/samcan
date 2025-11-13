import paper from "paper"
import { Path, type PathCommand } from "./index"

/**
 * Path boolean operations using paper.js
 * Provides union, intersection, difference, and XOR operations on paths
 */
export class PathOperations {
    private static paperScope: paper.PaperScope | null = null

    /**
     * Initialize paper.js scope (call once before using operations)
     */
    private static ensurePaperScope(): paper.PaperScope {
        if (!PathOperations.paperScope) {
            PathOperations.paperScope = new paper.PaperScope()
            PathOperations.paperScope.setup(new paper.Size(1000, 1000))
        }
        return PathOperations.paperScope
    }

    /**
     * Convert samcan Path to paper.js Path
     */
    private static toPaperPath(path: Path): paper.Path {
        const scope = PathOperations.ensurePaperScope()
        const paperPath = new scope.Path()

        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "M":
                    paperPath.moveTo(new scope.Point(cmd.x, cmd.y))
                    break
                case "L":
                    paperPath.lineTo(new scope.Point(cmd.x, cmd.y))
                    break
                case "C":
                    paperPath.cubicCurveTo(
                        new scope.Point(cmd.cp1x, cmd.cp1y),
                        new scope.Point(cmd.cp2x, cmd.cp2y),
                        new scope.Point(cmd.x, cmd.y),
                    )
                    break
                case "Q":
                    paperPath.quadraticCurveTo(
                        new scope.Point(cmd.cpx, cmd.cpy),
                        new scope.Point(cmd.x, cmd.y),
                    )
                    break
                case "Z":
                    paperPath.closePath()
                    break
            }
        }

        return paperPath
    }

    /**
     * Convert paper.js Path to samcan Path
     */
    private static fromPaperPath(paperPath: paper.Path): Path {
        const commands: PathCommand[] = []

        for (const segment of paperPath.segments) {
            const point = segment.point
            const handleIn = segment.handleIn
            const handleOut = segment.handleOut

            // First segment or segment after a gap
            if (segment.index === 0 || !segment.previous) {
                commands.push({ type: "M", x: point.x, y: point.y })
            } else {
                const prevSegment = segment.previous
                const prevPoint = prevSegment.point
                const prevHandleOut = prevSegment.handleOut

                // Check if this is a curve or a line
                if (handleIn.isZero() && prevHandleOut.isZero()) {
                    // Straight line
                    commands.push({ type: "L", x: point.x, y: point.y })
                } else {
                    // Cubic bezier curve
                    commands.push({
                        type: "C",
                        cp1x: prevPoint.x + prevHandleOut.x,
                        cp1y: prevPoint.y + prevHandleOut.y,
                        cp2x: point.x + handleIn.x,
                        cp2y: point.y + handleIn.y,
                        x: point.x,
                        y: point.y,
                    })
                }
            }
        }

        // Close path if needed
        if (paperPath.closed) {
            commands.push({ type: "Z" })
        }

        return new Path(commands)
    }

    /**
     * Union of two paths (combines both paths)
     */
    static union(path1: Path, path2: Path): Path {
        const paper1 = PathOperations.toPaperPath(path1)
        const paper2 = PathOperations.toPaperPath(path2)

        const result = paper1.unite(paper2) as paper.Path
        const samcanPath = PathOperations.fromPaperPath(result)

        // Clean up
        paper1.remove()
        paper2.remove()
        result.remove()

        return samcanPath
    }

    /**
     * Intersection of two paths (only overlapping area)
     */
    static intersection(path1: Path, path2: Path): Path {
        const paper1 = PathOperations.toPaperPath(path1)
        const paper2 = PathOperations.toPaperPath(path2)

        const result = paper1.intersect(paper2) as paper.Path
        const samcanPath = PathOperations.fromPaperPath(result)

        // Clean up
        paper1.remove()
        paper2.remove()
        result.remove()

        return samcanPath
    }

    /**
     * Difference of two paths (path1 minus path2)
     */
    static difference(path1: Path, path2: Path): Path {
        const paper1 = PathOperations.toPaperPath(path1)
        const paper2 = PathOperations.toPaperPath(path2)

        const result = paper1.subtract(paper2) as paper.Path
        const samcanPath = PathOperations.fromPaperPath(result)

        // Clean up
        paper1.remove()
        paper2.remove()
        result.remove()

        return samcanPath
    }

    /**
     * XOR of two paths (non-overlapping areas)
     */
    static xor(path1: Path, path2: Path): Path {
        const paper1 = PathOperations.toPaperPath(path1)
        const paper2 = PathOperations.toPaperPath(path2)

        const result = paper1.exclude(paper2) as paper.Path
        const samcanPath = PathOperations.fromPaperPath(result)

        // Clean up
        paper1.remove()
        paper2.remove()
        result.remove()

        return samcanPath
    }
}
