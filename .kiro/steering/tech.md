# Technology Stack

## Runtime & Build System

- **Runtime**: Bun (JavaScript runtime)
- **Language**: TypeScript with strict mode enabled
- **Module System**: ESNext with bundler resolution
- **Formatter/Linter**: Biome (replaces ESLint + Prettier)

## Dependencies

- **paper**: Canvas vector graphics library (v0.12.18)
- **TypeScript**: v5.9.3
- **Biome**: v2.3.5

## TypeScript Configuration

- Target: ESNext
- Strict mode: Enabled
- Notable flags:
  - `noUncheckedIndexedAccess`: true
  - `noImplicitOverride`: true
  - `noFallthroughCasesInSwitch`: true
  - `verbatimModuleSyntax`: true

## Code Style (Biome)

- **Indentation**: 4 spaces
- **Semicolons**: As needed (not required)
- **Quotes**: Double quotes
- **Import organization**: Automatic on save

## Common Commands

```bash
# Run development
bun dev

# Type checking (no emit)
bun tsc # no need to add --noEmit

# Format code
bun fix
```

## Project Conventions

- Use immutable patterns where possible (methods return new instances)
- Prefer readonly arrays for public getters
- Include JSDoc comments for public APIs
- Use private fields with underscore prefix (e.g., `_parent`)
- Implement dirty flag patterns for performance optimization
- Whenever in doubt, use the fetch mcp to search the internet