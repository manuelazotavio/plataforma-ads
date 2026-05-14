'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Role = {
  id: string
  label: string
  description: string | null
  color: string
  display_order: number
  is_system: boolean
}

const PERMISSION_GROUPS = [
  {
    category: 'Fórum',
    items: [
      { id: 'forum.create_topic', label: 'Criar tópicos' },
      { id: 'forum.reply', label: 'Responder tópicos' },
      { id: 'forum.moderate', label: 'Moderar — editar ou excluir qualquer post' },
      { id: 'forum.manage_categories', label: 'Gerenciar categorias do fórum' },
    ],
  },
  {
    category: 'Projetos',
    items: [
      { id: 'projects.create', label: 'Submeter projetos' },
      { id: 'projects.approve', label: 'Aprovar / reprovar projetos' },
      { id: 'projects.delete_any', label: 'Excluir qualquer projeto' },
    ],
  },
  {
    category: 'Artigos',
    items: [
      { id: 'articles.create', label: 'Criar artigos' },
      { id: 'articles.publish', label: 'Publicar sem necessidade de aprovação' },
      { id: 'articles.approve', label: 'Aprovar artigos de outros usuários' },
    ],
  },
  {
    category: 'Eventos',
    items: [
      { id: 'events.create', label: 'Criar eventos' },
      { id: 'events.manage', label: 'Editar e excluir qualquer evento' },
    ],
  },
  {
    category: 'Vagas',
    items: [
      { id: 'jobs.create', label: 'Publicar vagas' },
      { id: 'jobs.manage', label: 'Editar e excluir qualquer vaga' },
    ],
  },
  {
    category: 'Usuários',
    items: [
      { id: 'users.manage', label: 'Gerenciar usuários (alterar role, desativar)' },
    ],
  },
  {
    category: 'Administração',
    items: [
      { id: 'admin.access', label: 'Acessar painel administrativo' },
    ],
  },
]

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.id))

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[#2F9E41]' : 'bg-zinc-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function PermissoesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ id: '', label: '', description: '', color: '#2F9E41' })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadPerms(roleId: string) {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleId)
    setPerms(new Set((data ?? []).map((r: { permission: string }) => r.permission)))
  }

  async function loadRoles() {
    const { data } = await supabase.from('user_roles').select('*').order('display_order')
    const list = (data as Role[]) ?? []
    setRoles(list)
    if (list.length > 0 && !selected) {
      setSelected(list[0].id)
      await loadPerms(list[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const { data } = await supabase.from('user_roles').select('*').order('display_order')
      const list = (data as Role[]) ?? []
      setRoles(list)
      if (list.length > 0) {
        setSelected(list[0].id)
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role_id', list[0].id)
        setPerms(new Set((rolePerms ?? []).map((r: { permission: string }) => r.permission)))
      }
      setLoading(false)
    })
  }, [])

  async function selectRole(roleId: string) {
    setSelected(roleId)
    await loadPerms(roleId)
  }

  async function togglePerm(permId: string) {
    if (!selected) return
    setSaving(permId)
    const has = perms.has(permId)

    if (has) {
      await supabase.from('role_permissions').delete().eq('role_id', selected).eq('permission', permId)
      setPerms(prev => { const next = new Set(prev); next.delete(permId); return next })
    } else {
      await supabase.from('role_permissions').insert({ role_id: selected, permission: permId })
      setPerms(prev => new Set([...prev, permId]))
    }
    setSaving(null)
  }

  async function toggleAll(categoryItems: { id: string }[]) {
    if (!selected) return
    const ids = categoryItems.map(i => i.id)
    const allOn = ids.every(id => perms.has(id))

    if (allOn) {
      await supabase.from('role_permissions').delete().eq('role_id', selected).in('permission', ids)
      setPerms(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next })
    } else {
      const toAdd = ids.filter(id => !perms.has(id))
      await supabase.from('role_permissions').insert(toAdd.map(permission => ({ role_id: selected, permission })))
      setPerms(prev => new Set([...prev, ...toAdd]))
    }
  }

  async function grantAll() {
    if (!selected) return
    const toAdd = ALL_PERMISSIONS.filter(p => !perms.has(p))
    if (toAdd.length === 0) return
    await supabase.from('role_permissions').insert(toAdd.map(permission => ({ role_id: selected, permission })))
    setPerms(new Set(ALL_PERMISSIONS))
  }

  async function revokeAll() {
    if (!selected) return
    await supabase.from('role_permissions').delete().eq('role_id', selected)
    setPerms(new Set())
  }

  async function createRole() {
    setFormError(null)
    if (!form.id.trim() || !form.label.trim()) { setFormError('ID e nome são obrigatórios.'); return }
    if (!/^[a-z_]+$/.test(form.id)) { setFormError('ID deve conter apenas letras minúsculas e _'); return }
    setCreating(true)
    const { error } = await supabase.from('user_roles').insert({
      id: form.id.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      color: form.color,
      display_order: roles.length,
      is_system: false,
    })
    if (error) { setFormError(error.message); setCreating(false); return }
    setShowModal(false)
    setForm({ id: '', label: '', description: '', color: '#2F9E41' })
    await loadRoles()
    setSelected(form.id.trim())
    await loadPerms(form.id.trim())
    setCreating(false)
  }

  async function deleteRole(roleId: string) {
    if (!confirm(`Remover o perfil "${roleId}"? Isso não afeta usuários existentes com este perfil.`)) return
    await supabase.from('role_permissions').delete().eq('role_id', roleId)
    await supabase.from('user_roles').delete().eq('id', roleId)
    setRoles(prev => prev.filter(r => r.id !== roleId))
    if (selected === roleId) {
      const next = roles.find(r => r.id !== roleId)
      if (next) { setSelected(next.id); await loadPerms(next.id) }
      else { setSelected(null); setPerms(new Set()) }
    }
  }

  const selectedRole = roles.find(r => r.id === selected)
  const totalPerms = ALL_PERMISSIONS.length
  const grantedCount = ALL_PERMISSIONS.filter(p => perms.has(p)).length

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">

    
      <div className="flex shrink-0 flex-col gap-2 lg:w-56">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-zinc-400">Perfis</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#2F9E41] hover:opacity-70 transition"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Novo
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => selectRole(role.id)}
              className={`w-52 shrink-0 rounded-xl border px-3.5 py-3 text-left transition-colors lg:w-full ${
                selected === role.id
                  ? 'border-zinc-200 bg-zinc-50'
                  : 'border-transparent hover:bg-zinc-50'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{role.label}</p>
                  {role.description && (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{role.description}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      
      {selectedRole ? (
        <div className="flex-1 min-w-0">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                <h1 className="text-xl font-bold text-zinc-900">{selectedRole.label}</h1>
                {selectedRole.is_system && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-400">Sistema</span>
                )}
              </div>
              {selectedRole.description && (
                <p className="text-sm text-zinc-500 ml-5">{selectedRole.description}</p>
              )}
              <p className="text-xs text-zinc-400 ml-5 mt-1">
                {grantedCount} de {totalPerms} permissões ativas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <button
                onClick={revokeAll}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50"
              >
                Remover tudo
              </button>
              <button
                onClick={grantAll}
                className="text-xs font-medium text-white transition px-3 py-1.5 rounded-lg hover:opacity-90"
                style={{ backgroundColor: '#2F9E41' }}
              >
                Conceder tudo
              </button>
              {!selectedRole.is_system && (
                <button
                  onClick={() => deleteRole(selectedRole.id)}
                  className="text-xs font-medium text-red-500 hover:text-red-700 transition px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50"
                >
                  Excluir perfil
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {PERMISSION_GROUPS.map(group => {
              const allOn = group.items.every(i => perms.has(i.id))
              const someOn = group.items.some(i => perms.has(i.id))

              return (
                <div key={group.category} className="rounded-2xl border border-zinc-100 overflow-hidden">
               
                  <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <span className="text-xs font-bold text-zinc-700">{group.category}</span>
                    <button
                      onClick={() => toggleAll(group.items)}
                      className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition"
                    >
                      {allOn ? 'Remover todos' : someOn ? 'Conceder restantes' : 'Conceder todos'}
                    </button>
                  </div>

                 
                  <div className="divide-y divide-zinc-100">
                    {group.items.map(perm => {
                      const active = perms.has(perm.id)
                      return (
                        <div key={perm.id} className="flex items-start justify-between gap-4 px-4 py-3.5 sm:items-center sm:px-5">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className={`text-sm font-medium ${active ? 'text-zinc-900' : 'text-zinc-400'}`}>
                              {perm.label}
                            </span>
                            <span className="break-all text-xs font-mono text-zinc-300">{perm.id}</span>
                          </div>
                          <Toggle
                            checked={active}
                            onChange={() => togglePerm(perm.id)}
                            disabled={saving === perm.id}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
          Selecione um perfil para gerenciar permissões.
        </div>
      )}

   
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col gap-5 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Novo perfil</h2>
              <button onClick={() => { setShowModal(false); setFormError(null) }} className="text-zinc-400 hover:text-zinc-700 text-xl">×</button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">ID do perfil *</label>
                <input
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                  className={inputCls}
                  placeholder="ex: moderador"
                />
                <p className="text-xs text-zinc-400">Apenas letras minúsculas e underscore.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Nome exibido *</label>
                <input
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className={inputCls}
                  placeholder="ex: Moderador"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Descrição</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                  placeholder="Breve descrição do perfil..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-zinc-600 font-mono">{form.color}</span>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={createRole}
                disabled={creating || !form.id.trim() || !form.label.trim()}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 transition hover:opacity-90"
                style={{ backgroundColor: '#2F9E41' }}
              >
                {creating ? 'Criando...' : 'Criar perfil'}
              </button>
              <button
                onClick={() => { setShowModal(false); setFormError(null) }}
                className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition'
