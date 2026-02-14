## Code Conventions

### Naming Conventions

- **Functions**: snake_case with verb_type pattern
  - `create_entity`, `update_state`, `process_data`
  - Property accessors: `property_of_entity` pattern
  - `get_name_of_user`, `calculate_length_of_path`
- **Variables**: snake_case for all identifiers
- **Types**: snake_case for type names
- **Constants**: snake_case (not SCREAMING_SNAKE_CASE)
- **Files**: Single word names only, no underscores or hyphens

### Function Design

- **Pure functions**: No side effects, predictable outputs
- **Immutable operations**: Return new instances, never modify inputs
- **Output parameters**: Use `out_*` parameters to avoid memory allocations
- **Return chaining**: Functions return output parameter for method chaining
- **Factory functions**: Provide multiple creation patterns per type

### Assignment Rules

- **Explicit assignments only**: Never use shorthand operators
- **No increment/decrement**: Use `count = count + 1` instead of `count++`
- **No compound assignments**: Use `total = total + value` instead of `total += value`
- **Full operator spelling**: Write operations completely and clearly

### Code Documentation

- **No comments**: Code is self-documenting through clear naming
- **No JSDoc**: No `/** */` documentation blocks
- **No inline comments**: No `//` comments anywhere
- **Descriptive names**: Function and variable names explain purpose completely

### Type System

- **Explicit types**: Use tuple types for efficiency where appropriate
- **Type exports**: Export types with `export type`
- **Import separation**: Use `import type { ... }` for type-only imports
- **Structured types**: Use object types with descriptive property names

### Error Handling

- **Graceful degradation**: Handle edge cases without throwing
- **Bounds checking**: Validate inputs and clamp values appropriately
- **Null returns**: Return `null` for invalid operations rather than exceptions
- **Degenerate cases**: Handle mathematical edge cases explicitly

### Performance Patterns

- **Memory efficiency**: Reuse objects through output parameters
- **Cache-friendly**: Use contiguous data structures where possible
- **Avoid allocations**: Minimize garbage collection pressure
- **Optimize hot paths**: Use efficient algorithms for frequently called code

### Import/Export Style

- **Path aliases**: Use project-specific import aliases consistently
- **Named exports**: Prefer named exports over default exports
- **Explicit imports**: Import exactly what is needed
- **Type separation**: Keep type imports separate from value imports

### Function Organization

- **Single responsibility**: Each function has one clear purpose
- **Consistent signatures**: Similar functions follow same parameter patterns
- **Parameter ordering**: Input parameters first, output parameters last
- **Return consistency**: Always return the same type from similar operations
