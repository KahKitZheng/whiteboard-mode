import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { basename, extname } from 'node:path'

// Usage: node scripts/generate-tiles.mjs [input] [quality|lossless]
// Cuts one page image into a Deep Zoom pyramid of WebP tiles at
// public/boardbook/tiles/<name>.dzi + <name>_files/. Lossless is the default:
// a scanned spread is text and flat colour, where it is both the smallest and
// pixel-perfect (measured in deep-zoom-image-poc). Pass 1-100 for photos.
const input = process.argv[2] ?? 'public/boardbook/waterkringloop.svg'
const q = process.argv[3] ?? 'lossless'
const name = basename(input, extname(input))

// An SVG has no pixels of its own; rasterise it at 4x its declared size so
// there is something to zoom into. A raster input ignores density.
const SVG_SCALE = 4

mkdirSync('public/boardbook/tiles', { recursive: true })

const { width, height } = await sharp(input, { limitInputPixels: false, density: 72 * SVG_SCALE })
  .webp(q === 'lossless' ? { lossless: true } : { quality: Number(q) })
  .tile({ layout: 'dz', size: 512, overlap: 1 })
  .toFile(`public/boardbook/tiles/${name}`)

console.log(`Tiled ${input} (${width}x${height}, webp ${q}) -> public/boardbook/tiles/${name}.dzi`)
