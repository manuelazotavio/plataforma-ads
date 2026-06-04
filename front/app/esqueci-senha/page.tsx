'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import BrandLogo from '@/app/components/BrandLogo'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/redefinir-senha`,
    })

    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-8">
        <div className="mb-6">
          <BrandLogo className="mb-4 h-12 w-48" priority />
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100">Esqueci minha senha</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>
                E-mail enviado para <strong>{email}</strong>. Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </span>
            </div>
            <Link
              href="/login"
              className="text-center text-sm text-zinc-500 hover:text-zinc-900 transition"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={submitted && !email.trim()
                  ? 'w-full rounded-lg border border-red-400 bg-red-50/30 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200'
                }
                placeholder="seu@email.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-[#2F9E41] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <Link
              href="/login"
              className="text-center text-sm text-zinc-400 hover:text-zinc-700 transition"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
