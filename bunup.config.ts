import { defineConfig } from "bunup"
import { exports } from "bunup/plugins"

export default defineConfig({
  entry: [
    "index.ts",
    "camera/index.ts",
    "document/index.ts",
    "math/index.ts",
    "renderer/index.ts",
    "spatial/index.ts",
    "stroke/index.ts",
    "engine/index.ts",
    "editor/index.ts",
  ],
  format: ["esm", "cjs"],
  plugins: [exports()],
})
