import type { RichTextNode } from './richText'
/** The document's words, run together — for a one-line excerpt. */
export function plainText(node: RichTextNode): string {
  if (node.type === 'text') return node.text ?? ''
  const inner = (node.content ?? []).map(plainText).join('')
  return node.type === 'paragraph' || node.type === 'heading' ? `${inner} ` : inner
}
