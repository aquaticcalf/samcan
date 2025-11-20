## matrix

[affine transformation matrix](https://www.youtube.com/watch?v=AheaTd_l5Is)

Structure:
[ a  c  tx ]
[ b  d  ty ]
[ 0  0  1  ]

a -> scale x
b -> skew y
c -> skew x
d -> scale y
tx -> translate x
ty -> translate y

Rotation is a combination of a, b, c, d:
a = cos(angle)
b = sin(angle)
c = -sin(angle)
d = cos(angle)

- constructor -> a, b, c, d, tx, ty and makes a matrix out of those values

- multiply -> multiply another affine matrix with our guy

- determinant -> returns determinant of the original matrix without tx, ty

- invert -> inverts the entire matrix, if det is 0 returns identity

- transformPoint -> applies the matrix to a point (vector2), includes translation

- transformVector -> applies the matrix to a vector, ignores translation (direction only)

- translate, scale, rotate -> static methods to create specific transformation matrices

- identity -> static method to create an identity matrix

- fromTRS -> create a matrix from translation, rotation, and scale components

- clone -> create a copy of our guy

- equals -> check if two matrices are equal within a given epsilon

- isIdentity -> checks if our guy is an identity matrix

- appendTranslation, appendRotation, appendScale -> adds transformation *after* the current one (multiplies on the right)

- prependTranslation, prependRotation, prependScale -> adds transformation *before* the current one (multiplies on the left)

- setFrom -> copies values from another matrix into our guy

- setIdentity -> resets our guy to identity matrix
