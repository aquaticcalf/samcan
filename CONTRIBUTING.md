# Contributing to samcan

Thank you for your interest in contributing to samcan! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3.7 or higher
- Node.js 18+ (for compatibility testing)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/aquaticcalf/samcan.git
   cd samcan
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run type checking**
   ```bash
   bun run tsc
   ```

4. **Run tests**
   ```bash
   bun test
   ```

5. **Format code**
   ```bash
   bun run fix
   ```

## Project Structure

```
samcan/
├── core/              # Core animation runtime (DO NOT MODIFY for editor features)
│   ├── animation/     # Timeline, keyframes, state machines
│   ├── asset/         # Asset loading and management
│   ├── command/       # Command pattern for undo/redo
│   ├── editor/        # Editor types (implementation pending)
│   ├── error/         # Typed error classes
│   ├── math/          # Vector2, Matrix, Color, Path, etc.
│   ├── plugin/        # Plugin system
│   ├── renderer/      # Canvas2D, WebGL renderers
│   ├── scene/         # Scene graph nodes
│   ├── serialization/ # File format + JSON serialization
│   ├── timing/        # Clock and scheduler
│   └── api.ts         # High-level public API
│
├── wrapper/           # Framework wrappers
│   └── react/         # React hooks and components
│
├── test/              # Comprehensive test suite
├── demo/              # Demo applications
├── docs/              # API documentation
└── .scripts/          # Utility scripts

```

## Coding Standards

Please read [CODING_STANDARDS.md](./CODING_STANDARDS.md) for detailed coding guidelines. Key points:

### TypeScript

- Enable strict mode
- No `any` types (use `unknown` if type is truly unknown)
- Use branded types for IDs
- Prefer `readonly` for immutable data

### Naming Conventions

- **Private fields**: `_fieldName` (underscore prefix)
- **Public fields**: Use getters/setters with private backing field
- **Exception**: Math classes (Vector2, Matrix, Color, etc.) use direct public access for performance
- **Methods**: `camelCase` (public), `_camelCase` (private)
- **Constants**: `UPPER_SNAKE_CASE`

### File Organization

- One class per file
- File name matches class name (lowercase)
- Use barrel exports (`index.ts`) for clean imports

### Documentation

- Add JSDoc comments to all public APIs
- Include `@param`, `@returns`, and `@example` tags
- Document complex algorithms and design decisions

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/vector2.test.ts

# Run tests in watch mode
bun test --watch
```

### Writing Tests

- Write tests for all public APIs
- Use property-based testing (fast-check) for math operations
- Mock external dependencies (canvas, WebGL)
- Aim for >90% code coverage

### Test Structure

```typescript
import { describe, it, expect } from "bun:test"

describe("MyClass", () => {
    it("should do something", () => {
        // Arrange
        const instance = new MyClass()
        
        // Act
        const result = instance.doSomething()
        
        // Assert
        expect(result).toBe(expected)
    })
})
```

## Submitting Changes

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Run quality checks**
   ```bash
   bun run tsc          # Type checking
   bun test             # Run tests
   bun run fix          # Format code
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Use [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Build process or tooling changes

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

### Pull Request Guidelines

- **Title**: Use conventional commit format
- **Description**: Explain what, why, and how
- **Tests**: Include tests for new functionality
- **Documentation**: Update docs if needed
- **Breaking Changes**: Clearly mark breaking changes

## Code Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. Publish to npm: `bun run publish`

## Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Discord**: Join our Discord server (link in README)

## License

By contributing to samcan, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're all here to build something great together!

---

Thank you for contributing to samcan! 🎨✨
