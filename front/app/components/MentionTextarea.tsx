'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import UserAvatar from './UserAvatar'

type User = { id: string; name: string; avatar_url: string | null }

export type MentionHandle = { focus: () => void }

type Props = {
  value: string
  onChange: (stored: string) => void
  rows?: number
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

function storedToHtml(stored: string): string {
  if (!stored) return ''
  const escaped = stored
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      (_, name, userId) =>
        `<span class="text-blue-500 font-semibold" contenteditable="false" data-uid="${userId}" data-name="${name}">@${name}</span>`
    )
    .replace(/\n/g, '<br>')
}

function domToStored(el: HTMLElement): string {
  let out = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
    } else if (node instanceof HTMLElement) {
      if (node.dataset.uid) {
        out += `@[${node.dataset.name}](${node.dataset.uid})`
      } else if (node.tagName === 'BR') {
        out += '\n'
      } else {
        out += domToStored(node)
      }
    }
  }
  return out
}

function getQueryAtCursor(container: HTMLElement): { query: string; atOffset: number; textNode: Text } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!range.collapsed) return null
  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE || !container.contains(node)) return null
  const before = (node.textContent ?? '').slice(0, range.startOffset)
  const match = before.match(/@([^\n@]*)$/)
  if (!match) return null
  return { query: match[1], atOffset: before.lastIndexOf('@'), textNode: node as Text }
}

const MentionTextarea = forwardRef<MentionHandle, Props>(function MentionTextarea(
  { value, onChange, rows = 3, placeholder, className, onKeyDown },
  ref
) {
  const divRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => divRef.current?.focus() }))

  const prevValueRef = useRef(value)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (divRef.current) divRef.current.innerHTML = storedToHtml(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      if (!value && divRef.current) divRef.current.innerHTML = ''
    }
  })

  const search = useCallback(async (query: string) => {
    const { data } = await supabase.from('users').select('id, name, avatar_url').ilike('name', `%${query}%`).limit(6)
    setSuggestions((data as User[]) ?? [])
    setSelectedIndex(0)
  }, [])

  function handleInput() {
    if (!divRef.current) return
    const stored = domToStored(divRef.current)
    prevValueRef.current = stored
    onChange(stored)
    const q = getQueryAtCursor(divRef.current)
    if (q) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(q.query), 180)
    } else {
      setSuggestions([])
    }
  }

  function insertMention(user: User) {
    if (!divRef.current) return
    const q = getQueryAtCursor(divRef.current)
    if (!q) return
    const sel = window.getSelection()!
    const range = sel.getRangeAt(0)

    // delete @query
    const del = document.createRange()
    del.setStart(q.textNode, q.atOffset)
    del.setEnd(q.textNode, range.startOffset)
    del.deleteContents()

    // insert mention span
    const span = document.createElement('span')
    span.className = 'text-blue-500 font-semibold'
    span.contentEditable = 'false'
    span.dataset.uid = user.id
    span.dataset.name = user.name
    span.textContent = `@${user.name}`
    const ins = document.createRange()
    ins.setStart(q.textNode, q.atOffset)
    ins.collapse(true)
    ins.insertNode(span)

    const space = document.createTextNode(' ')
    span.after(space)
    const cur = document.createRange()
    cur.setStartAfter(space)
    cur.collapse(true)
    sel.removeAllRanges()
    sel.addRange(cur)

    setSuggestions([])
    const stored = domToStored(divRef.current)
    prevValueRef.current = stored
    onChange(stored)
    divRef.current.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); insertMention(suggestions[selectedIndex]); return }
      if (e.key === 'Escape') { setSuggestions([]); return }
    }
    onKeyDown?.(e)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const minH = `${rows * 1.6}rem`

  return (
    <div className="relative">
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={`${className} empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none`}
        style={{ minHeight: minH, whiteSpace: 'pre-wrap', wordBreak: 'break-word', outline: 'none' }}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user) }}
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
  )
})

export default MentionTextarea
