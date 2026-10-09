import { Check, ChevronDown, ChevronUp, Image, MessageSquareText, Plus, Trash2, Volume2, X } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { MarkerFace } from '../boardbook/BoardBookItem'
import { ITEM_ICONS, itemIcon } from '../boardbook/icons'
import type { BoardBookItemEntity } from '../boardbook/types'
import { snapshot } from './popup'
import { RichTextEditor } from './RichTextEditor'

type Props = {
  item: BoardBookItemEntity | null
  /** Its place in the list, for the heading. */
  number: number
  hasImage: boolean
  /** The item as last saved, from `snapshot`; nothing yet for one just added. */
  savedAs?: string
  onPatch: (patch: Partial<BoardBookItemEntity>) => void
  onRemove: () => void
  onSave: () => void
  onCancel: () => void
}

/**
 * The selected pop-up's fields. Its own save and cancel, apart from the
 * page's: a teacher tries a wording and backs out of it without losing the
 * other pop-ups' edits.
 */
export function PopupPanel({ item, number, hasImage, savedAs, onPatch, onRemove, onSave, onCancel }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // The text editor is remounted to take a cancel: TipTap holds its own document.
  const [reverts, setReverts] = useState(0)
  const [audioName, setAudioName] = useState<Record<string, string>>({})

  if (!item) {
    return (
      <div className="interactive-panel" data-empty="">
        <MessageSquareText size={28} aria-hidden="true" />
        <p>{hasImage ? 'Klik op een pop-up om hem te bewerken, of voeg er een toe met de knop Pop-up.' : 'Upload eerst een afbeelding. Daarna kun je er pop-ups op plaatsen.'}</p>
      </div>
    )
  }

  const dirty = snapshot(item) !== savedAs
  const hasLabel = Boolean(item.itemText?.trim())
  const choice = ITEM_ICONS.find((candidate) => candidate.key === item.itemIcon)

  function dropImage(event: DragEvent) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) onPatch({ img: URL.createObjectURL(file) })
  }

  function setAudio(file: File) {
    setAudioName((names) => ({ ...names, [item!.id]: file.name }))
    onPatch({ audio: URL.createObjectURL(file) })
  }

  function cancel() {
    onCancel()
    setReverts((count) => count + 1)
  }

  return (
    <div className="interactive-panel">
      <div className="interactive-panel-head">
        <h3>Pop-up {number}</h3>
        <button type="button" className="interactive-tool" data-danger="" aria-label="Verwijder pop-up" title="Verwijder pop-up" onClick={onRemove}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="interactive-panel-body">
        {item.img ? (
          <div className="interactive-panel-image">
            <img src={item.img} alt="" />
            <div className="interactive-panel-image-tools">
              <label className="interactive-tool" title="Afbeelding wijzigen">
                <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && onPatch({ img: URL.createObjectURL(event.target.files[0]) })} />
                <Image size={14} aria-hidden="true" />
                <span className="visually-hidden">Afbeelding wijzigen</span>
              </label>
              <button type="button" className="interactive-tool" data-danger="" aria-label="Afbeelding verwijderen" title="Afbeelding verwijderen" onClick={() => onPatch({ img: undefined })}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <label className="interactive-dropzone" data-small="" onDragOver={(event) => event.preventDefault()} onDrop={dropImage}>
            <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && onPatch({ img: URL.createObjectURL(event.target.files[0]) })} />
            <Plus size={26} aria-hidden="true" />
            <strong>Upload afbeelding</strong>
          </label>
        )}

        <div className="interactive-field">
          <span className="interactive-field-label">Pop-up knop</span>
          <button type="button" className="interactive-picker-button" aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
            <span className="boardbook-marker interactive-picker-preview" data-kind={hasLabel ? 'text' : 'icon'} data-theme={item.theme}>
              <MarkerFace item={item} />
            </span>
            <span>{hasLabel ? 'Tekst knop' : (choice?.name ?? 'Plus')}</span>
            {pickerOpen ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          </button>
          {pickerOpen && (
            <div className="interactive-picker">
              <div className="interactive-tabs" role="group" aria-label="Kleur">
                <button type="button" aria-pressed={item.theme === 'light'} onClick={() => onPatch({ theme: 'light' })}>
                  Licht
                </button>
                <button type="button" aria-pressed={item.theme !== 'light'} onClick={() => onPatch({ theme: 'dark' })}>
                  Dark
                </button>
              </div>
              <div className="interactive-glyphs" role="group" aria-label="Icoon">
                {ITEM_ICONS.map((candidate) => {
                  const icon = itemIcon(candidate.key)
                  return (
                    <button
                      key={candidate.key}
                      type="button"
                      aria-label={candidate.name}
                      title={candidate.name}
                      aria-pressed={!hasLabel && candidate.key === item.itemIcon}
                      onClick={() => onPatch({ itemIcon: candidate.key, itemText: undefined })}
                    >
                      {'glyph' in icon ? <icon.glyph size={16} aria-hidden="true" /> : <span>{icon.character}</span>}
                    </button>
                  )
                })}
              </div>
              <input
                className="interactive-input"
                value={item.itemText ?? ''}
                placeholder="Tekst knop"
                aria-label="Tekst knop"
                onChange={(event) => onPatch({ itemText: event.target.value || undefined })}
              />
            </div>
          )}
        </div>

        <label className="interactive-field">
          <span className="interactive-field-label">Titel</span>
          <input
            className="interactive-input"
            data-size="title"
            value={item.title ?? ''}
            placeholder="De titel van je pop-up"
            onChange={(event) => onPatch({ title: event.target.value || undefined })}
          />
        </label>

        <div className="interactive-field">
          <span className="interactive-field-label">Paragraaf</span>
          <RichTextEditor key={`${item.id}:${reverts}`} content={item.text} onChange={(text) => onPatch({ text })} />
        </div>

        <div className="interactive-field">
          <span className="interactive-field-label">Audio</span>
          <div className="interactive-audio">
            <label className="interactive-tool" data-grey="" title={item.audio ? 'Audiobestand wijzigen' : 'Audio toevoegen'}>
              <input type="file" accept="audio/*" hidden onChange={(event) => event.target.files?.[0] && setAudio(event.target.files[0])} />
              <Volume2 size={16} aria-hidden="true" />
              {item.audio ? <Check size={10} aria-hidden="true" /> : <Plus size={10} aria-hidden="true" />}
              <span className="visually-hidden">{item.audio ? 'Audiobestand wijzigen' : 'Audio toevoegen'}</span>
            </label>
            {item.audio && (
              <>
                <span className="interactive-audio-name">{audioName[item.id] ?? item.audio.split('/').pop()}</span>
                <button type="button" className="interactive-tool" data-plain="" aria-label="Audio verwijderen" title="Audio verwijderen" onClick={() => onPatch({ audio: undefined })}>
                  <X size={14} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="interactive-panel-foot" role="group" aria-label="Pop-up">
        <button type="button" className="interactive-secondary" onClick={cancel}>
          Annuleren
        </button>
        <button type="button" className="interactive-primary" data-tone="dark" disabled={!dirty} onClick={onSave}>
          Opslaan
        </button>
      </div>
    </div>
  )
}
