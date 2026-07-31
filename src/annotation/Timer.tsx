import { useEffect, useState } from 'react'
import './widget.scss'

// ponytail: the duration lives in component state, not on the shape. Persisting
// a running clock means storing a wall-clock deadline and reconciling it on
// load — worth doing when someone asks for a timer to survive a reload.
const DEFAULT_SECONDS = 300
const STEP = 60

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * A widget: a shape whose rendering happens to be interactive React. Nothing
 * outside this component knows it is one.
 */
export function Timer({ fontSize }: { fontSize: number }) {
  const [total, setTotal] = useState(DEFAULT_SECONDS)
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return

    const tick = setInterval(() => {
      setRemaining((left) => {
        if (left <= 1) setRunning(false)
        return Math.max(0, left - 1)
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [running])

  function adjust(by: number) {
    const next = Math.max(STEP, total + by)
    setTotal(next)
    setRemaining(next)
    setRunning(false)
  }

  return (
    <div className="widget timer" style={{ fontSize }}>
      <output className="timer-face" data-done={remaining === 0 ? '' : undefined}>
        {clock(remaining)}
      </output>
      <div className="timer-controls">
        <button type="button" onClick={() => adjust(-STEP)} aria-label="Less time">
          −
        </button>
        <button type="button" onClick={() => setRunning((on) => !on)}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={() => adjust(STEP)} aria-label="More time">
          +
        </button>
      </div>
    </div>
  )
}
