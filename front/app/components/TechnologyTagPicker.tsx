'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { DEFAULT_PROJECT_TAGS, PROJECT_TAG_OPTIONS_TABLE, uniqueTagNames } from '@/app/lib/projectTags'

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
}

export default function TechnologyTagPicker({ value, onChange }: Props) {
  const [technologyTags, setTechnologyTags] = useState(DEFAULT_PROJECT_TAGS)
  const [optionsReady, setOptionsReady] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTechnologyTags() {
      const { data, error } = await supabase
        .from(PROJECT_TAG_OPTIONS_TABLE)
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (cancelled) return
      if (error) {
        setOptionsReady(true)
        return
      }

      const configuredTags = uniqueTagNames((data ?? []).map((item) => item.name))
      if (configuredTags.length > 0) setTechnologyTags(configuredTags)
      setOptionsReady(true)
    }

    loadTechnologyTags()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!optionsReady) return
    const validTags = value.filter((tag) => technologyTags.includes(tag))
    if (validTags.length !== value.length) onChange(validTags)
  }, [onChange, optionsReady, technologyTags, value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addTag(tag: string) {
    if (value.includes(tag)) return
    onChange([...value, tag])
    setQuery('')
    setOpen(true)
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag))
  }

  const filteredTags = technologyTags
    .filter((tag) => !value.includes(tag))
    .filter((tag) => query.length === 0 || tag.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 transition focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#2F9E41]/10 border border-[#2F9E41]/25 px-2.5 py-0.5 text-xs font-medium text-[#2F9E41]">
            {tag}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removeTag(tag)}
              className="text-[#2F9E41]/60 transition hover:text-[#2F9E41]"
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !query && value.length > 0) removeTag(value[value.length - 1])
            if (e.key === 'Escape') {
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
          className="min-w-[140px] flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          placeholder={value.length === 0 ? 'Pesquisar tecnologia...' : ''}
          autoComplete="off"
        />
      </div>

      {open && filteredTags.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {filteredTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(tag)}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-zinc-50"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
