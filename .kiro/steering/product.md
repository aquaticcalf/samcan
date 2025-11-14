# Product Overview

samcan is an open-source animation runtime and authoring system - a modern reimagination of Adobe Flash. It provides a framework-agnostic engine for creating, playing back, and manipulating vector-based animations with a focus on performance and modern web standards.

## Core Capabilities

### Implemented
- Framework-agnostic animation runtime that works in any JavaScript environment
- Multi-backend rendering (Canvas2D, WebGL) with automatic fallback via RendererFactory
- Vector graphics primitives with resolution-independent scaling
- Scene graph with hierarchical node system (Artboard, GroupNode, ShapeNode, ImageNode)
- Transform system with local and world coordinate spaces
- Command pattern for undo/redo operations in authoring tools
- Animation timing system with Clock and Scheduler
- Editor foundation with viewport management (zoom, pan, coordinate transformations)
- Type-safe event system for editor interactions

### Planned
- Timeline-based animation system with keyframes and interpolation
- Interactive state machine for responsive, user-driven animations
- JSON-based serialization format for animation persistence
- WebGPU rendering backend
- Plugin system for custom behaviors

## Design Philosophy

- Performance-first: Target 60fps for animations with up to 1000 vector objects
- Extensibility: Plugin system for custom behaviors without modifying core
- Modern web standards: Built for contemporary JavaScript environments
- Open source: Inspired by Rive.app but fully open and extensible

## Current Development Status

The project is in active development with two main feature areas:

1. **Animation Runtime Core** - The core engine for rendering and animating vector graphics
   - Scene graph and node hierarchy ✓
   - Multi-backend rendering system ✓
   - Transform system ✓
   - Timing and scheduling ✓
   - Animation system (in progress)

2. **Editor Authoring Tool** - Visual editor for creating animations
   - Editor foundation and viewport ✓
   - Event system ✓
   - Tool system (planned)
   - Timeline UI (planned)
   - Property panels (planned)
