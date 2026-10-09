import { GripVertical, Image, Plus } from 'lucide-react'
import { useRef, useState, type DragEvent, type PointerEvent } from 'react'
import type { Point } from '../annotation/coords'
import { Marker } from '../boardbook/BoardBookItem'
import type { AssignmentBoardBookEntity, BoardBookItemEntity } from '../boardbook/types'
import { centredBox, moveTo, resizeTo } from './place'
import { snapshot } from './popup'
import { PopupPanel } from './PopupPanel'
import { useStage } from './useStage'
import './interactive.scss'

/** A new pop-up's box on screen, before it is resized. */
const NEW_SIZE = 48

type Props = {
  value: AssignmentBoardBookEntity
  onChange: (next: AssignmentBoardBookEntity) => void
}

/**
 * The element as the lesson editor shows it: the image with its pop-ups
 * draggable over it on the left, the selected pop-up's fields on the right.
 * Controlled — the page around it holds the draft and decides when it is
 * saved; this only edits it. See docs/interactive-image-plan.md.
 */
export function InteractiveEditor({ value, onChange }: Props) {
  const { ref, onLoad, image, width, stage } = useStage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Each pop-up as last saved from its panel, for the panel's own cancel and
  // its save button's state. Keyed by id; the page's cancel throws it all away.
  const [saved, setSaved] = useState<Record<string, string>>({})
  // Reading through a ref, so a drag that started a render ago still patches the latest draft.
  const latest = useRef(value)
  latest.current = value

  const selected = value.items.find((item) => item.id === selectedId) ?? null

  function patchItem(id: string, patch: Partial<BoardBookItemEntity> | ((item: BoardBookItemEntity) => BoardBookItemEntity)) {
    const current = latest.current
    const next = { ...current, items: current.items.map((item) => (item.id === id ? (typeof patch === 'function' ? patch(item) : { ...item, ...patch }) : item)) }
    latest.current = next
    onChange(next)
  }

  function setBackground(file: File) {
    onChange({ ...value, images: { ...value.images, background: URL.createObjectURL(file) } })
  }

  function addPopup() {
    if (!stage) return
    const item: BoardBookItemEntity = { id: crypto.randomUUID(), ...centredBox(NEW_SIZE, stage), theme: 'dark', itemIcon: 'plus' }
    onChange({ ...value, items: [...value.items, item] })
    setSaved((all) => ({ ...all, [item.id]: snapshot(item) }))
    setSelectedId(item.id)
  }

  function removePopup(id: string) {
    onChange({ ...value, items: value.items.filter((item) => item.id !== id) })
    setSaved(({ [id]: _gone, ...rest }) => rest)
    setSelectedId(null)
  }

  /**
   * Follows the pointer until it lifts, with the stage's box read once at the
   * press — the image does not move under a drag. Captured, so leaving the
   * marker mid-drag does not lose it.
   */
  function drag(event: PointerEvent<HTMLElement>, id: string, place: (item: BoardBookItemEntity, pointer: Point) => BoardBookItemEntity) {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    function move(event: globalThis.PointerEvent) {
      patchItem(id, (item) => place(item, { x: event.clientX - box!.left, y: event.clientY - box!.top }))
    }
    function up() {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  function dropImage(event: DragEvent) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) setBackground(file)
  }

  const hasImage = value.images.background !== ''

  return (
    <div className="interactive-editor">
      <GripVertical className="interactive-editor-grip" size={20} aria-hidden="true" />
      <div className="interactive-editor-main">
        <div className="interactive-editor-head">
          <h2>Interactieve afbeelding</h2>
          <label className="interactive-tool" title={hasImage ? 'Afbeelding wijzigen' : 'Afbeelding uploaden'}>
            <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && setBackground(event.target.files[0])} />
            <Image size={16} aria-hidden="true" />
            <span className="visually-hidden">{hasImage ? 'Afbeelding wijzigen' : 'Afbeelding uploaden'}</span>
          </label>
        </div>

        <div className="interactive-editor-columns">
          <div className="interactive-editor-stage">
            {hasImage ? (
              <div className="interactive-stage" ref={ref} onPointerDown={() => setSelectedId(null)}>
                <img src={value.images.background} alt="" draggable={false} onLoad={onLoad} />
                {image &&
                  width > 0 &&
                  value.items.map((item) => (
                    <Marker
                      key={item.id}
                      item={item}
                      image={image}
                      homeWidth={width}
                      selected={item.id === selectedId}
                      onOpen={() => setSelectedId(item.id)}
                      // The press selects; the drag, if it becomes one, moves it.
                      onPointerDown={(event) => {
                        setSelectedId(item.id)
                        if (stage) drag(event, item.id, (current, pointer) => moveTo(current, pointer, stage))
                      }}
                    >
                      {item.id === selectedId && stage && <Handles onResize={(event) => drag(event, item.id, (current, pointer) => resizeTo(current, pointer, stage))} />}
                    </Marker>
                  ))}
              </div>
            ) : (
              <label className="interactive-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={dropImage}>
                <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && setBackground(event.target.files[0])} />
                <Plus size={40} aria-hidden="true" />
                <strong>Upload afbeelding</strong>
                <span>Sleep een afbeelding hierheen of klik om te kiezen</span>
              </label>
            )}
            <div className="interactive-editor-add">
              <button type="button" className="interactive-primary" disabled={!hasImage} onClick={addPopup}>
                Pop-up toevoegen
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <PopupPanel
            item={selected}
            number={selected ? value.items.indexOf(selected) + 1 : 0}
            hasImage={hasImage}
            savedAs={selected ? saved[selected.id] : undefined}
            onPatch={(patch) => selected && patchItem(selected.id, patch)}
            onRemove={() => selected && removePopup(selected.id)}
            onSave={() => selected && setSaved((all) => ({ ...all, [selected.id]: snapshot(selected) }))}
            onCancel={() => selected && saved[selected.id] && patchItem(selected.id, JSON.parse(saved[selected.id]))}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Four corner handles on the selected pop-up; the outline around it is the
 * marker's own, so both follow a text pill's real width. Not a surface
 * selection: those are shapes, this is host content.
 */
function Handles({ onResize }: { onResize: (event: PointerEvent<HTMLElement>) => void }) {
  return (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
    <span key={corner} className="interactive-handle" data-corner={corner} aria-hidden="true" onPointerDown={onResize} />
  ))
}
