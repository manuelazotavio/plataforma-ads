'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  DEFAULT_PROJECT_TAGS,
  PROJECT_TAG_OPTIONS_TABLE,
  ProjectTagOption,
  normalizeTagName,
  uniqueTagNames,
} from '@/app/lib/projectTags'

const tableSql = `create table if not exists public.project_tag_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.project_tag_options enable row level security;

create policy "Anyone can read project tag options"
on public.project_tag_options for select
using (true);

create policy "Admins can manage project tag options"
on public.project_tag_options for all
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);`

export default function AdminTecnologiasPage() {
  const [tags, setTags] = useState<ProjectTagOption[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const activeCount = useMemo(() => tags.filter((tag) => tag.is_active).length, [tags])

  async function loadTags() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .select('id, name, display_order, is_active')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      setTags([])
    } else {
      setTags((data as ProjectTagOption[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .select('id, name, display_order, is_active')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return

        if (error) {
          setError(error.message)
          setTags([])
        } else {
          setTags((data as ProjectTagOption[]) ?? [])
        }

        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function addTag(e: React.FormEvent) {
    e.preventDefault()
    const normalizedName = normalizeTagName(name)
    if (!normalizedName) return

    const exists = tags.some((tag) => tag.name.toLowerCase() === normalizedName.toLowerCase())
    if (exists) {
      setError('Essa tecnologia já existe na lista.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    const nextOrder = tags.reduce((max, tag) => Math.max(max, tag.display_order ?? 0), 0) + 1
    const { error } = await supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .insert({ name: normalizedName, display_order: nextOrder, is_active: true })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setNotice('Tecnologia adicionada.')
      await loadTags()
    }

    setSaving(false)
  }

  async function seedDefaultTags() {
    setSaving(true)
    setError(null)
    setNotice(null)

    const currentNames = new Set(tags.map((tag) => tag.name.toLowerCase()))
    const missingTags = uniqueTagNames(DEFAULT_PROJECT_TAGS).filter((tag) => !currentNames.has(tag.toLowerCase()))
    const baseOrder = tags.reduce((max, tag) => Math.max(max, tag.display_order ?? 0), 0)

    const { error } = await supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .insert(missingTags.map((tag, index) => ({
        name: tag,
        display_order: baseOrder + index + 1,
        is_active: true,
      })))

    if (error) {
      setError(error.message)
    } else {
      setNotice('Lista padrão adicionada.')
      await loadTags()
    }

    setSaving(false)
  }

  async function toggleTag(tag: ProjectTagOption) {
    setSaving(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .update({ is_active: !tag.is_active })
      .eq('id', tag.id)

    if (error) {
      setError(error.message)
    } else {
      setTags((prev) => prev.map((item) => (
        item.id === tag.id ? { ...item, is_active: !item.is_active } : item
      )))
    }

    setSaving(false)
  }

  async function removeTag(tag: ProjectTagOption) {
    const confirmed = window.confirm(`Remover "${tag.name}" da lista de tecnologias?`)
    if (!confirmed) return

    setSaving(true)
    setError(null)
    setNotice(null)

    const { error } = await supabase
      .from(PROJECT_TAG_OPTIONS_TABLE)
      .delete()
      .eq('id', tag.id)

    if (error) {
      setError(error.message)
    } else {
      setTags((prev) => prev.filter((item) => item.id !== tag.id))
    }

    setSaving(false)
  }

  async function moveTag(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= tags.length) return

    const current = tags[index]
    const target = tags[targetIndex]
    const currentOrder = current.display_order ?? index
    const targetOrder = target.display_order ?? targetIndex

    setSaving(true)
    setError(null)
    setNotice(null)

    const updates = await Promise.all([
      supabase.from(PROJECT_TAG_OPTIONS_TABLE).update({ display_order: targetOrder }).eq('id', current.id),
      supabase.from(PROJECT_TAG_OPTIONS_TABLE).update({ display_order: currentOrder }).eq('id', target.id),
    ])

    const updateError = updates.find((result) => result.error)?.error
    if (updateError) {
      setError(updateError.message)
    } else {
      await loadTags()
    }

    setSaving(false)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Tecnologias</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure as tags que aparecem nos projetos. {activeCount} ativa{activeCount !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={seedDefaultTags}
          disabled={saving || loading}
          className="w-full cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
        >
          Usar lista padrão
        </button>
      </div>

      <form onSubmit={addTag} className="mb-5 flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          placeholder="Ex: Angular, DevOps, UX/UI..."
        />
        <button
          type="submit"
          disabled={saving || !normalizeTagName(name)}
          className="cursor-pointer rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {notice && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Não foi possível carregar ou salvar as tecnologias.</p>
          <p className="mt-1 text-red-600">{error}</p>
          <p className="mt-4 text-red-600">
            Se a tabela ainda não existir no Supabase, execute este SQL uma vez:
          </p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700">
            {tableSql}
          </pre>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : tags.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-zinc-900">Nenhuma tecnologia configurada.</p>
          <p className="mt-1 text-sm text-zinc-500">Adicione manualmente ou use a lista padrão.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {tags.map((tag, index) => (
            <div
              key={tag.id}
              className="grid gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${tag.is_active ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {tag.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {tag.is_active ? 'Aparece no formulário de projetos' : 'Oculta para novos projetos'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                <button
                  type="button"
                  onClick={() => moveTag(index, -1)}
                  disabled={saving || index === 0}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveTag(index, 1)}
                  disabled={saving || index === tags.length - 1}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 disabled:cursor-default disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={saving}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
                    tag.is_active
                      ? 'border-green-200 text-green-700 hover:bg-green-50'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${tag.is_active ? 'bg-green-500' : 'bg-zinc-400'}`} />
                  {tag.is_active ? 'Ativa' : 'Oculta'}
                </button>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={saving}
                  className="cursor-pointer rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
