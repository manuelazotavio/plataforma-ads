'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAuthRedirectUrl } from '@/app/lib/authRedirect'
import { supabase } from '@/app/lib/supabase'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function CadastroPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [semester, setSemester] = useState('')
  const [isEgresso, setIsEgresso] = useState(false)
  const [graduationYear, setGraduationYear] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError(null)

    if (!name || !email || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (isEgresso && graduationYear && parseInt(graduationYear) < 0) {
      setError('O ano de formatura não pode ser negativo.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError || !data.user) {
      setError(friendlyAuthError(authError?.message))
      setLoading(false)
      return
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Conta criada! Confirme seu e-mail para continuar.')
        setLoading(false)
        return
      }
    }

    const { error: dbError } = await supabase.from('users').insert({
      id: data.user.id,
      name,
      email,
      password_hash: 'managed_by_supabase_auth',
      role: 'aluno',
      semester: !isEgresso && semester ? parseInt(semester) : null,
      onboarding_completed: false,
    })

    if (dbError) {
      setError('Conta criada, mas erro ao salvar perfil: ' + dbError.message)
      setLoading(false)
      return
    }

    if (isEgresso) {
      const { error: egressoError } = await supabase.rpc('upsert_own_egresso', {
        p_name: name,
        p_graduation_year: graduationYear ? parseInt(graduationYear) : null,
        p_role: role || null,
        p_company: company || null,
      })

      if (egressoError) {
        setError('Conta criada, mas erro ao salvar dados de egresso: ' + egressoError.message)
        setLoading(false)
        return
      }
    }

    router.push('/onboarding')
  }

  async function handleGoogleSignup() {
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    })

    if (error) {
      setError('Erro ao continuar com Google. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-zinc-50 px-4 py-8 sm:items-center sm:px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[440px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/70 sm:p-8">
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold text-[#2F9E41]">
            Plataforma ADS
          </p>
          <h1 className="text-2xl font-semibold text-zinc-950">Criar conta</h1>
          <p className="mt-1 text-sm text-zinc-500">Entre na comunidade de ADS.</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs font-medium text-zinc-400">ou</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ic(submitted && !name)}
              placeholder="Seu nome"
            />
          </div>

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
              className={ic(submitted && !email)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={ic(submitted && !password)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
              Confirmar senha <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={ic(submitted && (!confirmPassword || confirmPassword !== password))}
              placeholder="Repita a senha"
            />
            {submitted && confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-0.5">As senhas não coincidem</p>
            )}
          </div>

          <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setIsEgresso(false)}
              className={`flex-1 py-2 transition-colors ${!isEgresso ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Sou aluno
            </button>
            <button
              type="button"
              onClick={() => setIsEgresso(true)}
              className={`flex-1 py-2 transition-colors ${isEgresso ? 'bg-[#2F9E41] text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Sou egresso
            </button>
          </div>

          {!isEgresso ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="semester" className="text-sm font-medium text-zinc-700">
                Semestre <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                id="semester"
                type="number"
                min={1}
                max={8}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={normalInputClass}
                placeholder="Ex: 3"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700">Ano de formatura</label>
                <input
                  type="number"
                  min={0}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className={normalInputClass}
                  placeholder="Ex: 2023"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-zinc-700">Cargo atual</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={normalInputClass}
                    placeholder="Ex: Dev Frontend"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-zinc-700">Empresa</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={normalInputClass}
                    placeholder="Ex: Google"
                  />
                </div>
              </div>
            </div>
          )}

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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function friendlyAuthError(msg?: string): string {
  if (!msg) return 'Erro ao criar conta. Tente novamente.'
  const m = msg.toLowerCase()
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return 'Endereço de e-mail inválido.'
  if (m.includes('password') && m.includes('6'))
    return 'A senha deve ter no mínimo 6 caracteres.'
  if (m.includes('signup') && m.includes('disabled'))
    return 'Cadastros desativados no momento. Contate o administrador.'
  return 'Erro ao criar conta. Tente novamente.'
}

const normalInputClass =
  'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200'

function ic(invalid: boolean) {
  return invalid
    ? 'w-full rounded-lg border border-red-400 bg-red-50/30 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
    : normalInputClass
}
