# Coding Standards

This document outlines the coding standards and conventions used in the samcan project.

## Naming Conventions

### Fields

- **Private fields**: Use underscore prefix (`_fieldName`)
  ```typescript
  private _duration: number
  private _isPlaying: boolean
  ```

- **Public fields**: Use getters/setters with private backing field
  ```typescript
  private _name: string
  
  get name(): string {
      return this._name
  }
  
  set name(value: string) {
      this._name = value
  }
  ```

- **Exception - Math Primitives**: Classes in `core/math/` (Vector2, Matrix, Color, Rectangle, Transform) use **direct public field access** for performance optimization. These are accessed frequently in tight render loops.
  ```typescript
  // Math classes use direct public access for performance
  const vec = new Vector2(10, 20)
  vec.x = 30  // Direct access allowed
  ```

- **Readonly fields**: Use `readonly` modifier for public immutable fields
  ```typescript
  readonly backend: RendererBackend
  readonly capabilities: RendererCapabilities
  ```

### Methods

- **Public methods**: `camelCase`
  ```typescript
  addChild(node: SceneNode): void
  getWorldTransform(): Matrix
  ```

- **Private methods**: `_camelCase` with underscore prefix
  ```typescript
  private _evaluateTransitions(): void
  private _flushBatches(): void
  ```

### Constants

- **Constants**: `UPPER_SNAKE_CASE`
  ```typescript
  const MAX_TEXTURE_SIZE = 2048
  const DEFAULT_FPS = 60
  ```

## TypeScript Best Practices

### Type Safety

- Avoid `any` types - use specific types or generics
- Use strict null checking (`strictNullChecks: true`)
- Prefer `unknown` over `any` when type is truly unknown
- Use branded types for IDs to prevent mixing different ID types

### Error Handling

- Use typed error classes from `core/error/`
- All errors should extend `SamcanError`
- Include error codes for programmatic handling
- Provide context objects with relevant information

### Documentation

- Add JSDoc comments to all public APIs
- Include `@param` and `@returns` tags
- Document complex algorithms and architectural decisions
- Add examples for non-obvious usage

### File Organization

- One class per file
- File name matches class name (lowercase)
- Group related functionality in subdirectories
- Use barrel exports (`index.ts`) for clean imports

### Imports

- Use absolute imports with `@/` path alias
- Group imports: external deps → internal modules → types
- Avoid circular dependencies

## Architecture Patterns

### Performance Considerations

1. **Math Classes**: Direct public field access for Vector2, Matrix, Color, etc.
2. **Object Pooling**: Use pools for frequently allocated objects (Vector2, Matrix)
3. **Dirty Flags**: Track when recalculation is needed (transforms, bounds)
4. **Batching**: Group similar operations to reduce overhead

### Design Patterns

- **Command Pattern**: For undo/redo operations
- **Factory Pattern**: For renderer creation with fallback
- **Strategy Pattern**: For different rendering backends
- **Observer Pattern**: For event systems
- **Scene Graph Pattern**: For hierarchical node structures

## Testing

- Write tests for all public APIs
- Use property-based testing (fast-check) for math operations
- Mock external dependencies (canvas, WebGL)
- Maintain >90% code coverage

## Version Control

- Write descriptive commit messages
- Use conventional commits format
- Keep commits focused and atomic
- Run tests before committing (pre-commit hook)
