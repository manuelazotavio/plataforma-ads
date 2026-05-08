'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default function AlterarSenhaPage() {
  const router = useRouter()
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [success, setSuccess]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword.trim()) { setError('Digite a nova senha.'); return }
    if (newPassword.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }

    setSaving(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    if (err) { setError(err.message); setSaving(false); return }

    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
    setSaving(false)
  }

  return (
    <div className="px-4 md:px-10 py-8 w-full max-w-lg mx-auto">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition mb-6"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        Voltar ao perfil
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Alterar senha</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Escolha uma senha com ao menos 6 caracteres.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Nova senha</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Confirmar nova senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <span>Senha alterada com sucesso!</span>
            <button type="button" onClick={() => router.push('/perfil')} className="underline shrink-0">Voltar ao perfil</button>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !newPassword}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition"
          style={{ backgroundColor: '#2F9E41' }}
        >
          {saving ? 'Salvando…' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}
