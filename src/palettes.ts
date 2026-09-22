/**
 * A channel's colours, as app-react sets them on `:root` from the course's
 * theme. The animated background uses `secondary` and `tertiary`; the rest
 * are here because they arrive together and a lesson may want them.
 */
export type Palette = {
  primary: string
  secondary: string
  tertiary: string
  primText: string
  secTerText: string
}

export const PALETTES: Palette[] = [
  { primary: '#ffbc00', secondary: '#ffd550', tertiary: '#fefae0', primText: '#333e48', secTerText: '#333e48' },
  { primary: '#f4344a', secondary: '#ff8aa3', tertiary: '#f9c5cd', primText: '#fff', secTerText: '#7a1906' },
  { primary: '#0ba248', secondary: '#80e8aa', tertiary: '#c3edd6', primText: '#fff', secTerText: '#0a8039' },
  { primary: '#159cc1', secondary: '#6edbed', tertiary: '#bdf1ff', primText: '#fff', secTerText: '#107793' },
  { primary: '#01a285', secondary: '#9ce5de', tertiary: '#d8f3ef', primText: '#fff', secTerText: '#017e67' },
  { primary: '#f6558b', secondary: '#fc9fc5', tertiary: '#f9d2e1', primText: '#fff', secTerText: '#862344' },
  { primary: '#288a7f', secondary: '#5fc1b0', tertiary: '#b3e2da', primText: '#fff', secTerText: '#1d6359' },
  { primary: '#3e45bb', secondary: '#7d87e3', tertiary: '#a0afef', primText: '#fff', secTerText: '#fff' },
  { primary: '#ff4115', secondary: '#ff6d55', tertiary: '#ffb89f', primText: '#fff', secTerText: '#000' },
  { primary: '#005bad', secondary: '#66a4ff', tertiary: '#99c0ff', primText: '#fff', secTerText: '#052b4d' },
  { primary: '#e66700', secondary: '#ff9f57', tertiary: '#ffd3b3', primText: '#fff', secTerText: '#333e48' },
  { primary: '#82c60c', secondary: '#b4dd6d', tertiary: '#d9eeb6', primText: '#333e48', secTerText: '#333e48' },
  { primary: '#1282de', secondary: '#6cb1ea', tertiary: '#b7d9f5', primText: '#fff', secTerText: '#075489' },
  { primary: '#3a11aa', secondary: '#8970cc', tertiary: '#c4b7e5', primText: '#fff', secTerText: '#fff' },
  { primary: '#e53700', secondary: '#ff8b67', tertiary: '#ffab80', primText: '#fff', secTerText: '#4e1300' },
  { primary: '#ee7260', secondary: '#f9b7ad', tertiary: '#ffe1dd', primText: '#500e05', secTerText: '#500e05' },
  { primary: '#7890c4', secondary: '#d6dce3', tertiary: '#edf0f3', primText: '#ffffff', secTerText: '#343e31' },
  { primary: '#a0232a', secondary: '#db8b93', tertiary: '#f5c4c4', primText: '#ffffff', secTerText: '#3b1318' },
]

/**
 * The channel the deck opens on. One for the whole deck on purpose: the
 * background's two colours trade places from slide to slide, and that only
 * reads as one background while the pair stays the same.
 */
export const DEFAULT_PALETTE = PALETTES[3]
