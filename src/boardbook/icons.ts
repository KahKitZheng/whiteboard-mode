import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Book,
  BookOpen,
  Calendar,
  Check,
  ExternalLink,
  File,
  Image,
  Info,
  Link,
  Minus,
  Paperclip,
  Pause,
  Play,
  Plus,
  Search,
  Video,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react'

export type ItemIcon = { glyph: LucideIcon } | { character: string }

/**
 * One choice in the editor's picker: app-react's key, and the name a teacher
 * sees — a locale key for a glyph, the character itself for a digit or letter.
 */
export type ItemIconChoice = { key: string; name: { labelKey: string } | { text: string }; icon: ItemIcon }

/**
 * app-react's BOARDBOOK_ITEM_ICONS keys, resolved to what this repo can draw.
 * Digits, letters and punctuation are typeset rather than drawn — FontAwesome
 * ships them as glyphs, lucide does not, and a character in the marker's own
 * font is what a scanned textbook page uses anyway.
 */
const GLYPHS: [key: string, labelKey: string, glyph: LucideIcon][] = [
  ['plus', 'icons.plus', Plus],
  ['minus', 'icons.minus', Minus],
  ['check', 'icons.check', Check],
  ['xmark', 'icons.cross', X],
  ['info', 'icons.info', Info],
  ['play', 'icons.play', Play],
  ['pause', 'icons.pause', Pause],
  ['magnifying-glass', 'icons.search', Search],
  ['magnifying-glass-minus', 'icons.zoomOut', ZoomOut],
  ['magnifying-glass-plus', 'icons.zoomIn', ZoomIn],
  ['book', 'icons.book', Book],
  ['book-open', 'icons.openBook', BookOpen],
  ['paperclip', 'icons.attachment', Paperclip],
  ['link', 'icons.link', Link],
  ['arrow-up-right-from-square', 'icons.externalLink', ExternalLink],
  ['calendar', 'icons.calendar', Calendar],
  ['left', 'icons.arrowLeft', ArrowLeft],
  ['up', 'icons.arrowUp', ArrowUp],
  ['down', 'icons.arrowDown', ArrowDown],
  ['right', 'icons.arrowRight', ArrowRight],
  ['image', 'icons.image', Image],
  ['video', 'icons.video', Video],
  ['file', 'icons.file', File],
  ['volume', 'icons.sound', Volume2],
  // lucide dropped its brand icons; the nearest thing it still draws.
  ['youtube', 'icons.youtube', Video],
]

const CHARACTERS: [key: string, labelKey: string, character: string][] = [
  ['exclamation', 'icons.exclamation', '!'],
  ['question', 'icons.question', '?'],
]

/** Every key the picker offers, in the order it shows them: digits and letters first, as the CMS does. */
export const ITEM_ICONS: ItemIconChoice[] = [
  ...'0123456789abcde'.split('').map((key) => ({ key, name: { text: key.toUpperCase() }, icon: { character: key.toUpperCase() } })),
  ...GLYPHS.map(([key, labelKey, glyph]) => ({ key, name: { labelKey }, icon: { glyph } })),
  ...CHARACTERS.map(([key, labelKey, character]) => ({ key, name: { labelKey }, icon: { character } })),
]

const BY_KEY = new Map(ITEM_ICONS.map((choice) => [choice.key, choice.icon]))

/** An unknown key falls back to a plus, as the real viewer does. */
export function itemIcon(key: string): ItemIcon {
  return BY_KEY.get(key) ?? { glyph: Plus }
}
