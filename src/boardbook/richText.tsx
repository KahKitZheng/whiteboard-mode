import { Fragment, type ReactNode } from 'react'

/**
 * TipTap's JSON document, as the assignment editor saves it. Only the nodes
 * and marks the boardbook editor's toolbar can produce are drawn; anything
 * else keeps its text and loses its box, so a document from a newer editor
 * still reads.
 */
export type RichTextNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

export type RichTextDocument = RichTextNode & { type: 'doc' }

export function RichText({ content }: { content: RichTextDocument }) {
  return <>{render(content, 'doc')}</>
}

function render(node: RichTextNode, key: string): ReactNode {
  const children = node.content?.map((child, index) => render(child, `${key}.${index}`))

  switch (node.type) {
    case 'doc':
      return <Fragment key={key}>{children}</Fragment>
    case 'paragraph':
      return <p key={key}>{children}</p>
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2))
      const Heading = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return <Heading key={key}>{children}</Heading>
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>
    case 'orderedList':
      return <ol key={key}>{children}</ol>
    case 'listItem':
      return <li key={key}>{children}</li>
    case 'hardBreak':
      return <br key={key} />
    case 'text':
      return (
        <Fragment key={key}>
          {/* First mark outermost, as TipTap's own serializer nests them. */}
          {(node.marks ?? []).reduceRight<ReactNode>(mark, node.text ?? '')}
        </Fragment>
      )
    default:
      return children ? <Fragment key={key}>{children}</Fragment> : null
  }
}

function mark(inner: ReactNode, mark: { type: string; attrs?: Record<string, unknown> }): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong>{inner}</strong>
    case 'italic':
      return <em>{inner}</em>
    case 'underline':
      return <u>{inner}</u>
    case 'strike':
      return <s>{inner}</s>
    case 'link':
      return (
        <a href={String(mark.attrs?.href ?? '')} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      )
    default:
      return inner
  }
}
