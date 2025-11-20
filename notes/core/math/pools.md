## pools

Global object pools to reduce GC and reuse common math types:

- Vector2Pool -> ObjectPool<Vector2> with initial size 50, max 500, reset sets (0,0)

- MatrixPool -> ObjectPool<Matrix> with initial size 20, max 200, reset sets to identity values

- ColorPool -> ObjectPool<Color> with initial size 20, max 200, reset sets rgba default

- getAllPoolStats() -> returns stats for vector2, matrix, color pools

- clearAllPools() -> clears all global pools

