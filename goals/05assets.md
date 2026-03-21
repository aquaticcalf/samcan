# Temporary Asset Goals

## Objective

Build a real asset pipeline for images and any future binary resources needed by the current direction.

## Current State

The current element model contains `src`, dimensions, and some load flags, but runtime behavior is still incomplete. The renderer can draw images, yet scene-level asset lifecycle is not fully wired.

## Required Capabilities

The asset system should manage:

- asset identity
- source url or blob source
- intrinsic dimensions
- decoded runtime object
- load state
- error state
- cleanup policy

## Image Lifecycle

The expected lifecycle is:

1. asset is inserted or referenced
2. metadata is resolved
3. decode begins
4. runtime cache becomes available
5. renderer uses cached runtime object
6. resource is released when no longer needed

## Runtime Cache

Do not confuse persisted data with runtime cache. Persist:

- asset id
- source reference
- metadata

Keep runtime-only values separate:

- `HTMLImageElement`
- `HTMLCanvasElement`
- `ImageBitmap`
- WebGL texture metadata

## Error Handling

The asset system should handle:

- broken urls
- revoked blob urls
- unsupported formats
- zero-size images
- partial load failure

The runtime should degrade gracefully instead of throwing.

## Future Extensions

The same asset pipeline can later support:

- pasted images
- drag-and-drop imports
- exported snapshots
- remote asset syncing

## Acceptance Criteria

Image support is serious enough for general use when:

- inserted images actually render
- failed images have a visible fallback state
- load state does not break rendering
- asset metadata is separate from placement
- runtime caches can be recreated from persisted data
