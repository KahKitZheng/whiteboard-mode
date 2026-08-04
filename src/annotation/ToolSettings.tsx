import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import type { ReactNode } from 'react'
import {
  BORDERS,
  COLORS,
  FILLS,
  OPACITIES,
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
 * A group of choices, told apart by a rule between them rather than a word
 * above them. In a column this narrow each name cost a line of its own, and
 * every control here already shows what it does — a swatch is its colour, a
 * dot is its thickness. The name stays on the group for anyone reading the
 * panel rather than looking at it.
 */
function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="setting" role="group" aria-label={label}>
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
  const opacity = selected?.opacity ?? style.opacity

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
                <span className="size-letter" style={{ fontSize: 12 + index * 5 }}>
                  A
                </span>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}
      {shown.opacity && (
        <Setting label="Opacity">
          <ToggleGroup
            value={[String(opacity)]}
            onValueChange={([next]) => next && apply({ opacity: Number(next) })}
            className="choices"
          >
            {OPACITIES.map(({ name, value }) => (
              <Toolbar.Button
                key={value}
                className="icon-button"
                aria-label={name}
                title={name}
                render={<Toggle value={String(value)} />}
              >
                <svg viewBox="0 0 20 20" className="setting-icon" aria-hidden="true">
                  <circle cx="10" cy="10" r="7" fill={color} opacity={value} />
                </svg>
              </Toolbar.Button>
            ))}
          </ToggleGroup>
        </Setting>
      )}

    </>
  )
}

function dotSize(index: number): number {
  return Math.round(DOT * (0.4 + index * 0.3))
}