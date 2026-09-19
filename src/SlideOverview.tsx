import { Dialog } from '@base-ui-components/react/dialog'
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useState } from 'react'
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
          <ol className="slide-thumbs">
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
          </ol>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
