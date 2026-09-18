import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { BOARDBOOKS } from './boardbook/fixtures'
import { LESSONS } from './Lesson'

/** Every page as one deck, in the order the buttons step through. */
const SLIDES = [
  ...LESSONS.map((lesson) => ({ path: `/lesson/${lesson.slug}`, title: lesson.title })),
  ...BOARDBOOKS.map((page) => ({ path: `/boardbook/${page.slug}`, title: page.title })),
]

/** Keys pressed while typing — a label being edited, a form field — are not navigation. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
}

/**
 * Previous and next, pinned to the sides of the screen, and the arrow keys
 * for a clicker. The deck is the routes; a slide is whatever the route shows.
 */
export function SlideNav() {
  const history = useHistory()
  const { pathname } = useLocation()
  const index = SLIDES.findIndex((slide) => slide.path === pathname)
  const previous = index > 0 ? SLIDES[index - 1] : null
  const next = index >= 0 && index < SLIDES.length - 1 ? SLIDES[index + 1] : null

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target)) return
      if (event.key === 'ArrowLeft' && previous) history.push(previous.path)
      if (event.key === 'ArrowRight' && next) history.push(next.path)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [history, previous, next])

  return (
    <>
      <button
        type="button"
        className="slide-step"
        data-side="left"
        aria-label={previous ? `Previous: ${previous.title}` : 'Previous slide'}
        disabled={!previous}
        onClick={() => previous && history.push(previous.path)}
      >
        <ChevronLeft size={28} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="slide-step"
        data-side="right"
        aria-label={next ? `Next: ${next.title}` : 'Next slide'}
        disabled={!next}
        onClick={() => next && history.push(next.path)}
      >
        <ChevronRight size={28} aria-hidden="true" />
      </button>
      {index >= 0 && (
        <div className="slide-count" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
          {index + 1}/{SLIDES.length}
        </div>
      )}
    </>
  )
}
