import { Dialog } from '@base-ui-components/react/dialog'
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { SLIDES, type Slide } from './slides'

/**
 * The slide count, as a button on the whiteboard bar, and the drawer it
 * opens: every slide as a numbered thumbnail, the current one outlined.
 * Pressing one goes there. Thumbnails are schematic — a header and a glyph
 * for the kind of page — not renders of the slides.
 */
export function SlideOverview() {
  const history = useHistory()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const index = SLIDES.findIndex((slide) => slide.path === pathname)
  if (index < 0) return null

  function go(slide: Slide) {
    history.push(slide.path)
    setOpen(false)
  }

  return (
    /*
      Not modal: a modal dialog locks the page's scroll, and taking the
      scrollbar away moves the centred card by half its width while the drawer
      is up. Nothing here needs the lock; a press outside still closes it.
    */
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Trigger className="slide-count" aria-label={`Slide ${index + 1} of ${SLIDES.length}. Show all slides`}>
        {index + 1}/{SLIDES.length}
        <ChevronUp size={16} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="drawer-backdrop" />
        <Dialog.Popup className="slide-drawer">
          <div className="slide-drawer-head">
            <Dialog.Title className="slide-drawer-title">Slides</Dialog.Title>
            <Dialog.Close className="slide-drawer-close" aria-label="Close slides">
              <ChevronDown size={22} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Thumbs>
            {SLIDES.map((slide, at) => (
              <li key={slide.path}>
                <button
                  type="button"
                  className="slide-thumb"
                  aria-current={at === index ? 'true' : undefined}
                  onClick={() => go(slide)}
                >
                  <span className="slide-thumb-name">
                    <span className="slide-thumb-number">{at + 1}</span>
                    {slide.kind === 'boardbook' ? <BookOpen size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                    {slide.title}
                  </span>
                  <Thumbnail kind={slide.kind} />
                </button>
              </li>
            ))}
          </Thumbs>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * The row of thumbnails, scrolling sideways when there are more than fit,
 * with a shadow at whichever end has more behind it. Set from the scroll
 * position rather than a scroll-driven animation, which Safari only got in
 * 2025.
 */
function Thumbs({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLOListElement>(null)
  const [more, setMore] = useState({ start: false, end: false })

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    function measure() {
      if (!element) return
      const slack = 1
      setMore({
        start: element.scrollLeft > slack,
        end: element.scrollLeft + element.clientWidth < element.scrollWidth - slack,
      })
    }
    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="slide-thumbs-wrap" data-more-start={more.start || undefined} data-more-end={more.end || undefined}>
      <ol className="slide-thumbs" ref={scroller}>
        {children}
      </ol>
    </div>
  )
}

/** A schematic of the page: a header bar, then columns of text or a picture beside text. */
function Thumbnail({ kind }: { kind: Slide['kind'] }) {
  return (
    <svg className="slide-thumb-art" viewBox="0 0 160 100" aria-hidden="true">
      <rect x="0" y="0" width="160" height="100" rx="6" className="thumb-page" />
      <rect x="16" y="10" width="40" height="6" rx="2" className="thumb-accent" />
      {kind === 'boardbook' ? (
        <>
          <rect x="16" y="26" width="64" height="58" rx="3" className="thumb-picture" />
          <rect x="90" y="30" width="54" height="5" rx="2" className="thumb-line" />
          <rect x="90" y="41" width="48" height="5" rx="2" className="thumb-line" />
          <rect x="90" y="52" width="54" height="5" rx="2" className="thumb-line" />
        </>
      ) : (
        <>
          <rect x="16" y="28" width="82" height="5" rx="2" className="thumb-line" />
          <rect x="16" y="39" width="82" height="5" rx="2" className="thumb-line" />
          <rect x="16" y="50" width="70" height="5" rx="2" className="thumb-line" />
          <rect x="16" y="66" width="82" height="5" rx="2" className="thumb-line" />
          <rect x="112" y="28" width="32" height="5" rx="2" className="thumb-line" />
          <rect x="112" y="39" width="32" height="5" rx="2" className="thumb-line" />
        </>
      )}
    </svg>
  )
}
