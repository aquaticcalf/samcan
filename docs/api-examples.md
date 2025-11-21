# samcan Usage Examples
Concise, task-oriented examples for common scenarios. Pair with the full reference (`api-reference.md`).

## 1. Quick Start Playback
```ts
import { play } from 'samcan'
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const player = await play(canvas, '/animations/intro.samcan', { loop: true, speed: 1 })
```

## 2. Controlled Player Lifecycle
```ts
import { createPlayer } from 'samcan'
const player = await createPlayer({ canvas, autoplay: false, loop: true, backend: 'webgl' })
await player.load('/animations/hero.samcan')
player.play()
setTimeout(() => player.pause(), 1500)
player.seek(0.75)
player.setSpeed(2.0)
```

## 3. Backend Capability & Fallback
```ts
import { createPlayer, getBackendInfo } from 'samcan'
const info = getBackendInfo()
console.log(info.available)
const player = await createPlayer({ canvas, backend: 'webgpu', autoplay: true }) // falls back automatically
console.log('Using backend:', player.renderer.backend)
```

## 4. Listening for Events
```ts
player.on('complete', () => console.log('Finished'))
player.on('loop', () => console.log('Loop iteration'))
player.on('play', () => console.log('Started'))
const off = player.on('pause', () => console.log('Paused'))
off() // unsubscribe
```

## 5. Responsive Canvas Resize
```ts
function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  player.resize(canvas.width, canvas.height)
}
window.addEventListener('resize', resize)
resize()
```

## 6. Inspecting Loaded Data
```ts
await player.load('/animations/card.samcan')
console.log('Duration:', player.duration)
console.log('Artboard size:', player.artboard?.width, player.artboard?.height)
```

## 7. Manual Runtime Construction (Custom Flow)
```ts
import { AnimationRuntime, Timeline, AnimationTrack, Keyframe, ShapeNode, Path, Transform, RendererFactory, Artboard, Color } from 'samcan'
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const renderer = await RendererFactory.create(canvas, 'canvas2d')
const runtime = new AnimationRuntime(renderer)

// Build scene
const artboard = new Artboard(400, 300, Color.black())
const path = new Path(); path.moveTo(0,0); path.lineTo(200,0); path.lineTo(200,100); path.close()
const shape = new ShapeNode(path, new Transform())
artboard.addChild(shape)

// Build animation
const timeline = new Timeline(2)
const track = new AnimationTrack(shape, 'opacity')
track.addKeyframe(new Keyframe(0, 0))
track.addKeyframe(new Keyframe(2, 1))

await runtime.load({ artboard, timeline })
runtime.play()
```

## 8. State Machine Interaction
```ts
import { StateMachine, StateTransition, EventCondition, BooleanCondition } from 'samcan'
const sm = new StateMachine()
// assume idleState, hoverState already created AnimationState instances
sm.addState(idleState)
sm.addState(hoverState)
sm.changeState(idleState.id)
sm.addTransition(new StateTransition(idleState.id, hoverState.id, [ new EventCondition('hover') ]))
sm.trigger('hover')
sm.update(0.016)
```

## 9. Custom Plugin
```ts
import type { Plugin } from 'samcan'
class Pulse implements Plugin {
  metadata = { name: 'pulse', version: '1.0.0' }
  private runtime!: any
  initialize(rt) { this.runtime = rt }
  update(dt) { /* run per-frame logic */ }
  cleanup() { /* release resources */ }
}
player.runtime.plugins.register(new Pulse())
```

## 10. Asset Preloading & Fallback
```ts
import { AssetManager } from 'samcan'
const assets = new AssetManager()
assets.on('load-error', e => console.warn('Asset failed:', e.assetUrl))
await assets.preload([
  { url: '/img/logo.png', type: 'image' },
  { url: '/fonts/Brand.woff2', type: 'font', family: 'Brand' }
])
const logo = await assets.loadImage('/img/logo@2x.png', { fallbackUrl: '/img/logo.png', maxRetries: 2 })
```

