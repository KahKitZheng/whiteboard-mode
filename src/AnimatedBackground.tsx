import { useLocation } from 'react-router-dom'
import type { Palette } from './palettes'
import { SLIDES } from './slides'
import './animated-background.scss'

/**
 * app-react's assignment background: a band of colour leaning across the
 * screen, with a wedge of the ground it lies on showing at the top left and
 * the foot right — ported from `pages/Assignments/AnimatedBackground`, whose
 * three panels and corner triangles are that band and that ground.
 *
 * The two colours trade places from slide to slide and cross over as they go,
 * which is what the digibord does; app-react's student pages slide the band
 * off the screen instead, and end with the ground alone.
 */
export function AnimatedBackground({ palette }: { palette: Palette }) {
  const { pathname } = useLocation()
  const index = SLIDES.findIndex((slide) => slide.path === pathname)
  if (index < 0) return null

  const swapped = index % 2 === 1
  return (
    <div
      className="animated-background"
      style={
        {
          '--ab-ground': swapped ? palette.secondary : palette.tertiary,
          '--ab-band': swapped ? palette.tertiary : palette.secondary,
        } as React.CSSProperties
      }
    />
  )
}
