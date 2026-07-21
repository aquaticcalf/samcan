# storage and format

## document format

preserve the existing `.excalidraw` json shape wherever possible:

```text
{
  type,
  version,
  source,
  elements,
  appState,
  files
}
```

the exact field names, default values, element ids, version handling, image
metadata, and deleted-element behavior should be taken from the reference
data restore and json modules.

the first storage milestone is not a new binary format. it is a faithful
round-trip implementation that can read a real reference file, modify it, and
write it without losing information.

## in-memory document

```text
document
  path
  name
  elements
  app_state
  binary_files
  library_items
  history
  dirty
  save_state
```

keep decoded image pixels and render caches outside the serialized document.
the file model should contain the original image data and metadata needed for
portable reopening.

## save pipeline

1. receive a document mutation.
2. mark the document dirty.
3. debounce the autosave request.
4. serialize elements, app state, and files.
5. write a temporary file beside the target.
6. flush and atomically replace the target.
7. remove the recovery journal after success.
8. update the title and save status.

never overwrite the only good document before the temporary write succeeds.

## crash recovery

maintain a per-document recovery record containing:

- source path
- last known document version
- serialized document or append-only mutations
- timestamp
- save sequence number

on startup, compare the recovery record with the main file. offer recovery when
the journal is newer or the previous process ended during a save.

## libraries and settings

- `.excalidrawlib` remains the portable library format.
- the default library lives in the application data directory.
- user libraries can be opened, imported, exported, and pinned.
- recent files, theme, language, and editor preferences live in a small local
  settings file.

## compatibility rules

- use stable ids for elements and files.
- preserve unknown json fields when practical.
- tolerate missing optional fields with reference-compatible defaults.
- keep restore and migration code separate from the renderer.
- add fixtures for old and current file versions.
