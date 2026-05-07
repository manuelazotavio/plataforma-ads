'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type PublicProfile = {
  id: string
  name: string
  avatar_url: string | null
  semester: number | null
}

export function PublicHeaderAuth() {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadProfile().then((data) => {
      setProfile(data)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <div className="h-9 w-28 rounded-lg bg-zinc-100" />

  if (!profile) {
    return (
      <>
        <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
          Entrar
        </Link>
        <Link href="/cadastro" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#0B7A3B' }}>
          Criar conta
        </Link>
      </>
    )
  }

  return (
    <div className="flex items-center gap-3 pl-4 border-l border-zinc-100">
      <div className="hidden sm:block text-right leading-tight">
        <p className="text-sm font-semibold text-zinc-900">{profile.name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{profile.semester ? `${profile.semester}º Semestre` : 'Aluno'}</p>
      </div>
      <Link href="/perfil" className="h-9 w-9 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-100">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.name} width={36} height={36} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
    </div>
  )
}

export function PublicProfileCard() {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadProfile().then((data) => {
      setProfile(data)
      setLoaded(true)
    })
  }, [])

  if (!loaded) {
    return <div className="h-40 rounded-2xl border border-zinc-200 bg-white p-5" />
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu Perfil</h3>
        <div className="mb-5 flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
              <circle cx={28} cy={28} r={22} fill="none" stroke="#f0fdf4" strokeWidth={6} />
              <circle cx={28} cy={28} r={22} fill="none" stroke="#16a34a" strokeWidth={6} strokeDasharray={`${2 * Math.PI * 22}`} strokeDashoffset={`${2 * Math.PI * 22 * 0.7}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700">30%</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Visitante</p>
            <p className="mt-0.5 text-xs text-zinc-400">Entre para publicar e comentar</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
          <Link href="/login" className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">Entrar</Link>
          <Link href="/cadastro" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#0B7A3B' }}>Criar conta</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-zinc-900">Seu Perfil</h3>
      <div className="mb-5 flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-100">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.name} width={56} height={56} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{profile.name}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{profile.semester ? `${profile.semester}º Semestre` : 'Aluno'}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
        <Link href="/perfil" className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">Meu perfil</Link>
        <Link href="/meus-projetos" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#0B7A3B' }}>Meus projetos</Link>
      </div>
    </div>
  )
}

async function loadProfile(): Promise<PublicProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('name, avatar_url, semester')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return {
    id: user.id,
    name: data.name,
    avatar_url: data.avatar_url,
    semester: data.semester,
  }
}
