'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import UserAvatar from './UserAvatar'

type User = { id: string; name: string; avatar_url: string | null }

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeightClass?: string
}

export default function RichTextEditor({ value, onChange, placeholder, minHeightClass }: Props) {
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchUsers = useCallback(async (query: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .ilike('name', `%${query}%`)
      .limit(6)
    setSuggestions((data as User[]) ?? [])
    setSelectedIndex(0)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva aqui...' }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 40), from, '\n', '\0')
      const match = textBefore.match(/@([^\s@\n]*)$/)
      if (match) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchUsers(match[1]), 180)
      } else {
        setSuggestions([])
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${minHeightClass ?? 'min-h-64'} px-4 py-3`,
      },
      handleKeyDown(view, event) {
        if (!suggestionsRef.current?.length) return false
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => Math.min(i + 1, (suggestionsRef.current?.length ?? 1) - 1))
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => Math.max(i - 1, 0))
          return true
        }
        if (event.key === 'Escape') {
          setSuggestions([])
          return true
        }
        if (event.key === 'Enter' && !event.shiftKey) {
          const user = suggestionsRef.current?.[selectedIndexRef.current]
          if (user) { insertMentionRef.current?.(user); return true }
        }
        return false
      },
    },
  })

  const suggestionsRef = useRef(suggestions)
  suggestionsRef.current = suggestions
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  const insertMentionRef = useRef<((user: User) => void) | null>(null)
  insertMentionRef.current = (user: User) => {
    if (!editor) return
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 40), from, '\n', '\0')
    const match = textBefore.match(/@([^\s@\n]*)$/)
    if (!match) return
    const deleteFrom = from - match[0].length
    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: from })
      .insertContent(`@[${user.name}](${user.id})`)
      .run()
    setSuggestions([])
  }

  useEffect(() => {
    if (editor && value && editor.isEmpty) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

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

      <div className="relative">
        <EditorContent editor={editor} />
        {suggestions.length > 0 && (
          <div className="absolute z-50 left-4 bottom-full mb-1 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
            {suggestions.map((user, i) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMentionRef.current?.(user) }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${i === selectedIndex ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
              >
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                  {user.avatar_url
                    ? <Image src={user.avatar_url} alt={user.name} fill className="object-cover" />
                    : <UserAvatar name={user.name} className="h-7 w-7" sizes="28px" />
                  }
                </div>
                <span className="font-medium text-zinc-800 truncate">{user.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
