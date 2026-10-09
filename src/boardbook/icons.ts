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

/** One choice in the editor's picker: app-react's key, and the name a teacher sees. */
export type ItemIconChoice = { key: string; name: string; icon: ItemIcon }

/**
 * app-react's BOARDBOOK_ITEM_ICONS keys, resolved to what this repo can draw.
 * Digits, letters and punctuation are typeset rather than drawn — FontAwesome
 * ships them as glyphs, lucide does not, and a character in the marker's own
 * font is what a scanned textbook page uses anyway.
 */
const GLYPHS: [key: string, name: string, glyph: LucideIcon][] = [
  ['plus', 'Plus', Plus],
  ['minus', 'Min', Minus],
  ['check', 'Vinkje', Check],
  ['xmark', 'Kruis', X],
  ['info', 'Info', Info],
  ['play', 'Afspelen', Play],
  ['pause', 'Pauze', Pause],
  ['magnifying-glass', 'Zoeken', Search],
  ['magnifying-glass-minus', 'Uitzoomen', ZoomOut],
  ['magnifying-glass-plus', 'Inzoomen', ZoomIn],
  ['book', 'Boek', Book],
  ['book-open', 'Open boek', BookOpen],
  ['paperclip', 'Bijlage', Paperclip],
  ['link', 'Link', Link],
  ['arrow-up-right-from-square', 'Externe link', ExternalLink],
  ['calendar', 'Kalender', Calendar],
  ['left', 'Pijl links', ArrowLeft],
  ['up', 'Pijl omhoog', ArrowUp],
  ['down', 'Pijl omlaag', ArrowDown],
  ['right', 'Pijl rechts', ArrowRight],
  ['image', 'Afbeelding', Image],
  ['video', 'Video', Video],
  ['file', 'Bestand', File],
  ['volume', 'Geluid', Volume2],
  // lucide dropped its brand icons; the nearest thing it still draws.
  ['youtube', 'YouTube', Video],
]

const CHARACTERS: [key: string, name: string, character: string][] = [
  ['exclamation', 'Uitroepteken', '!'],
  ['question', 'Vraagteken', '?'],
]

/** Every key the picker offers, in the order it shows them: digits and letters first, as the CMS does. */
export const ITEM_ICONS: ItemIconChoice[] = [
  ...'0123456789abcde'.split('').map((key) => ({ key, name: key.toUpperCase(), icon: { character: key.toUpperCase() } })),
  ...GLYPHS.map(([key, name, glyph]) => ({ key, name, icon: { glyph } })),
  ...CHARACTERS.map(([key, name, character]) => ({ key, name, icon: { character } })),
]

const BY_KEY = new Map(ITEM_ICONS.map((choice) => [choice.key, choice.icon]))

/** An unknown key falls back to a plus, as the real viewer does. */
export function itemIcon(key: string): ItemIcon {
  return BY_KEY.get(key) ?? { glyph: Plus }
}
