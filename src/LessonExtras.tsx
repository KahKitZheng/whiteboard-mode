import { Dialog } from '@base-ui-components/react/dialog'
import { useRef, useState } from 'react'
import { AnnotationSurface } from './annotation/AnnotationSurface'

/**
 * A popup and a fullscreen view, each declaring its own surface. They exist to
 * prove that annotations belong to the context they were drawn on rather than
 * to the page — the requirement that was hardest with the previous SDK.
 */
export function LessonExtras({ slug }: { slug: string }) {
  return (
    <div className="lesson-extras">
      <DiagramPopup slug={slug} />
      <FullscreenStage slug={slug} />
    </div>
  )
}

function DiagramPopup({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)

  return (
    /*
      An annotatable dialog cannot be modal. A modal one marks everything
      outside it aria-hidden and blocks pointer interaction there — which
      includes the whiteboard toolbar, leaving no way to pick a tool or undo
      while the dialog is the thing you're annotating.
      See docs/adr/0004-annotatable-dialogs-are-not-modal.md.
    */
    <Dialog.Root
      open={open}
      modal={false}
      onOpenChange={(next, details) => {
        /*
          A non-modal dialog closes both when focus leaves it and on any press
          outside it — and the whiteboard toolbar is outside it. Neither counts
          here, so dismissal is explicit: the backdrop's own click handler
          below, the close button, or Escape.
        */
        const deliberate = details.reason === 'close-press' || details.reason === 'escape-key'
        if (!next && !deliberate) return
        setOpen(next)
      }}
    >
      <Dialog.Trigger className="extra-button">Open the diagram</Dialog.Trigger>
      <Dialog.Portal>
        {/*
          The popup's surface spans the whole viewport, so with whiteboard mode
          armed you can annotate anywhere on screen and the marks belong to the
          popup. It sits in the same portal, so it paints above the page's layer
          for the reason the dialog itself does — no z-index arithmetic.

          The backdrop is the surface's child, so a press on it is a press on
          the backdrop whether armed or not: a tap dismisses, a drag draws
          (ADR 0006). The toolbar, which is also "outside", does neither.
        */}
        <AnnotationSurface id={`lesson-${slug}:popup`} className="popup-surface">
          <Dialog.Backdrop className="dialog-backdrop" onClick={() => setOpen(false)} />
          <Dialog.Popup className="dialog-popup">
            <Dialog.Title>Diagram</Dialog.Title>
            <div className="diagram">
              <p>Annotate this diagram. The marks belong to the popup, not the page.</p>
              <svg viewBox="0 0 200 100" className="diagram-art" aria-hidden="true">
                <circle cx="55" cy="50" r="34" />
                <circle cx="115" cy="50" r="34" />
              </svg>
            </div>
            <Dialog.Close className="extra-button">Close</Dialog.Close>
          </Dialog.Popup>
        </AnnotationSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function FullscreenStage({ slug }: { slug: string }) {
  const stage = useRef<HTMLDivElement>(null)

  // The element that goes fullscreen must contain the annotation layer:
  // fullscreen renders in the browser's top layer, where only descendants of
  // that element are visible.
  function enterFullscreen() {
    stage.current?.requestFullscreen?.()
  }

  return (
    <div className="stage" ref={stage} data-stage={slug}>
      <AnnotationSurface id={`lesson-${slug}:fullscreen`}>
        <div className="stage-content">
          <p>
            This stage is its own surface. Annotations made here start empty and stay here,
            whether or not the stage is fullscreen.
          </p>
        </div>
      </AnnotationSurface>
      <button type="button" className="extra-button" onClick={enterFullscreen}>
        Go fullscreen
      </button>
    </div>
  )
}
