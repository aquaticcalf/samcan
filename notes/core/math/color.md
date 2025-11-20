## color

- constructor -> create a color using r,g,b,a with range of each value being ( 0 - 1 ), anything > 1 would be considered as 1

- toRGBA -> coverts the range to ( 0 - 255 ) for any css based calculations -> it returns "rgba(r,g,b,a)" -> like a css rgba string

- toHex -> converts into #000000 - #FFFFFF

- lerp -> gives color that is at midway between two colors, at a certain ratio

- clone -> creates a copy of current color

- equals -> checks if two colors are equal within a given epsilon

- fromRGB -> to create a color from normal 0-255 style r,g,b

- fromHex -> creates a color from #000000 - #FFFFFF

- white, black, red, green, blue, transparent -> predefined colors

- setFrom -> gets r,g,b from another color to create current color

- set -> change r,g,b values of current color