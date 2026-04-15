'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva aqui...' }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-64 px-4 py-3',
      },
    },
  })

  
  useEffect(() => {
    if (editor && value && editor.isEmpty) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) return null

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-sm transition ${
      active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
    }`

  return (
    <div className="rounded-lg border border-zinc-300 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200 transition overflow-hidden">
    
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Negrito">
          <b>B</b>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Itálico">
          <i>I</i>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Tachado">
          <s>S</s>
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} title="Título 1">
          H1
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Título 2">
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} title="Título 3">
          H3
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Lista">
          • Lista
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Lista numerada">
          1. Lista
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Citação">
          " "
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))} title="Bloco de código">
          {'</>'}
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Código inline">
          `code`
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Divisor">
          —
        </button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false) + ' disabled:opacity-30'} title="Desfazer">
          ↩
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false) + ' disabled:opacity-30'} title="Refazer">
          ↪
        </button>
      </div>

      
      <EditorContent editor={editor} />
    </div>
  )
}
