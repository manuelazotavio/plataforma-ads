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
}

const roleOptions = [
  { value: 'aluno', label: 'Aluno' },
  { value: 'moderador', label: 'Moderador' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data } = await supabase
        .from('users')
        .select('id, name, email, role, avatar_url, created_at')
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

  if (loading) return <p className="text-sm text-zinc-500">Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Usuários</h1>
      <p className="text-sm text-zinc-500 mb-8">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Cadastro</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Papel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50/50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {user.avatar_url
                      ? <Image src={user.avatar_url} alt={user.name} width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500 shrink-0">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                    }
                    <span className="font-medium text-zinc-900">{user.name}</span>
                    {user.id === currentUserId && (
                      <span className="text-xs text-zinc-400">(você)</span>
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
                    />
                    {updatingId === user.id && (
                      <span className="text-xs text-zinc-400">Salvando...</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
