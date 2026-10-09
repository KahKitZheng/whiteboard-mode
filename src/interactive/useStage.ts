import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import type { Size } from '../boardbook/coords'

/**
 * The image as laid out: its own pixels, and how wide it is on screen. A
 * marker's authored percentage needs both — the first for its box, the
 * second for the size that box has right now.
 */
export function useStage() {
  const ref = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<Size | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function onLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget
    setImage({ width: naturalWidth, height: naturalHeight })
  }

  const ready = image !== null && width > 0
  /** The image's box on screen, for pointer maths. */
  const stage: Size | null = ready ? { width, height: (width * image.height) / image.width } : null

  return { ref, onLoad, image, width, stage }
}
