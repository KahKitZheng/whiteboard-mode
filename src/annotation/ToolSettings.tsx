import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import type { ReactNode } from 'react'
import { COLORS, TEXT_SIZES, WEIGHTS, type Style } from './style'
import { settingsFor } from './toolbar'
import { useWhiteboardMode } from './WhiteboardMode'

/** Largest dot the weight control draws, in px. */
const DOT = 18

/**
 * A named group of choices. Naming them is what lets the bar wrap: once the
 * groups sit on more than one row, an unlabelled run of three dots beside a
 * run of three letters is a puzzle rather than a control.
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
  const { color: showColor, weight: showWeight, textSize: showTextSize } = settingsFor(tool, selected)

  if (!showColor && !showWeight && !showTextSize) return null

  function apply(patch: Partial<Style>) {
    setStyle(patch)
    actions?.restyleSelected(patch)
  }

  const color = selected?.color ?? style.color
  const weight = selected?.weight ?? style.weight
  const textSize = selected?.textSize ?? style.textSize

  return (
    <>
      {showColor && (
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

      {showWeight && (
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

      {showTextSize && (
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
    </>
  )
}

function dotSize(index: number): number {
  return Math.round(DOT * (0.4 + index * 0.3))
}
