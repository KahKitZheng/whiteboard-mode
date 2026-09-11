import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichText, type RichTextDocument, type RichTextNode } from './richText'

function doc(...content: RichTextNode[]): RichTextDocument {
  return { type: 'doc', content }
}

describe('RichText', () => {
  it('draws every block the editor can produce', () => {
    render(
      <RichText
        content={doc(
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Kop' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Alinea' }] },
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Punt' }] }] }],
          },
          {
            type: 'orderedList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stap' }] }] }],
          },
        )}
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Kop' })).toBeInTheDocument()
    expect(screen.getByText('Alinea').tagName).toBe('P')
    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Punt', 'Stap'])
  })

  it('draws every mark, nested in the order they were applied', () => {
    render(
      <RichText
        content={doc({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'alles',
              marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }, { type: 'strike' }],
            },
            {
              type: 'text',
              text: 'verder',
              marks: [{ type: 'link', attrs: { href: 'https://faqta.nl' } }],
            },
          ],
        })}
      />,
    )

    const word = screen.getByText('alles')
    expect(word.closest('strong > em > u > s')).toBe(word)

    const link = screen.getByRole('link', { name: 'verder' })
    expect(link).toHaveAttribute('href', 'https://faqta.nl')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('breaks a line where the editor did', () => {
    const { container } = render(
      <RichText
        content={doc({
          type: 'paragraph',
          content: [{ type: 'text', text: 'boven' }, { type: 'hardBreak' }, { type: 'text', text: 'onder' }],
        })}
      />,
    )

    expect(container.querySelector('p > br')).not.toBeNull()
  })

  it('keeps the text of a node it does not know, and drops its box', () => {
    render(
      <RichText
        content={doc({
          type: 'callout',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Let op' }] }],
        })}
      />,
    )

    expect(screen.getByText('Let op')).toBeInTheDocument()
    expect(document.querySelector('callout')).toBeNull()
  })

  it('clamps a heading level the browser does not have', () => {
    render(<RichText content={doc({ type: 'heading', attrs: { level: 9 }, content: [{ type: 'text', text: 'Diep' }] })} />)

    expect(screen.getByRole('heading', { level: 6 })).toHaveTextContent('Diep')
  })

  it('leaves an unknown mark as plain text', () => {
    render(
      <RichText
        content={doc({ type: 'paragraph', content: [{ type: 'text', text: 'gewoon', marks: [{ type: 'highlight' }] }] })}
      />,
    )

    expect(screen.getByText('gewoon').tagName).toBe('P')
  })
})
