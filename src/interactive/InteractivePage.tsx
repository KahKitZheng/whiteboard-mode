import { Ban, Pen, Save } from 'lucide-react'
import { useState } from 'react'
import { AnnotationSurface } from '../annotation/AnnotationSurface'
import { useWhiteboardMode } from '../annotation/WhiteboardMode'
import type { AssignmentBoardBookEntity } from '../boardbook/types'
import type { InteractivePage as Page } from './fixtures'
import { InteractiveEditor } from './InteractiveEditor'
import { InteractiveImage } from './InteractiveImage'

/**
 * One slide that is read or edited. Read, it is a surface like any lesson;
 * edited, it is not — the pop-ups are dragged with the same pointer a pen
 * would draw with, and a shape over a draft would outlive it. Whiteboard
 * mode is switched off on the way in, so the bar does not show a tool in
 * hand that cannot draw here.
 */
export function InteractivePage({ page }: { page: Page }) {
  // In memory, for now: a reload is the fixture again.
  const [boardbook, setBoardbook] = useState(page.boardbook)
  // Non-null while editing. The page's cancel is dropping it.
  const [draft, setDraft] = useState<AssignmentBoardBookEntity | null>(null)
  const { setActive } = useWhiteboardMode()

  function edit() {
    setActive(false)
    setDraft(boardbook)
  }

  function save() {
    if (draft) setBoardbook(draft)
    setDraft(null)
  }

  const head = (
    <div className="interactive-head">
      <h1>{page.title}</h1>
      <div className="interactive-head-actions" role="group" aria-label="Pagina">
        {draft ? (
          <>
            <button type="button" className="interactive-outline" onClick={save}>
              <Save size={19} aria-hidden="true" />
              Opslaan
            </button>
            <button type="button" className="interactive-outline" onClick={() => setDraft(null)}>
              <Ban size={19} aria-hidden="true" />
              Annuleren
            </button>
          </>
        ) : (
          <button type="button" className="interactive-outline" onClick={edit}>
            <Pen size={19} aria-hidden="true" />
            Bewerken
          </button>
        )}
      </div>
    </div>
  )

  if (draft) {
    // Positioned, as a surface is: the animated background is fixed at
    // z-index 0, and an unpositioned slide paints under it.
    return (
      <div className="slide page-surface interactive-editing">
        <div className="slide-card interactive-page">
          {head}
          <InteractiveEditor value={draft} onChange={setDraft} />
        </div>
      </div>
    )
  }

  return (
    <AnnotationSurface id={`page-${page.slug}`} className="slide page-surface">
      <div className="slide-card interactive-page">
        {head}
        <InteractiveImage id={`interactive-${page.slug}`} boardbook={boardbook} />
      </div>
    </AnnotationSurface>
  )
}
