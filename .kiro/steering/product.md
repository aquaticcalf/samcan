# Product Overview

samcan is an open-source animation runtime and authoring system - a modern reimagination of Adobe Flash. It provides a framework-agnostic engine for creating, playing back, and manipulating vector-based animations with a focus on performance and modern web standards.

## Core Capabilities

- Framework-agnostic animation runtime that works in any JavaScript environment
- Multi-backend rendering (Canvas2D, WebGL, WebGPU) with automatic fallback
- Timeline-based animation system with keyframes and interpolation
- Interactive state machine for responsive, user-driven animations
- Vector graphics primitives with resolution-independent scaling
- Command pattern for undo/redo operations in authoring tools
- JSON-based serialization format for animation persistence

## Design Philosophy

- Performance-first: Target 60fps for animations with up to 1000 vector objects
- Extensibility: Plugin system for custom behaviors without modifying core
- Modern web standards: Built for contemporary JavaScript environments
- Open source: Inspired by Rive.app but fully open and extensible
