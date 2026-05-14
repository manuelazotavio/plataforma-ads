'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import { DEFAULT_PROJECT_TAGS, PROJECT_TAG_OPTIONS_TABLE, uniqueTagNames } from '@/app/lib/projectTags'

const TOTAL = 8

const AREAS = [
  { value: 'front-end', label: 'Front-end' },
  { value: 'back-end', label: 'Back-end' },
  { value: 'full-stack', label: 'Full-stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'dados', label: 'Dados & IA' },
  { value: 'devops', label: 'DevOps & Cloud' },
  { value: 'ux-design', label: 'UX & Design' },
  { value: 'seguranca', label: 'Segurança' },
]

const XP_ACTIONS = [
  { label: 'Publicar projeto', xp: 50 },
  { label: 'Publicar artigo', xp: 40 },
  { label: 'Criar tópico no fórum', xp: 20 },
  { label: 'Comentar', xp: 10 },
  { label: 'Receber curtida', xp: 5 },
]

const LEVELS = [
  { name: 'Iniciante', xp: 0, color: '#94a3b8' },
  { name: 'Explorador', xp: 100, color: '#60a5fa' },
  { name: 'Colaborador', xp: 250, color: '#2F9E41' },
  { name: 'Desbravador', xp: 500, color: '#f59e0b' },
  { name: 'Veterano', xp: 900, color: '#f97316' },
  { name: 'Especialista', xp: 1400, color: '#a855f7' },
]

const STEP_LABELS = [
  'Habilidades',
  'Perfil',
  'Projetos',
  'Experiência',
  'Eventos',
  'Discussões',
  'Artigos',
  'Sobre o Curso',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — skills
  const [skills, setSkills] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>(DEFAULT_PROJECT_TAGS)
  const [tagQuery, setTagQuery] = useState('')
  const [showTagDrop, setShowTagDrop] = useState(false)
  const tagRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Step 2 — profile
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bio, setBio] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getAuthUser().then((user) => {
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
    })
  }, [router])

  useEffect(() => {
    async function loadTags() {
      const { data } = await supabase
        .from(PROJECT_TAG_OPTIONS_TABLE)
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (data?.length) setAllTags(uniqueTagNames(data.map((d) => d.name)))
    }
    loadTags()
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setShowTagDrop(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatar(publicUrl)
    }
    setAvatarUploading(false)
    e.target.value = ''
  }

  function addSkill(tag: string) {
    setSkills((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    setTagQuery('')
  }

  function removeSkill(tag: string) {
    setSkills((prev) => prev.filter((t) => t !== tag))
  }

  const filteredTags = allTags
    .filter((t) => !skills.includes(t))
    .filter((t) => tagQuery.length === 0 || t.toLowerCase().includes(tagQuery.toLowerCase()))

  async function handleNext() {
    if (!userId) return

    if (step === 0) {
      setSaving(true)
      await supabase.from('user_skills').delete().eq('user_id', userId)
      if (skills.length > 0) {
        await supabase.from('user_skills').insert(
          skills.map((skill_name) => ({ user_id: userId, skill_name }))
        )
      }
      if (areas.length > 0) {
        await supabase.from('users').update({ preferred_area: areas.join(',') }).eq('id', userId)
      }
      setSaving(false)
    }

    if (step === 1) {
      setSaving(true)
      await supabase.from('users').update({
        bio: bio || null,
        linkedin_url: linkedin || null,
        github_url: github || null,
        avatar_url: avatar || null,
      }).eq('id', userId)
      setSaving(false)
    }

    if (step === TOTAL - 1) {
      setSaving(true)
      await supabase.from('users').update({ onboarding_completed: true }).eq('id', userId)
      setSaving(false)
      router.push('/')
      return
    }

    setStep((s) => s + 1)
  }

  const progress = ((step + 1) / TOTAL) * 100

  return (
    <div className="min-h-screen bg-white flex flex-col dark:bg-zinc-950">

      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur border-b border-zinc-100 px-5 py-4 z-10 dark:bg-zinc-950/90 dark:border-zinc-800">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#2F9E41] tracking-tight">ADS Comunica</span>
            <span className="text-xs text-zinc-400 font-medium">
              {STEP_LABELS[step]}
              <span className="ml-2 text-zinc-300">·</span>
              <span className="ml-2">{step + 1}/{TOTAL}</span>
            </span>
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2F9E41] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-5 py-10">
        <div className="w-full max-w-lg">

          {/* ── Step 1: Habilidades ── */}
          {step === 0 && (
            <div className="flex flex-col gap-8">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Quais são suas habilidades?</h1>
                <p className="mt-2 text-sm text-zinc-500">Selecione as tecnologias que você domina ou quer explorar.</p>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-zinc-700">Tecnologias</label>
                <div ref={tagRef} className="relative">
                  <div
                    className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2.5 min-h-[46px] focus-within:border-[#2F9E41] focus-within:ring-2 focus-within:ring-[#2F9E41]/20 transition cursor-text bg-white dark:bg-zinc-900 dark:border-zinc-800"
                    onClick={() => tagInputRef.current?.focus()}
                  >
                    {skills.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[#2F9E41]/10 border border-[#2F9E41]/20 text-[#2F9E41] text-xs font-medium px-2.5 py-0.5"
                      >
                        {tag}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => removeSkill(tag)}
                          className="text-[#2F9E41]/60 hover:text-[#2F9E41] leading-none transition"
                        >×</button>
                      </span>
                    ))}
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagQuery}
                      onChange={(e) => { setTagQuery(e.target.value); setShowTagDrop(true) }}
                      onFocus={() => setShowTagDrop(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !tagQuery && skills.length > 0) removeSkill(skills[skills.length - 1])
                        if (e.key === 'Escape') setShowTagDrop(false)
                      }}
                      className="flex-1 min-w-[130px] outline-none text-sm bg-transparent text-zinc-900 placeholder:text-zinc-400"
                      placeholder={skills.length === 0 ? 'Pesquisar tecnologia...' : ''}
                      autoComplete="off"
                    />
                  </div>

                  {showTagDrop && filteredTags.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-30 rounded-xl border border-zinc-200 bg-white shadow-lg max-h-44 overflow-y-auto dark:bg-zinc-900 dark:border-zinc-800">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { addSkill(tag); setShowTagDrop(true) }}
                          className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 transition text-left"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Área preferida */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-zinc-700">Área de interesse</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {AREAS.map((a) => {
                    const active = areas.includes(a.value)
                    return (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setAreas((prev) => active ? prev.filter((v) => v !== a.value) : [...prev, a.value])}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition text-left ${
                          active
                            ? 'border-[#2F9E41] bg-[#2F9E41]/5 text-[#2F9E41]'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {a.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Perfil ── */}
          {step === 1 && (
            <div className="flex flex-col gap-7">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Complete seu perfil</h1>
                <p className="mt-2 text-sm text-zinc-500">Essas informações ficam visíveis para os outros membros da comunidade.</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative shrink-0 w-20 h-20 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 overflow-hidden hover:border-[#2F9E41] transition group"
                >
                  {avatar ? (
                    <Image src={avatar} alt="avatar" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1 text-zinc-400 group-hover:text-[#2F9E41] transition">
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1={12} y1={3} x2={12} y2={15}/>
                      </svg>
                      <span className="text-[10px] font-medium">{avatarUploading ? '...' : 'Foto'}</span>
                    </div>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-zinc-800">Foto de perfil</p>
                  <p className="text-xs text-zinc-400 mt-0.5">JPG, PNG ou GIF. Máximo 5 MB.</p>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar(null)}
                      className="mt-1 text-xs text-red-400 hover:text-red-600 transition"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-700">Bio <span className="text-zinc-400 font-normal">(opcional)</span></label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Fale um pouco sobre você, seus interesses e objetivos..."
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-700">LinkedIn <span className="text-zinc-400 font-normal">(opcional)</span></label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-700">GitHub <span className="text-zinc-400 font-normal">(opcional)</span></label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Projetos ── */}
          {step === 2 && (
            <InfoStep
              title="Mostre seus projetos"
              description="Publique projetos do seu portfólio, compartilhe o que você construiu e receba feedbacks da comunidade. Cada projeto publicado vale XP!"
            >
              <div className="mt-6 rounded-2xl bg-zinc-50 border border-zinc-200 p-5 flex flex-col gap-4">
                <p className="text-sm font-semibold text-zinc-700">O que você pode publicar</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    'Projetos acadêmicos e trabalhos do curso',
                    'Projetos pessoais e portfólio',
                    'Trabalhos em grupo e colaborações',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#2F9E41]/15 flex items-center justify-center">
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#2F9E41" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  href="/projetos/novo"
                  className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#2F9E41] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition w-fit"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  Adicionar projeto agora
                </Link>
              </div>
            </InfoStep>
          )}

          {/* ── Step 4: XP ── */}
          {step === 3 && (
            <InfoStep
              title="Ganhe XP participando"
              description="Quanto mais você participa, mais experiência acumula. Suba de nível e destaque-se na comunidade."
            >
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4 flex flex-col gap-2.5">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Como ganhar XP</p>
                  {XP_ACTIONS.map((a) => (
                    <div key={a.label} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{a.label}</span>
                      <span className="font-semibold text-[#2F9E41]">+{a.xp}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Níveis</p>
                  {LEVELS.map((l) => (
                    <div key={l.name} className="flex items-center gap-2.5 text-sm">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-zinc-700 flex-1">{l.name}</span>
                      <span className="text-zinc-400 text-xs">{l.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </InfoStep>
          )}

          {/* ── Step 5: Eventos ── */}
          {step === 4 && (
            <InfoStep
              title="Participe dos eventos"
              description="Hackathons, maratonas de programação, extensão e iniciação científica. Fique por dentro de tudo que acontece no curso."
            >
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: 'Hackathon', desc: 'Competições de desenvolvimento em equipe' },
                  { label: 'Maratona', desc: 'Desafios de programação cronometrados' },
                  { label: 'Extensão', desc: 'Projetos e atividades extracurriculares' },
                  { label: 'Pesquisa', desc: 'Iniciação científica e TCC' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-semibold text-zinc-800">{item.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </InfoStep>
          )}

          {/* ── Step 6: Discussões ── */}
          {step === 5 && (
            <InfoStep
              title="Troque ideias no fórum"
              description="Tire dúvidas, ajude outros alunos e participe de debates sobre tecnologia, carreira e o curso."
            >
              <div className="mt-6 flex flex-col gap-3">
                {[
                  { q: 'Como funciona a iniciação científica?', tags: ['Pesquisa', 'IFNMG'] },
                  { q: 'React ou Vue para o TCC?', tags: ['Front-end', 'React'] },
                  { q: 'Melhores repositórios de exercícios de SQL', tags: ['Banco de Dados'] },
                ].map((item) => (
                  <div key={item.q} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-sm font-medium text-zinc-800">{item.q}</p>
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      {item.tags.map((t) => (
                        <span key={t} className="rounded-full bg-zinc-200 text-zinc-600 text-xs px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </InfoStep>
          )}

          {/* ── Step 7: Artigos ── */}
          {step === 6 && (
            <InfoStep
              title="Leia e publique artigos"
              description="Compartilhe conhecimento com a comunidade. Artigos ajudam quem está aprendendo e fortalecem seu portfólio."
            >
              <div className="mt-6 rounded-2xl bg-zinc-50 border border-zinc-200 p-5 flex flex-col gap-4">
                <p className="text-sm font-semibold text-zinc-700">Você pode escrever sobre</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    'Tutoriais e guias técnicos',
                    'Reflexões e experiências do curso',
                    'Análises de tecnologias e ferramentas',
                    'Revisões de livros e materiais',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#2F9E41]/15 flex items-center justify-center">
                        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#2F9E41" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </InfoStep>
          )}

          {/* ── Step 8: Sobre o curso ── */}
          {step === 7 && (
            <div className="flex flex-col gap-8">
              <div className="text-center flex flex-col items-center">
                <h1 className="text-2xl font-bold text-zinc-900">Bem-vindo ao ADS Comunica!</h1>
                <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                  A comunidade oficial do curso de Análise e Desenvolvimento de Sistemas.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col gap-4">
                <p className="text-sm font-semibold text-zinc-700">Sobre o curso de ADS</p>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  O curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas forma
                  profissionais capazes de desenvolver, implantar e manter sistemas de software,
                  com foco em resolução de problemas reais através da tecnologia.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { label: 'Duração', value: '6 semestres' },
                    { label: 'Modalidade', value: 'Presencial' },
                    { label: 'Período', value: 'Noturno' },
                    { label: 'Formação', value: 'Tecnólogo' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white border border-zinc-200 px-4 py-3 dark:bg-zinc-900 dark:border-zinc-800">
                      <p className="text-xs text-zinc-400">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-zinc-400">
                Seu perfil está pronto. Clique em <strong className="text-zinc-600">Começar!</strong> para explorar a plataforma.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-zinc-100 px-5 py-4 dark:bg-zinc-950/90 dark:border-zinc-800">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`text-sm text-zinc-500 hover:text-zinc-900 transition ${step === 0 ? 'invisible' : ''}`}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="rounded-full bg-[#2F9E41] px-8 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition shadow-sm"
          >
            {saving ? 'Salvando...' : step === TOTAL - 1 ? 'Começar!' : (
              <span className="flex items-center gap-2">
                Continuar
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </span>
            )}
          </button>
        </div>
      </footer>

    </div>
  )
}

// ── Shared components ──

function InfoStep({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{description}</p>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/20 transition'
