import { ChevronLeft, ChevronRight, Eye, EyeOff, Map, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardBookFocusAreaEntity } from './types'
import { areaLabel } from './walkthrough'

type AreaProps = {
  area: BoardBookFocusAreaEntity
  current: boolean
  onToggle: () => void
}

/**
 * The authored rectangle, by percentage of the image's box. A press frames it;
 * once framed, the area fills the view, so the next press anywhere zooms back
 * out.
 */
export function FocusArea({ area, current, onToggle }: AreaProps) {
  return (
    <button
      type="button"
      className="boardbook-area"
      data-current={current ? '' : undefined}
      style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }}
      aria-label={areaLabel(area)}
      title={areaLabel(area)}
      onClick={onToggle}
    >
      {/* Its place in the walkthrough — the number the CMS gave it. */}
      <span className="boardbook-area-number" aria-hidden="true">
        {area.order}
      </span>
    </button>
  )
}

type WalkthroughProps = {
  ordered: BoardBookFocusAreaEntity[]
  current: BoardBookFocusAreaEntity | null
  canStep: { previous: boolean; next: boolean }
  fullscreen: boolean
  onStep: (direction: 'previous' | 'next') => void
  onOverview: () => void
  onZoom: (direction: 'in' | 'out') => void
  onFullscreen: () => void
  /** Whether the areas are drawn on the image, to be pressed. Off, the walkthrough still frames them. */
  areasShown: boolean
  onToggleAreas: () => void
  /** The navigator minimap in the viewer's corner. */
  minimapShown: boolean
  onToggleMinimap: () => void
}

/**
 * The chrome navigation goes through while whiteboard mode is armed and the
 * image itself takes every press: step through the focus areas in order, zoom,
 * and fill the screen.
 */
export function Walkthrough({
  ordered,
  current,
  canStep,
  fullscreen,
  onStep,
  onOverview,
  onZoom,
  onFullscreen,
  areasShown,
  onToggleAreas,
  minimapShown,
  onToggleMinimap,
}: WalkthroughProps) {
  const { t } = useTranslation()
  return (
    <div className="boardbook-bar">
      <div className="boardbook-bar-group" role="group" aria-label={t('boardbook.focusAreas')}>
        {current ? (
          <>
            <button type="button" onClick={() => onStep('previous')} disabled={!canStep.previous} aria-label={t('boardbook.previousArea')}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span className="boardbook-bar-name" title={areaLabel(current)}>
              {ordered.indexOf(current) + 1}/{ordered.length} · {areaLabel(current)}
            </span>
            <button type="button" onClick={() => onStep('next')} disabled={!canStep.next} aria-label={t('boardbook.nextArea')}>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => onStep('next')} disabled={!canStep.next}>
            {t('common.start')}
          </button>
        )}
      </div>
      <div className="boardbook-bar-group" role="group" aria-label={t('boardbook.view')}>
        <button type="button" onClick={onOverview} disabled={current === null}>
          {t('boardbook.overview')}
        </button>
        <button type="button" onClick={onToggleAreas} aria-pressed={areasShown} aria-label={t('boardbook.showAreas')} title={t('boardbook.showAreas')}>
          {areasShown ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
        </button>
        <button type="button" onClick={onToggleMinimap} aria-pressed={minimapShown} aria-label={t('boardbook.showMinimap')} title={t('boardbook.showMinimap')}>
          <Map size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onZoom('out')} aria-label={t('boardbook.zoomOut')}>
          <ZoomOut size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onZoom('in')} aria-label={t('boardbook.zoomIn')}>
          <ZoomIn size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={onFullscreen} aria-label={fullscreen ? t('boardbook.exitFullscreen') : t('boardbook.fullscreen')}>
          {fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
