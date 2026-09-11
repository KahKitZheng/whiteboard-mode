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

/**
 * app-react's BOARDBOOK_ITEM_ICONS keys, resolved to what this repo can draw.
 * Digits, letters and punctuation are typeset rather than drawn — FontAwesome
 * ships them as glyphs, lucide does not, and a character in the marker's own
 * font is what a scanned textbook page uses anyway.
 */
const GLYPHS: Record<string, LucideIcon> = {
  plus: Plus,
  minus: Minus,
  check: Check,
  xmark: X,
  info: Info,
  play: Play,
  pause: Pause,
  'magnifying-glass': Search,
  'magnifying-glass-minus': ZoomOut,
  'magnifying-glass-plus': ZoomIn,
  book: Book,
  'book-open': BookOpen,
  paperclip: Paperclip,
  link: Link,
  'arrow-up-right-from-square': ExternalLink,
  calendar: Calendar,
  left: ArrowLeft,
  up: ArrowUp,
  down: ArrowDown,
  right: ArrowRight,
  image: Image,
  video: Video,
  file: File,
  volume: Volume2,
  // lucide dropped its brand icons; the nearest thing it still draws.
  youtube: Video,
}

const CHARACTERS: Record<string, string> = {
  exclamation: '!',
  question: '?',
}

export type ItemIcon = { glyph: LucideIcon } | { character: string }

/** An unknown key falls back to a plus, as the real viewer does. */
export function itemIcon(key: string): ItemIcon {
  if (key in GLYPHS) return { glyph: GLYPHS[key] }
  if (key in CHARACTERS) return { character: CHARACTERS[key] }
  if (/^[0-9a-e]$/.test(key)) return { character: key.toUpperCase() }
  return { glyph: Plus }
}
