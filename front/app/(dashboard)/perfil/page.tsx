'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'

type Profile = {
  name: string
  bio: string
  semester: string
  github_url: string
  linkedin_url: string
  portfolio_url: string
  avatar_url: string
}

const EMPTY_PROFILE: Profile = {
  name: '',
  bio: '',
  semester: '',
  github_url: '',
  linkedin_url: '',
  portfolio_url: '',
  avatar_url: '',
}

export default function PerfilPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEgresso, setIsEgresso] = useState(false)
  const [egressoId, setEgressoId] = useState<string | null>(null)
  const [egressoForm, setEgressoForm] = useState({ graduation_year: '', role: '', company: '' })
  const [savingEgresso, setSavingEgresso] = useState(false)
  const [egressoSuccess, setEgressoSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('users')
        .select('name, bio, semester, github_url, linkedin_url, portfolio_url, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          name: profileData.name ?? '',
          bio: profileData.bio ?? '',
          semester: profileData.semester?.toString() ?? '',
          github_url: profileData.github_url ?? '',
          linkedin_url: profileData.linkedin_url ?? '',
          portfolio_url: profileData.portfolio_url ?? '',
          avatar_url: profileData.avatar_url ?? '',
        })
      }

      const { data: skillsData } = await supabase
        .from('user_skills')
        .select('skill_name')
        .eq('user_id', user.id)

      if (skillsData) {
        setSkills(skillsData.map((s) => s.skill_name))
      }

      const { data: egressoData } = await supabase
        .from('egressos')
        .select('id, graduation_year, role, company')
        .eq('user_id', user.id)
        .single()

      if (egressoData) {
        setIsEgresso(true)
        setEgressoId(egressoData.id)
        setEgressoForm({
          graduation_year: egressoData.graduation_year?.toString() ?? '',
          role: egressoData.role ?? '',
          company: egressoData.company ?? '',
        })
      }

      setLoading(false)
    }

    load()
  }, [router])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingAvatar(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erro ao enviar imagem: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setProfile((prev) => ({ ...prev, avatar_url: publicUrl }))
    setUploadingAvatar(false)
  }

  function handleChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  function addSkill() {
    const trimmed = newSkill.trim()
    if (!trimmed || skills.includes(trimmed)) return
    setSkills((prev) => [...prev, trimmed])
    setNewSkill('')
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  async function handleSaveEgresso() {
    if (!userId) return
    setSavingEgresso(true)
    setEgressoSuccess(false)

    const payload = {
      user_id: userId,
      name: profile.name,
      avatar_url: profile.avatar_url || null,
      graduation_year: egressoForm.graduation_year ? parseInt(egressoForm.graduation_year) : null,
      role: egressoForm.role || null,
      company: egressoForm.company || null,
      linkedin: profile.linkedin_url || null,
      bio: profile.bio || null,
      is_active: true,
    }

    if (egressoId) {
      await supabase.from('egressos').update(payload).eq('id', egressoId)
    } else {
      const { data } = await supabase.from('egressos').insert(payload).select('id').single()
      if (data) setEgressoId(data.id)
    }

    setEgressoSuccess(true)
    setSavingEgresso(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: profile.name,
        bio: profile.bio || null,
        semester: profile.semester ? parseInt(profile.semester) : null,
        github_url: profile.github_url || null,
        linkedin_url: profile.linkedin_url || null,
        portfolio_url: profile.portfolio_url || null,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      setError('Erro ao salvar perfil: ' + updateError.message)
      setSaving(false)
      return
    }

   
    await supabase.from('user_skills').delete().eq('user_id', userId)

    if (skills.length > 0) {
      const { error: skillsError } = await supabase.from('user_skills').insert(
        skills.map((skill_name) => ({ user_id: userId, skill_name }))
      )

      if (skillsError) {
        setError('Perfil salvo, mas erro ao salvar habilidades: ' + skillsError.message)
        setSaving(false)
        return
      }
    }

    setSuccess(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-semibold text-zinc-900">Meu perfil</h1>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-sm text-zinc-400 hover:text-red-600 transition"
          >
            Sair
          </button>
        </div>
        <p className="text-sm text-zinc-500 mb-6">Personalize suas informações</p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Nome completo" required>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
              placeholder="Seu nome"
            />
          </Field>

          <Field label="Bio">
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className={inputClass + ' resize-none'}
              placeholder="Fale um pouco sobre você..."
            />
          </Field>

          <Field label="Semestre">
            <input
              type="number"
              min={1}
              max={8}
              value={profile.semester}
              onChange={(e) => handleChange('semester', e.target.value)}
              className={inputClass}
              placeholder="Ex: 3"
            />
          </Field>

          <Field label="Avatar">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-2xl select-none">
                    ?
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
                >
                  {uploadingAvatar ? 'Enviando...' : 'Escolher imagem'}
                </button>
                <p className="text-xs text-zinc-400">JPG, PNG ou GIF. Máx. 2MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </Field>

          <Field label="GitHub">
            <input
              type="url"
              value={profile.github_url}
              onChange={(e) => handleChange('github_url', e.target.value)}
              className={inputClass}
              placeholder="https://github.com/usuario"
            />
          </Field>

          <Field label="LinkedIn">
            <input
              type="url"
              value={profile.linkedin_url}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              className={inputClass}
              placeholder="https://linkedin.com/in/usuario"
            />
          </Field>

          <Field label="Portfólio">
            <input
              type="url"
              value={profile.portfolio_url}
              onChange={(e) => handleChange('portfolio_url', e.target.value)}
              className={inputClass}
              placeholder="https://meusite.com"
            />
          </Field>

          <Field label="Habilidades">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className={inputClass + ' flex-1'}
                placeholder="Ex: React, Python..."
              />
              <button
                type="button"
                onClick={addSkill}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition"
              >
                Adicionar
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-zinc-400 hover:text-zinc-700 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Perfil salvo com sucesso!
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition"
          >
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </div>

      
      <div className="w-full max-w-lg mx-auto mt-6 bg-white rounded-2xl border border-zinc-200 p-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-zinc-900">Sou egresso</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-zinc-500">{isEgresso ? 'Ativo' : 'Inativo'}</span>
            <div
              onClick={() => setIsEgresso((v) => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isEgresso ? 'bg-[#0B7A3B]' : 'bg-zinc-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEgresso ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>
        <p className="text-sm text-zinc-400 mb-6">Apareça na página de egressos do curso.</p>

        {isEgresso && (
          <div className="flex flex-col gap-4">
            <Field label="Ano de formatura">
              <input
                type="number"
                value={egressoForm.graduation_year}
                onChange={(e) => setEgressoForm((f) => ({ ...f, graduation_year: e.target.value }))}
                className={inputClass}
                placeholder="Ex: 2024"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cargo atual">
                <input
                  value={egressoForm.role}
                  onChange={(e) => setEgressoForm((f) => ({ ...f, role: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Dev Frontend"
                />
              </Field>
              <Field label="Empresa">
                <input
                  value={egressoForm.company}
                  onChange={(e) => setEgressoForm((f) => ({ ...f, company: e.target.value }))}
                  className={inputClass}
                  placeholder="Ex: Google"
                />
              </Field>
            </div>
            <p className="text-xs text-zinc-400">Nome, foto, bio e LinkedIn são puxados do seu perfil.</p>

            {egressoSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Dados de egresso salvos!
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveEgresso}
              disabled={savingEgresso}
              className="rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
              style={{ backgroundColor: '#0B7A3B' }}
            >
              {savingEgresso ? 'Salvando...' : 'Salvar dados de egresso'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
