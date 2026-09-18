import { Fragment, useLayoutEffect, useRef } from 'react'

/** One line of the page's text, as a box in percentages of the image; `fontSize` as a percentage of its width. */
export type TextLine = { text: string; x: number; y: number; width: number; height: number; fontSize: number }

type Props = {
  lines: TextLine[]
}

/**
 * The page's words laid invisibly over where the picture shows them. The
 * picture is what you see; these are what a highlighter snaps to (ADR 0008).
 * Sized in container units, so they scale with the image box as the markers'
 * percentages do.
 *
 * Each line is stretched to end where the picture's does, since the picture's
 * renderer and this browser need not agree on a font. Measured in place and
 * again on every resize, not once off-screen: the system font swaps its
 * tracking with its size (SF Text below ~20px, SF Display above), so a width
 * read at one size is wrong at another.
 */
export function TextLayer({ lines }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return

    function fit() {
      if (!element) return
      const width = element.offsetWidth
      const spans = element.querySelectorAll('span')
      spans.forEach((span, index) => {
        // Layout width, untouched by the transform already on it.
        const natural = span.offsetWidth
        const target = (lines[index].width / 100) * width
        span.style.transform = natural > 0 ? `scaleX(${target / natural})` : ''
      })
    }

    const observer = new ResizeObserver(fit)
    observer.observe(element)
    document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [lines])

  return (
    <div className="boardbook-text" data-block ref={root}>
      {lines.map((line, index) => (
        // The space after each line keeps a quote across lines readable; it collapses on screen.
        <Fragment key={index}>
          <span
            style={{
              left: `${line.x}%`,
              top: `${line.y}%`,
              fontSize: `${line.fontSize}cqw`,
              lineHeight: `${line.height}cqh`,
            }}
          >
            {line.text}
          </span>{' '}
        </Fragment>
      ))}
    </div>
  )
}
