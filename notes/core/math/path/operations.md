## path operations

PathOperations provides boolean operations on paths using paper.js interop:

- ensurePaperScope() -> initializes and caches the paper.js scope

- toPaperPath(path) -> convert a samcan Path to a paper.js Path

- fromPaperPath(paperPath) -> convert paper.js Path back to samcan Path

- union(path1, path2) -> returns combined path area

- intersection(path1, path2) -> returns overlapping area between paths

- difference(path1, path2) -> returns path1 minus path2

- xor(path1, path2) -> returns non-overlapping areas (exclusion)

Notes:
- Each operation converts to paper.js, performs the op, then converts back and cleans up temporary objects

