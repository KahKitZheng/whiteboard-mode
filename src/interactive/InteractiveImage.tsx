import { ChevronRight } from 'lucide-react'
import { Fragment, useState, type CSSProperties } from 'react'
import { ItemDialog, Marker } from '../boardbook/BoardBookItem'
import { markerStyle } from '../boardbook/marker'
import { plainText } from '../boardbook/plainText'
import type { AssignmentBoardBookEntity, BoardBookItemEntity } from '../boardbook/types'
import { useStage } from './useStage'
import './interactive.scss'

/** Past this far across, the card goes to the marker's left rather than off the edge. */
const CARD_FLIPS_AT = 62

type Props = {
  /** The page's surface id; item dialogs derive theirs from it. */
  id: string
  boardbook: AssignmentBoardBookEntity
}

/**
 * The image at the width it is given, markers over it, a card beside the
 * marker under the mouse, and the item's content in a dialog on press. No
 * zoom: a pop-up page is read at its size, where a scanned spread is not.
 */
export function InteractiveImage({ id, boardbook }: Props) {
  const { ref, onLoad, image, width } = useStage()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<BoardBookItemEntity | null>(null)

  function hover(item: BoardBookItemEntity, hovering: boolean) {
    setHoverId((current) => (hovering ? item.id : current === item.id ? null : current))
  }

  return (
    <div className="interactive-stage" ref={ref}>
      <img src={boardbook.images.background} alt="" draggable={false} onLoad={onLoad} />
      {image &&
        width > 0 &&
        boardbook.items.map((item) => (
          <Fragment key={item.id}>
            <Marker item={item} image={image} homeWidth={width} onOpen={() => setOpenItem(item)} onHover={(on) => hover(item, on)} />
            {hoverId === item.id && (
              <HoverCard
                item={item}
                style={markerStyle(item, image, width)}
                onHover={(on) => hover(item, on)}
                onOpen={() => setOpenItem(item)}
              />
            )}
          </Fragment>
        ))}
      <ItemDialog pageId={id} item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}

type CardProps = {
  item: BoardBookItemEntity
  /** The marker's own placement: the card hangs off its side. */
  style: CSSProperties
  onHover: (hovering: boolean) => void
  onOpen: () => void
}

function HoverCard({ item, style, onHover, onOpen }: CardProps) {
  const excerpt = item.text ? plainText(item.text).trim() : ''
  const centre = item.x + item.width / 2
  return (
    <div
      className="interactive-card"
      data-side={centre > CARD_FLIPS_AT ? 'left' : 'right'}
      // A text pill may be wider than its box; the card then sits a little close. Fine.
      style={{ left: style.left, top: style.top, '--marker-half': `${Number(style.width ?? style.minWidth) / 2}px` } as CSSProperties}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onOpen}
    >
      {item.img && <img src={item.img} alt="" />}
      <div className="interactive-card-text">
        <div className="interactive-card-title">{item.title || item.itemText}</div>
        {excerpt && <div className="interactive-card-excerpt">{excerpt}</div>}
      </div>
      <ChevronRight size={20} aria-hidden="true" />
    </div>
  )
}