## 11. Serialize & Compress
```ts
import { Serializer } from 'samcan'
const serializer = new Serializer()
const file = serializer.serializeSamcanFile([player.runtime.artboard!], { name: 'Banner' })
const json = serializer.toJSON(file)
const compressed = await serializer.toCompressedJSON(file)
// Upload compressed (Uint8Array) to server
```

## 12. Incremental Large File Parsing
```ts
const response = await fetch('/large.anim.samcan.gz')
const arrayBuffer = await response.arrayBuffer()
const serializer = new Serializer()
const file = await serializer.fromCompressedJSONIncremental(new Uint8Array(arrayBuffer))
console.log('Loaded big file', file.metadata.name)
```

## 13. Error Handling
```ts
import { SamcanError } from 'samcan'
try { await player.load('/broken.samcan') } catch (e) {
  if (e instanceof SamcanError) {
    console.error('Code:', e.code, 'Details:', e.context)
  }
}
```

## 14. Dynamic Property Animation (Nested Path)
```ts
const track = new AnimationTrack(shape, 'transform.position.x')
track.addKeyframe(new Keyframe(0, 0))
track.addKeyframe(new Keyframe(1, 200))
```

## 15. Custom Easing
```ts
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)
track.addKeyframe(new Keyframe(0, 0, 'linear'))
track.addKeyframe(new Keyframe(2, 100, 'linear', easeOutQuad))
```

## 16. Checking Actual Frame Progress
```ts
player.on('play', () => {
  const loop = () => {
    if (player.isPlaying) {
      console.log(player.currentTime, '/', player.duration)
      requestAnimationFrame(loop)
    }
  }
  loop()
})
```

## 17. Transition Priority Example
```ts
// Higher priority wins when both conditions valid
sm.addTransition(new StateTransition(a.id, b.id, [ new BooleanCondition('go', true) ], 0, 5))
sm.addTransition(new StateTransition(a.id, c.id, [ new TimeCondition(2) ], 0, 1))
```

## 18. Safe Plugin Unregistration
```ts
player.runtime.plugins.unregister('pulse')
```

## 19. Fallback Placeholder Image
```ts
const img = await assets.loadImage('/missing.png')
if (img.id === '__placeholder__') {
  console.warn('Using placeholder')
}
```

## 20. Manual Asset Bundle Extraction
```ts
const serializer = new Serializer()
const file = serializer.serializeSamcanFile([player.runtime.artboard!], { name: 'Export' }, { includeAssets: true, assetManager: player.assetManager })
const bundle = await serializer.createAssetBundle(file.assets.map(a => a.id), player.assetManager)
for (const [id, entry] of bundle) {
  console.log(id, entry.type)
}
```

## 21. React Wrapper  `<SamcanPlayer>` Component
```tsx
import { SamcanPlayer } from 'samcan/react'

export function HeroAnimation() {
  return (
    <SamcanPlayer
      src="/animations/hero.samcan"
      autoplay
      config={{ backend: 'canvas2d', loop: true, speed: 1.25 }}
      width={800}
      height={600}
      // Alternatively, control size via parent CSS:
      // style={{ width: '100%', height: 400 }}
      onReady={player => {
        // You can call player?.pause(), player?.seek(0.5), etc.
      }}
    />
  )
}
```

## 22. React Wrapper  `useSamcanPlayer` Hook
```tsx
import { useSamcanPlayer } from 'samcan/react'

export function PlayerWithControls() {
  const { canvasRef, player, isLoading, error } = useSamcanPlayer({
    src: '/animations/button.samcan',
    autoplay: true,
    config: { loop: true }
  })

  return (
    <div>
      <canvas ref={canvasRef} width={640} height={360} />
      <div>
        <button onClick={() => player?.play()}>Play</button>
        <button onClick={() => player?.pause()}>Pause</button>
        <button onClick={() => player?.stop()}>Stop</button>
      </div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

End of examples.
