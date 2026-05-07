'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import Select from '@/app/components/Select'

type User = {
  id: string
  name: string
  email: string | null
  role: string
  avatar_url: string | null
  created_at: string
  suspended: boolean
}

const roleOptions = [
  { value: 'aluno', label: 'Aluno' },
  { value: 'professor', label: 'Professor' },
  { value: 'moderador', label: 'Moderador' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data } = await supabase
        .from('users')
        .select('id, name, email, role, avatar_url, created_at, suspended')
        .order('created_at', { ascending: false })

      setUsers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function changeRole(userId: string, role: string) {
    setUpdatingId(userId)
    await supabase.from('users').update({ role }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
    setUpdatingId(null)
  }

  async function toggleSuspend(userId: string, suspended: boolean) {
    setUpdatingId(userId)
    await supabase.from('users').update({ suspended }).eq('id', userId)
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, suspended } : u))
    setUpdatingId(null)
  }

  async function deleteUser(userId: string) {
    setUpdatingId(userId)
    await supabase.from('users').delete().eq('id', userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setConfirmDelete(null)
    setUpdatingId(null)
  }

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  const activeCount = users.filter((u) => !u.suspended).length
  const suspendedCount = users.filter((u) => u.suspended).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            {suspendedCount > 0 && (
              <span className="text-amber-500"> · {suspendedCount} suspenso{suspendedCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Cadastro</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Papel</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const isConfirming = confirmDelete === user.id

              return (
                <tr
                  key={user.id}
                  className={`transition ${user.suspended ? 'bg-amber-50/40' : 'hover:bg-zinc-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {user.avatar_url
                          ? <Image src={user.avatar_url} alt={user.name} width={28} height={28} className={`w-7 h-7 rounded-full object-cover ${user.suspended ? 'opacity-50 grayscale' : ''}`} />
                          : <div className={`w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 ${user.suspended ? 'opacity-50' : ''}`}>
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                        }
                      </div>
                      <span className={`font-medium ${user.suspended ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                        {user.name}
                      </span>
                      {isSelf && <span className="text-xs text-zinc-400">(você)</span>}
                      {user.suspended && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          suspenso
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{user.email ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onChange={(v) => changeRole(user.id, v)}
                        options={roleOptions}
                        className="w-36"
                        disabled={isSelf || updatingId === user.id}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {!isSelf && (
                      <div className="flex items-center justify-end gap-2">
                        {updatingId === user.id ? (
                          <span className="text-xs text-zinc-400">Salvando...</span>
                        ) : isConfirming ? (
                          <>
                            <span className="text-xs text-zinc-500">Confirmar exclusão?</span>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition"
                            >
                              Excluir
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleSuspend(user.id, !user.suspended)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                user.suspended
                                  ? 'border-green-200 text-green-700 hover:bg-green-50'
                                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              {user.suspended ? 'Reativar' : 'Suspender'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
