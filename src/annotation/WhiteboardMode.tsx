import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_STYLE, type Style } from './style'

export type Tool =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'timer'
  | 'eraser'

/** What the toolbar can do to a surface. Published by the surface itself. */
export type SurfaceActions = {
  undo: () => void
  redo: () => void
  clear: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  /** What the selected shape looks like, so the toolbar can show its settings. */
  selectedStyle: Partial<Style> | null
  restyleSelected: (patch: Partial<Style>) => void
  removeSelected: () => void
  bringToFront: () => void
  sendToBack: () => void
}

/**
 * Whiteboard mode is app-wide, not per surface: turning it on arms every
 * mounted surface at once. Off leaves annotations visible but inert.
 *
 * Shapes stay in the surface that owns them. Only the handful of actions the
 * toolbar needs are published up here, keyed by surface, so a toolbar button
 * can act on whichever surface was touched last.
 */
type WhiteboardMode = {
  active: boolean
  setActive: (active: boolean) => void
  tool: Tool
  setTool: (tool: Tool) => void
  /** What the next shape will look like. */
  style: Style
  setStyle: (patch: Partial<Style>) => void
  /** The surface toolbar actions apply to — the last one touched. */
  current: string | null
  claim: (surfaceId: string) => void
  actions: SurfaceActions | null
  publish: (surfaceId: string, actions: SurfaceActions | null) => void
}

const WhiteboardModeContext = createContext<WhiteboardMode | null>(null)

export function WhiteboardModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [tool, setTool] = useState<Tool>('pen')
  const [style, setWholeStyle] = useState<Style>(DEFAULT_STYLE)
  const [current, setCurrent] = useState<string | null>(null)
  const [published, setPublished] = useState<Record<string, SurfaceActions>>({})

  const claim = useCallback((surfaceId: string) => setCurrent(surfaceId), [])

  const setStyle = useCallback(
    (patch: Partial<Style>) => setWholeStyle((current) => ({ ...current, ...patch })),
    [],
  )

  const publish = useCallback((surfaceId: string, actions: SurfaceActions | null) => {
    setPublished((all) => {
      if (!actions) {
        const { [surfaceId]: _gone, ...rest } = all
        return rest
      }
      return { ...all, [surfaceId]: actions }
    })
  }, [])

  const mode = useMemo(
    () => ({
      active,
      setActive,
      tool,
      setTool,
      style,
      setStyle,
      current,
      claim,
      actions: current ? (published[current] ?? null) : null,
      publish,
    }),
    [active, tool, style, setStyle, current, published, claim, publish],
  )

  return <WhiteboardModeContext.Provider value={mode}>{children}</WhiteboardModeContext.Provider>
}

// ponytail: the provider and its hook belong together; splitting them into two
// files to satisfy Fast Refresh costs more than the full reload it saves.
// oxlint-disable-next-line react/only-export-components
export function useWhiteboardMode(): WhiteboardMode {
  const mode = useContext(WhiteboardModeContext)
  if (!mode) throw new Error('useWhiteboardMode must be used inside a WhiteboardModeProvider')
  return mode
}
