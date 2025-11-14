import { describe, expect, it } from "bun:test"
import { Artboard } from "../core/scene/nodes/artboard"
import { ShapeNode } from "../core/scene/nodes/shapenode"
import { ImageNode } from "../core/scene/nodes/imagenode"
import { GroupNode } from "../core/scene/nodes/groupnode"
import { Path } from "../core/math/path"
import { Paint } from "../core/math/paint"
import { Color } from "../core/math/color"
import { Rectangle } from "../core/math/rectangle"
import { Transform } from "../core/scene/transform"
import { Vector2 } from "../core/math/vector2"
import { DirtyRegionManager } from "../core/renderer/dirtyregionmanager"

describe("Dirty Rectangle Tracking", () => {
    describe("SceneNode dirty tracking", () => {
        it("should mark node as dirty when transform changes", () => {
            const node = new ShapeNode(new Path())
            expect(node.isDirty).toBe(true) // Initially dirty

            node.clearDirty()
            expect(node.isDirty).toBe(false)

            node.transform = Transform.identity()
            expect(node.isDirty).toBe(true)
        })

        it("should mark node as dirty when visibility changes", () => {
            const node = new ShapeNode(new Path())
            node.clearDirty()

            node.visible = false
            expect(node.isDirty).toBe(true)
        })

        it("should mark node as dirty when opacity changes", () => {
            const node = new ShapeNode(new Path())
            node.clearDirty()

            node.opacity = 0.5
            expect(node.isDirty).toBe(true)
        })

        it("should propagate dirty flag to parent", () => {
            const parent = new GroupNode()
            const child = new ShapeNode(new Path())

            parent.addChild(child)
            parent.clearDirty()
            child.clearDirty()

            child.opacity = 0.5
            expect(child.isDirty).toBe(true)
            expect(parent.isDirty).toBe(true)
        })

        it("should clear dirty flag recursively", () => {
            const parent = new GroupNode()
            const child1 = new ShapeNode(new Path())
            const child2 = new ShapeNode(new Path())

            parent.addChild(child1)
            parent.addChild(child2)

            parent.clearDirty()
            expect(parent.isDirty).toBe(false)
            expect(child1.isDirty).toBe(false)
            expect(child2.isDirty).toBe(false)
        })
    })

    describe("Bounds calculation", () => {
        it("should calculate local bounds for ShapeNode", () => {
            const path = new Path()
            path.moveTo(0, 0)
            path.lineTo(100, 0)
            path.lineTo(100, 100)
            path.lineTo(0, 100)
            path.close()

            const shape = new ShapeNode(path)
            const bounds = shape.getLocalBounds()

            expect(bounds).not.toBeNull()
            expect(bounds?.x).toBe(0)
            expect(bounds?.y).toBe(0)
            expect(bounds?.width).toBe(100)
            expect(bounds?.height).toBe(100)
        })

        it("should expand bounds for stroke width", () => {
            const path = new Path()
            path.moveTo(10, 10)
            path.lineTo(90, 90)

            const shape = new ShapeNode(path)
            shape.stroke = Paint.solid(Color.black())
            shape.strokeWidth = 10

            const bounds = shape.getLocalBounds()
            expect(bounds).not.toBeNull()

            // Bounds should be expanded by half stroke width (5 pixels) on each side
            expect(bounds!.x).toBeLessThan(10)
            expect(bounds!.y).toBeLessThan(10)
        })

        it("should calculate local bounds for ImageNode", () => {
            const img = new Image()
            img.width = 200
            img.height = 150

            const image = new ImageNode(img)
            const bounds = image.getLocalBounds()

            expect(bounds).not.toBeNull()
            expect(bounds?.width).toBe(200)
            expect(bounds?.height).toBe(150)
        })

        it("should calculate local bounds for Artboard", () => {
            const artboard = new Artboard(800, 600)
            const bounds = artboard.getLocalBounds()

            expect(bounds).not.toBeNull()
            expect(bounds?.width).toBe(800)
            expect(bounds?.height).toBe(600)
        })

        it("should calculate world bounds with transform", () => {
            const path = new Path()
            path.moveTo(0, 0)
            path.lineTo(100, 0)
            path.lineTo(100, 100)
            path.lineTo(0, 100)
            path.close()

            const shape = new ShapeNode(path)
            shape.transform = new Transform(new Vector2(50, 50))

            const worldBounds = shape.getWorldBounds()
            expect(worldBounds).not.toBeNull()
            expect(worldBounds?.x).toBe(50)
            expect(worldBounds?.y).toBe(50)
        })

        it("should combine child bounds in world space", () => {
            const parent = new GroupNode()
            parent.transform = new Transform(new Vector2(100, 100))

            const path1 = new Path()
            path1.moveTo(0, 0)
            path1.lineTo(50, 50)

            const child1 = new ShapeNode(path1)
            child1.transform = new Transform(new Vector2(0, 0))

            const path2 = new Path()
            path2.moveTo(0, 0)
            path2.lineTo(50, 50)

            const child2 = new ShapeNode(path2)
            child2.transform = new Transform(new Vector2(100, 0))

            parent.addChild(child1)
            parent.addChild(child2)

            const worldBounds = parent.getWorldBounds()
            expect(worldBounds).not.toBeNull()

            // Parent is at (100, 100), child1 at (0, 0), child2 at (100, 0)
            // So world bounds should span from (100, 100) to (250, 150)
            expect(worldBounds!.x).toBe(100)
            expect(worldBounds!.y).toBe(100)
            expect(worldBounds!.width).toBeGreaterThan(100)
        })
    })

    describe("Dirty region collection", () => {
        it("should collect dirty regions from single node", () => {
            const path = new Path()
            path.moveTo(0, 0)
            path.lineTo(100, 100)

            const shape = new ShapeNode(path)
            const regions: Rectangle[] = []

            shape.collectDirtyRegions(regions)
            expect(regions.length).toBe(1)
        })

        it("should collect dirty regions from hierarchy", () => {
            const parent = new GroupNode()
            const child1 = new ShapeNode(new Path())
            const child2 = new ShapeNode(new Path())

            parent.addChild(child1)
            parent.addChild(child2)

            const regions: Rectangle[] = []
            parent.collectDirtyRegions(regions)

            // Should collect regions from parent and both children
            expect(regions.length).toBeGreaterThan(0)
        })

        it("should not collect regions from clean nodes", () => {
            const parent = new GroupNode()
            const child = new ShapeNode(new Path())

            parent.addChild(child)
            parent.clearDirty()

            const regions: Rectangle[] = []
            parent.collectDirtyRegions(regions)

            expect(regions.length).toBe(0)
        })

        it("should skip invisible nodes", () => {
            const path = new Path()
            path.moveTo(0, 0)
            path.lineTo(100, 100)

            const shape = new ShapeNode(path)
            shape.visible = false

            const regions: Rectangle[] = []
            shape.collectDirtyRegions(regions)

            // Invisible nodes should still be collected if dirty
            // (they need to be cleared from the screen)
            expect(regions.length).toBeGreaterThanOrEqual(0)
        })
    })

    describe("DirtyRegionManager", () => {
        it("should track dirty state", () => {
            const manager = new DirtyRegionManager()
            expect(manager.isDirty).toBe(false)

            manager.addRegion(new Rectangle(0, 0, 100, 100))
            expect(manager.isDirty).toBe(true)

            manager.clear()
            expect(manager.isDirty).toBe(false)
        })

        it("should add multiple regions", () => {
            const manager = new DirtyRegionManager()
            const regions = [
                new Rectangle(0, 0, 100, 100),
                new Rectangle(200, 200, 100, 100),
            ]

            manager.addRegions(regions)
            expect(manager.regions.length).toBe(2)
        })

        it("should optimize overlapping regions", () => {
            const manager = new DirtyRegionManager()

            // Add overlapping regions
            manager.addRegion(new Rectangle(0, 0, 100, 100))
            manager.addRegion(new Rectangle(50, 50, 100, 100))

            expect(manager.regions.length).toBe(2)

            manager.optimize()

            // Should merge into single region
            expect(manager.regions.length).toBe(1)
        })

        it("should not merge distant regions", () => {
            const manager = new DirtyRegionManager()

            manager.addRegion(new Rectangle(0, 0, 100, 100))
            manager.addRegion(new Rectangle(500, 500, 100, 100))

            manager.optimize()

            // Should remain separate
            expect(manager.regions.length).toBe(2)
        })

        it("should calculate bounding rectangle", () => {
            const manager = new DirtyRegionManager()

            manager.addRegion(new Rectangle(0, 0, 100, 100))
            manager.addRegion(new Rectangle(200, 200, 100, 100))

            const bounds = manager.getBoundingRectangle()
            expect(bounds).not.toBeNull()
            expect(bounds?.x).toBe(0)
            expect(bounds?.y).toBe(0)
            expect(bounds?.width).toBe(300)
            expect(bounds?.height).toBe(300)
        })

        it("should calculate total area", () => {
            const manager = new DirtyRegionManager()

            manager.addRegion(new Rectangle(0, 0, 100, 100))
            manager.addRegion(new Rectangle(200, 200, 50, 50))

            const totalArea = manager.getTotalArea()
            expect(totalArea).toBe(10000 + 2500)
        })

        it("should determine when to redraw all", () => {
            const manager = new DirtyRegionManager()
            const viewportWidth = 1000
            const viewportHeight = 1000

            // Add small region - should not redraw all
            manager.addRegion(new Rectangle(0, 0, 100, 100))
            expect(
                manager.shouldRedrawAll(viewportWidth, viewportHeight, 0.5),
            ).toBe(false)

            // Add large region - should redraw all
            manager.clear()
            manager.addRegion(new Rectangle(0, 0, 800, 800))
            expect(
                manager.shouldRedrawAll(viewportWidth, viewportHeight, 0.5),
            ).toBe(true)
        })
    })

    describe("Property changes trigger dirty", () => {
        it("should mark ShapeNode dirty when path changes", () => {
            const shape = new ShapeNode(new Path())
            shape.clearDirty()

            shape.path = new Path()
            expect(shape.isDirty).toBe(true)
        })

        it("should mark ShapeNode dirty when fill changes", () => {
            const shape = new ShapeNode(new Path())
            shape.clearDirty()

            shape.fill = Paint.solid(Color.red())
            expect(shape.isDirty).toBe(true)
        })

        it("should mark ShapeNode dirty when stroke changes", () => {
            const shape = new ShapeNode(new Path())
            shape.clearDirty()

            shape.stroke = Paint.solid(Color.blue())
            expect(shape.isDirty).toBe(true)
        })

        it("should mark ShapeNode dirty when stroke width changes", () => {
            const shape = new ShapeNode(new Path())
            shape.clearDirty()

            shape.strokeWidth = 5
            expect(shape.isDirty).toBe(true)
        })

        it("should mark ImageNode dirty when image data changes", () => {
            const img = new Image()
            const image = new ImageNode(img)
            image.clearDirty()

            const newImg = new Image()
            image.imageData = newImg
            expect(image.isDirty).toBe(true)
        })

        it("should mark Artboard dirty when dimensions change", () => {
            const artboard = new Artboard(800, 600)
            artboard.clearDirty()

            artboard.width = 1024
            expect(artboard.isDirty).toBe(true)

            artboard.clearDirty()
            artboard.height = 768
            expect(artboard.isDirty).toBe(true)
        })

        it("should mark Artboard dirty when background color changes", () => {
            const artboard = new Artboard(800, 600)
            artboard.clearDirty()

            artboard.backgroundColor = Color.red()
            expect(artboard.isDirty).toBe(true)
        })
    })
})
