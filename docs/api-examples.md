# samcan API Examples

This document provides examples of using the samcan high-level API for common use cases.

## Quick Start

### Simple Animation Playback

The simplest way to play an animation:

```typescript
import * as samcan from 'samcan'

// Get canvas element
const canvas = document.getElementById('canvas') as HTMLCanvasElement

// Load and play animation
const player = await samcan.play(canvas, 'animation.samcan', {
  loop: true,
  speed: 1.0
})
```

### Create Player with Configuration

For more control, create a player with custom configuration:

```typescript
import { createPlayer } from 'samcan'

const player = await createPlayer({
  canvas: document.getElementById('canvas') as HTMLCanvasElement,
  autoplay: false,
  loop: true,
  speed: 1.5,
  backend: 'webgl' // Preferred backend (will fallback automatically)
})

// Load animation
await player.load('animation.samcan')

// Control playback
player.play()
player.pause()
player.stop()
player.seek(2.5) // Seek to 2.5 seconds
```

## Playback Control

### Basic Controls

```typescript
// Play/pause/stop
player.play()
player.pause()
player.stop()

// Seek to specific time
player.seek(5.0) // Seek to 5 seconds

// Change speed
player.setSpeed(2.0) // 2x speed
player.setSpeed(0.5) // Half speed

// Toggle loop
player.setLoop(true)
player.setLoop(false)
```

### Playback State

```typescript
// Check playback state
if (player.isPlaying) {
  console.log('Animation is playing')
}

// Get current time and duration
console.log(`Time: ${player.currentTime}s / ${player.duration}s`)

// Calculate progress percentage
const progress = (player.currentTime / player.duration) * 100
console.log(`Progress: ${progress}%`)
```

## Event Handling

### Listen to Playback Events

```typescript
// Listen for events
const unsubscribe = player.on('complete', () => {
  console.log('Animation completed!')
})

player.on('loop', () => {
  console.log('Animation looped')
})

player.on('play', () => {
  console.log('Playback started')
})

player.on('pause', () => {
  console.log('Playback paused')
})

player.on('stop', () => {
  console.log('Playback stopped')
})

// Unsubscribe when done
unsubscribe()
```

## Loading Animations

### Load from URL

```typescript
// Load from URL
await player.load('https://example.com/animation.samcan')

// Load with options
await player.load('animation.samcan', {
  preloadAssets: true,
  assetTimeout: 30000 // 30 seconds
})
```

### Load from Object

```typescript
import { loadAnimation } from 'samcan'

// Load animation file
const animationFile = await loadAnimation('animation.samcan')

// Inspect metadata
console.log('Name:', animationFile.metadata.name)
console.log('Duration:', animationFile.artboards[0]?.timeline.duration)

// Load into player
await player.load(animationFile)
```

### Load Compressed Animations

```typescript
// Compressed files (.samcan.gz) are automatically detected and decompressed
await player.load('animation.samcan.gz')
```

## Rendering Backends

### Check Available Backends

```typescript
import { getBackendInfo } from 'samcan'

const info = getBackendInfo()
console.log('Available backends:', info.available)
console.log('WebGL supported:', info.webgl)
console.log('WebGPU supported:', info.webgpu)
console.log('Canvas2D supported:', info.canvas2d)
```

### Specify Preferred Backend

```typescript
// Prefer WebGL, fallback to Canvas2D if unavailable
const player = await createPlayer({
  canvas,
  backend: 'webgl' // Will automatically fallback if unavailable
})

// Check which backend was used
console.log('Using backend:', player.renderer.backend)
```

## Canvas Resizing

### Responsive Canvas

```typescript
// Resize canvas and renderer
function resizeCanvas() {
  const width = window.innerWidth
  const height = window.innerHeight
  
  canvas.width = width
  canvas.height = height
  
  player.resize(width, height)
}

// Handle window resize
window.addEventListener('resize', resizeCanvas)
resizeCanvas()
```

## Asset Management

### Custom Asset Manager

```typescript
import { createPlayer, AssetManager } from 'samcan'

// Create shared asset manager
const assetManager = new AssetManager()

// Preload assets
await assetManager.preload([
  { url: 'image1.png', type: 'image' },
  { url: 'image2.png', type: 'image' },
  { url: 'font.woff2', type: 'font', family: 'CustomFont' }
])

// Create player with shared asset manager
const player = await createPlayer({
  canvas,
  assetManager
})
```

### Asset Loading Events

```typescript
import { AssetManager } from 'samcan'

const assetManager = new AssetManager()

// Listen for asset events
assetManager.on('load-start', (event) => {
  console.log('Loading:', event.assetUrl)
})

assetManager.on('load-success', (event) => {
  console.log('Loaded:', event.assetUrl)
})

assetManager.on('load-error', (event) => {
  console.error('Failed to load:', event.assetUrl, event.error)
})
```

## Advanced Usage

### Access Runtime Directly

```typescript
// Access the underlying AnimationRuntime for advanced control
const runtime = player.runtime

// Access timeline
const timeline = runtime.timeline
if (timeline) {
  console.log('Timeline duration:', timeline.duration)
  console.log('Timeline FPS:', timeline.fps)
  console.log('Number of tracks:', timeline.tracks.length)
}

// Access artboard
const artboard = runtime.artboard
if (artboard) {
  console.log('Artboard size:', artboard.width, 'x', artboard.height)
}
```

### Plugin System

```typescript
import { Plugin } from 'samcan'

// Create custom plugin
class MyPlugin implements Plugin {
  name = 'my-plugin'
  version = '1.0.0'
  
  initialize(runtime) {
    console.log('Plugin initialized')
  }
  
  update(deltaTime) {
    // Called every frame
  }
  
  cleanup() {
    console.log('Plugin cleaned up')
  }
}

// Register plugin
player.runtime.plugins.register(new MyPlugin())
```

## Cleanup

### Destroy Player

```typescript
// Clean up resources when done
player.destroy()
```

## Complete Example

```typescript
import { createPlayer } from 'samcan'

async function initAnimation() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  
  // Create player
  const player = await createPlayer({
    canvas,
    autoplay: false,
    loop: true,
    speed: 1.0
  })
  
  // Load animation
  await player.load('animation.samcan')
  
  // Setup controls
  document.getElementById('play')?.addEventListener('click', () => {
    player.play()
  })
  
  document.getElementById('pause')?.addEventListener('click', () => {
    player.pause()
  })
  
  document.getElementById('stop')?.addEventListener('click', () => {
    player.stop()
  })
  
  // Setup progress bar
  const progressBar = document.getElementById('progress') as HTMLInputElement
  
  player.on('play', () => {
    const updateProgress = () => {
      if (player.isPlaying) {
        const progress = (player.currentTime / player.duration) * 100
        progressBar.value = String(progress)
        requestAnimationFrame(updateProgress)
      }
    }
    updateProgress()
  })
  
  progressBar.addEventListener('input', () => {
    const time = (Number(progressBar.value) / 100) * player.duration
    player.seek(time)
  })
  
  // Handle window resize
  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    player.resize(canvas.width, canvas.height)
  }
  
  window.addEventListener('resize', resize)
  resize()
  
  return player
}

// Initialize
initAnimation().catch(console.error)
```

## TypeScript Types

All API functions and classes are fully typed. Import types as needed:

```typescript
import type {
  PlayerConfig,
  LoadOptions,
  AnimationPlayer,
  SamcanFile,
  RendererBackend
} from 'samcan'
```
