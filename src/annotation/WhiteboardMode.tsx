import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Whiteboard mode is app-wide, not per surface: turning it on arms every
 * mounted surface at once. Off leaves annotations visible but inert.
 */
type WhiteboardMode = {
  active: boolean
  setActive: (active: boolean) => void
}

const WhiteboardModeContext = createContext<WhiteboardMode | null>(null)

export function WhiteboardModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const mode = useMemo(() => ({ active, setActive }), [active])

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
