# native odin excalidraw plan

this folder is the index for the plan to build a local-first desktop drawing
application from scratch in odin.

the existing excalidraw repository is used as a behavior, file-format, and
testing reference. the finished application should not depend on react,
typescript, the dom, a browser runtime, electron, tauri, or vite.

## documents

- [architecture](architecture.md) — runtime layers, project layout, and the
  native event/render loop.
- [vendors](vendors.md) — which odin vendor libraries to use and why.
- [feature parity](feature-parity.md) — the editor features to reproduce and
  the local replacements for cloud features.
- [storage and format](storage-and-format.md) — document data, compatible
  files, autosave, recovery, and libraries.
- [roadmap](roadmap.md) — the implementation order and milestones.
- [testing](testing.md) — parity tests, rendering tests, and the definition of
  done.

## target

the result is a native desktop executable with:

- an infinite hand-drawn canvas
- local files as the source of truth
- native autosave and crash recovery
- `.excalidraw` and `.excalidrawlib` compatibility
- png, svg, image, and clipboard workflows
- the full single-user editor experience
- multiplayer intentionally omitted

## important boundary

the editor itself can be fully local. some features in the web application are
services rather than editor behavior. multiplayer, firebase, sentry, pwa
service workers, shareable links, published libraries, excalidraw+, and hosted
ai need local replacements or must be optional.

full mermaid parsing, hosted ai, embedded web pages, and exact roughjs output
are also not provided by the odin vendor collection. they need dedicated native
implementations or later optional integrations.
