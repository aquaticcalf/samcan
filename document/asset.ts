export type image_asset = {
  id: string
  src: string
  width: number
  height: number
}

export function create_image_asset(
  id: string,
  src: string,
  width: number = 0,
  height: number = 0,
): image_asset {
  return { id, src, width, height }
}
