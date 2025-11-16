## rectangle

- constructor -> creates a rect with x, y, width and height

( x, y ) -> coordinates of left bottom point

- left, right, bottom and top -> to get the corresponding edge as a vector

- center -> get center of the rect as a vector

- contains -> takes a vector in, tells if the rect has that point

- intersects -> check if our guy intersects with another rect

- intersection -> get the intersection of the two rect

- boundingBoxUnion -> bounding box of the union of our two rect

- expand -> adds a margin space to the rectangle, increasing its size

- clone -> to create a copy rectangle

- equals -> to check if both rectangles are identical

- fromPoints -> create a rect obj from points

- fromCenter -> takes center, w, h and gives out the rectangle, 

sexy, i think this could be used often