import { Dialog } from '@base-ui-components/react/dialog'
import { ChevronRight } from 'lucide-react'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { AnnotationSurface } from '../annotation/AnnotationSurface'
import type { Size } from './coords'
import { itemIcon } from './icons'
import { markerKind, markerLabel, markerStyle } from './marker'
import { RichText } from './richText'
import type { BoardBookItemEntity } from './types'

/** What is drawn on the marker: a lucide glyph, a typeset character, or the label with a chevron. */
export function MarkerFace({ item }: { item: BoardBookItemEntity }) {
  const icon = itemIcon(item.itemIcon)
  if (markerKind(item) === 'text') {
    return (
      <>
        <span className="boardbook-marker-text">{item.itemText}</span>
        <ChevronRight size="1em" aria-hidden="true" />
      </>
    )
  }
  return 'glyph' in icon ? <icon.glyph size="1em" aria-hidden="true" /> : <span aria-hidden="true">{icon.character}</span>
}

type MarkerProps = {
  item: BoardBookItemEntity
  image: Size
  /** How wide the image is on screen at rest — what the authored size is relative to. */
  homeWidth: number
  onOpen: () => void
  /** For a hover card beside it; the marker itself has nothing to show. */
  onHover?: (hovering: boolean) => void
  /** An editor dragging it; a press on it is then the drag's start, not a tap. */
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  selected?: boolean
  /** Drawn on the marker after its face — an editor's resize handles. */
  children?: ReactNode
}

/**
 * The box scales with the zoom and the marker does not, so it keeps its screen
 * size — the real viewer gets the same result by counter-scaling every frame.
 */
export function Marker({ item, image, homeWidth, onOpen, onHover, onPointerDown, selected, children }: MarkerProps) {
  return (
    <button
      type="button"
      className="boardbook-marker"
      data-kind={markerKind(item)}
      data-theme={item.theme}
      data-selected={selected ? '' : undefined}
      style={markerStyle(item, image, homeWidth)}
      aria-label={markerLabel(item)}
      aria-pressed={selected}
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onMouseEnter={onHover && (() => onHover(true))}
      onMouseLeave={onHover && (() => onHover(false))}
    >
      <MarkerFace item={item} />
      {children}
    </button>
  )
}

type DialogProps = {
  /** The page's surface id; the dialog's own surface hangs off it per item. */
  pageId: string
  item: BoardBookItemEntity | null
  onClose: () => void
}

/**
 * The item's content in a dialog with its own surface, the same way the lesson
 * demo's diagram popup works and for the same reasons — see LessonExtras and
 * docs/adr/0004-annotatable-dialogs-are-not-modal.md.
 */
export function ItemDialog({ pageId, item, onClose }: DialogProps) {
  // Base UI runs the close as a transition and unmounts the portal when it
  // ends. Pulling the popup out of the tree the moment `item` goes null leaves
  // the backdrop waiting for an end that never comes, so the last item stays
  // rendered until Base UI is done with it.
  const last = useRef(item)
  if (item) last.current = item
  const shown = item ?? last.current

  return (
    <Dialog.Root
      open={item !== null}
      modal={false}
      onOpenChange={(next, details) => {
        const deliberate = details.reason === 'close-press' || details.reason === 'escape-key'
        if (!next && deliberate) onClose()
      }}
    >
      <Dialog.Portal>
        {shown && (
          <AnnotationSurface id={`${pageId}:item-${shown.id}`} className="popup-surface">
            {/* Inside the surface, so an armed tap on it is a tap on *it* — and dismisses. */}
            <Dialog.Backdrop className="dialog-backdrop" onClick={onClose} />
            <Dialog.Popup
              className="dialog-popup boardbook-popup"
              data-layout={shown.img ? 'two-column' : 'one-column'}
              aria-label={shown.title ?? shown.itemText ?? 'Item'}
            >
              {shown.img && <img className="boardbook-popup-image" src={shown.img} alt="" />}
              <div className="boardbook-popup-body">
                {shown.title && <Dialog.Title className="boardbook-popup-title">{shown.title}</Dialog.Title>}
                {shown.text && <RichText content={shown.text} />}
                {shown.url?.url && shown.url.text && (
                  <a className="boardbook-popup-link" href={shown.url.url} target="_blank" rel="noopener noreferrer">
                    {shown.url.text}
                  </a>
                )}
                {shown.audio && <audio controls src={shown.audio} className="boardbook-popup-audio" />}
                <Dialog.Close className="extra-button">Close</Dialog.Close>
              </div>
            </Dialog.Popup>
          </AnnotationSurface>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  )
}
