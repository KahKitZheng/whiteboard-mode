export type Size = { width: number; height: number }

/** A box in percentages of an image, the way boardbook data stores one. */
export type PercentBox = { x: number; y: number; width: number; height: number }

/** The same box in that image's pixels. */
export type PixelBox = { x: number; y: number; width: number; height: number }

export function percentToImage(box: PercentBox, image: Size): PixelBox {
  return {
    x: (box.x / 100) * image.width,
    y: (box.y / 100) * image.height,
    width: (box.width / 100) * image.width,
    height: (box.height / 100) * image.height,
  }
}

export function imageToPercent(box: PixelBox, image: Size): PercentBox {
  return {
    x: (box.x / image.width) * 100,
    y: (box.y / image.height) * 100,
    width: (box.width / image.width) * 100,
    height: (box.height / image.height) * 100,
  }
}

/**
 * How wide the image is on screen when it is fitted whole into a container —
 * the zoom the viewer opens at, and the one a marker's authored size refers to.
 */
export function fitWidth(container: Size, image: Size): number {
  return Math.min(container.width, (container.height * image.width) / image.height)
}

/**
 * How much bigger the image is on screen than fitted whole. This is what ink
 * drawn now is divided by, so it reads at the pen's weight while zoomed in and
 * shrinks with the image afterwards rather than staying board-sized.
 */
export function zoomRatio(zoom: number, homeZoom: number): number {
  return homeZoom > 0 ? zoom / homeZoom : 1
}
