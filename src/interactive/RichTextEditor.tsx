import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Underline, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RichTextDocument } from '../boardbook/richText'

type Props = {
  content?: RichTextDocument
  onChange: (content: RichTextDocument) => void
}

/** The marks the viewer's renderer draws; a toggle each. */
const MARKS: { name: 'bold' | 'italic' | 'underline'; labelKey: string; Icon: LucideIcon }[] = [
  { name: 'bold', labelKey: 'interactive.bold', Icon: Bold },
  { name: 'italic', labelKey: 'interactive.italic', Icon: Italic },
  { name: 'underline', labelKey: 'interactive.underline', Icon: Underline },
]

/**
 * TipTap, as the assignment editor uses it, so what is typed here is the
 * document the viewer already renders — no HTML in between.
 */
export function RichTextEditor({ content, onChange }: Props) {
  const { t } = useTranslation()
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? '',
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDocument),
  })
  const active = useEditorState({
    editor,
    selector: ({ editor }) => Object.fromEntries(MARKS.map(({ name }) => [name, editor?.isActive(name) ?? false])),
  })

  return (
    <div className="rich-text">
      <div className="rich-text-toolbar" role="toolbar" aria-label={t('interactive.formatting')}>
        {MARKS.map(({ name, labelKey, Icon }) => (
          <button
            key={name}
            type="button"
            aria-label={t(labelKey)}
            title={t(labelKey)}
            aria-pressed={active?.[name] ?? false}
            // A press must not take the focus — and the selection — away from the text.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor?.chain().focus().toggleMark(name).run()}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} className="rich-text-body" />
    </div>
  )
}
