import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import type { ReactNode } from 'react'
import {
  BORDERS,
  COLORS,
  FILLS,
  HEADS,
  PEN_MARKS,
  SHAPE_MODES,
  SNAP_MODES,
  TEXT_SIZES,
  TINT_OPACITY,
  WEIGHTS,
  type Style,
} from './style'
import { settingsFor } from './toolbar'
import { useWhiteboardMode } from './WhiteboardMode'

/** Largest dot the weight control draws, in px. */
const DOT = 18

/**
 * A named group of choices. Most of these controls show what they do — a
 * swatch is its colour, a dot is its thickness — but not all of them can: a
 * filled, tinted or empty square is only obviously *fill* once something says
 * so. So the names come back, small enough not to compete with the controls
 * they head.
 */
function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="setting" role="group" aria-label={label}>
      <span className="setting-label">{label}</span>
      {children}
    </div>
  )
}

/**
 * One set of controls rather than one per tool, because the settings mean the
 * same thing whichever tool is holding them.
 *
 * They show what the *selection* looks like when there is one, and what the
 * next shape will look like otherwise. Changing one does both: it restyles the
 * selected shape and becomes the new default, which is what stops a teacher
 * having to set the colour twice to keep drawing in it.
 */
export function ToolSettings() {
  const { tool, style, setStyle, actions } = useWhiteboardMode()
  const selected = actions?.selectedStyle ?? null
  const shown = settingsFor(tool, selected)

  if (!Object.values(shown).some(Boolean)) return null

  function apply(patch: Partial<Style>) {
    setStyle(patch)
    actions?.restyleSelected(patch)
  }

  const color = selected?.color ?? style.color
  const weight = selected?.weight ?? style.weight
  const textSize = selected?.textSize ?? style.textSize
  const border = selected?.border ?? style.border
  const fill = selected?.fill ?? style.fill
  const heads = selected?.heads ?? style.heads
  const snap = style.snap
  const penMark = style.penMark
  const tidy = style.tidy

  return (
    <>
      {shown.color && (
        <Setting label="Colour">
          <ToggleGroup
            value={[color]}
            onValueChange={([next]) => next && apply({ color: next })}
            className="choices swatches"
          >
            {COLORS.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="swatch"
                aria-label={name}
                title={name}
                style={{ '--swatch': value } as React.CSSProperties}
                render={<Toggle value={value} />}
              >
                <span className="swatch-dot" />
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.snap && (
        <Setting label="Words">
          <ToggleGroup
            value={[snap ? 'snap' : 'free']}
            onValueChange={([next]) => next && apply({ snap: next === 'snap' })}
            className="choices"
          >
            {SNAP_MODES.map(({ name, value }) => (
              <Toolbar.Button
                key={name}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value ? 'snap' : 'free'} />}
              >
                <WordsIcon color={color} mode={value ? 'highlight' : 'free'} />
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.penMark && (
        <Setting label="Words">
          <ToggleGroup
            value={[penMark]}
            onValueChange={([next]) => next && apply({ penMark: next as Style['penMark'] })}
            className="choices"
          >
            {PEN_MARKS.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value} />}
              >
                <WordsIcon color={color} mode={value === 'none' ? 'free' : value} />
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.tidy && (
        <Setting label="Shapes">
          <ToggleGroup
            value={[tidy ? 'tidy' : 'free']}
            onValueChange={([next]) => next && apply({ tidy: next === 'tidy' })}
            className="choices"
          >
            {SHAPE_MODES.map(({ name, value }) => (
              <Toolbar.Button
                key={name}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value ? 'tidy' : 'free'} />}
              >
                <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true">
                  {value ? (
                    <circle cx="10" cy="10" r="6.5" stroke={color} strokeWidth="1.8" fill="none" />
                  ) : (
                    <path
                      d="M4 11 c 1 -5 5 -7 8 -4 s 3 6 -1 8 s -7 -1 -6 -4 s 4 -3 5 -1"
                      stroke={color}
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.fill && (
        <Setting label="Fill">
          <ToggleGroup
            value={[fill]}
            onValueChange={([next]) => next && apply({ fill: next as Style['fill'] })}
            className="choices"
          >
            {FILLS.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value} />}
              >
                <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true">
                  <rect
                    x="3"
                    y="3"
                    width="14"
                    height="14"
                    rx="3"
                    stroke={color}
                    strokeWidth="2"
                    fill={value === 'none' ? 'none' : color}
                    fillOpacity={value === 'tinted' ? TINT_OPACITY : 1}
                  />
                </svg>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.heads && (
        <Setting label="Heads">
          <ToggleGroup
            value={[heads]}
            onValueChange={([next]) => next && apply({ heads: next as Style['heads'] })}
            className="choices"
          >
            {HEADS.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value} />}
              >
                <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="10" x2="17" y2="10" />
                  {value !== 'none' && <polyline points="13,6 17,10 13,14" />}
                  {value === 'both' && <polyline points="7,6 3,10 7,14" />}
                </svg>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.border && (
        <Setting label="Border">
          <ToggleGroup
            value={[border]}
            onValueChange={([next]) => next && apply({ border: next as Style['border'] })}
            className="choices"
          >
            {BORDERS.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={value} />}
              >
                <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true">
                  <line
                    x1="2"
                    y1="10"
                    x2="18"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={
                      value === 'dashed' ? '5 3.5' : value === 'dotted' ? '0 4.5' : undefined
                    }
                  />
                </svg>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.weight && (
        <Setting label="Weight">
          <ToggleGroup
            value={[String(weight)]}
            onValueChange={([next]) => next && apply({ weight: Number(next) })}
            className="choices"
          >
            {WEIGHTS.map(({ name, value }, index) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={`${name} weight`}
                title={`${name} weight`}
                render={<Toggle value={String(value)} />}
              >
                {/* The control shows the thickness rather than naming it. */}
                <span
                  className="weight-dot"
                  style={{ width: dotSize(index), height: dotSize(index) }}
                />
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

      {shown.textSize && (
        <Setting label="Size">
          <ToggleGroup
            value={[String(textSize)]}
            onValueChange={([next]) => next && apply({ textSize: Number(next) })}
            className="choices"
          >
            {TEXT_SIZES.map(({ name, value }, index) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={`${name} text`}
                title={`${name} text`}
                render={<Toggle value={String(value)} />}
              >
                <span className="size-letter" style={{ fontSize: 11 + index * 4 }}>
                  A
                </span>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}
    </>
  )
}

function dotSize(index: number): number {
  return Math.round(DOT * (0.35 + index * 0.22))
}

/** "Aa" with the mark the option makes on it — or a loose stroke for free ink. */
function WordsIcon({ color, mode }: { color: string; mode: 'free' | 'highlight' | 'underline' | 'strikethrough' }) {
  return (
    <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true">
      {mode === 'highlight' && <rect x="2" y="5" width="16" height="10" rx="2" fill={color} fillOpacity={0.35} />}
      <text x="10" y="14" textAnchor="middle" fontSize="11" fontFamily="var(--sans)" fill="currentColor">
        Aa
      </text>
      {mode === 'free' && <path d="M3 17 q 3 -3 6 0 t 6 0" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />}
      {mode === 'underline' && <line x1="3" y1="16.5" x2="17" y2="16.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />}
      {mode === 'strikethrough' && <line x1="3" y1="10.5" x2="17" y2="10.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}
