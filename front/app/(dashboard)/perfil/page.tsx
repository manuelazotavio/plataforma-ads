'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'
import ProfileActivityFeed, { type ProfileActivityItem } from '@/app/components/ProfileActivityFeed'
import UserAvatar from '@/app/components/UserAvatar'

type Profile = {
  name: string
  bio: string
  semester: string
  github_url: string
  linkedin_url: string
  portfolio_url: string
  avatar_url: string
}

type ProfessorData = {
  id: string
  cargo: string
  whatsapp: string
  linkedin: string
  cnpq: string
  years_at_if: string
}

type ProfileStats = {
  xp: number
  levelName: string | null
  projectsCount: number
  articlesCount: number
  topicsCount: number
}

type Level = {
  id: number
  name: string
  min_xp: number
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

const EMPTY_PROFESSOR: ProfessorData = {
  id: '',
  cargo: '',
  whatsapp: '',
  linkedin: '',
  cnpq: '',
  years_at_if: '',
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
  const [submitted, setSubmitted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState<ProfileStats>({
    xp: 0,
    levelName: null,
    projectsCount: 0,
    articlesCount: 0,
    topicsCount: 0,
  })
  const [feedItems, setFeedItems] = useState<ProfileActivityItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [role, setRole] = useState<string | null>(null)
  const [professorData, setProfessorData] = useState<ProfessorData>(EMPTY_PROFESSOR)

  const [isEgresso, setIsEgresso] = useState(false)
  const [egressoId, setEgressoId] = useState<string | null>(null)
  const [egressoForm, setEgressoForm] = useState({ graduation_year: '', role: '', company: '' })

  useEffect(() => {
    async function load() {
      const user = await getAuthUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('users')
        .select('name, bio, semester, github_url, linkedin_url, portfolio_url, avatar_url, role')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setRole(profileData.role ?? null)
        setProfile({
          name: profileData.name ?? '',
          bio: profileData.bio ?? '',
          semester: profileData.semester?.toString() ?? '',
          github_url: profileData.github_url ?? '',
          linkedin_url: profileData.linkedin_url ?? '',
          portfolio_url: profileData.portfolio_url ?? '',
          avatar_url: profileData.avatar_url ?? '',
        })

        if (profileData.role === 'professor') {
          const { data: pd } = await supabase
            .from('professors')
            .select('id, cargo, whatsapp, linkedin, cnpq, years_at_if')
            .eq('user_id', user.id)
            .single()
          if (pd) {
            setProfessorData({
              id: pd.id,
              cargo: pd.cargo ?? '',
              whatsapp: pd.whatsapp ?? '',
              linkedin: pd.linkedin ?? '',
              cnpq: pd.cnpq ?? '',
              years_at_if: pd.years_at_if?.toString() ?? '',
            })
          }
        }
      }

      const { data: skillsData } = await supabase
        .from('user_skills').select('skill_name').eq('user_id', user.id)
      if (skillsData) setSkills(skillsData.map((s) => s.skill_name))

      const [
        { count: projectsCount },
        { count: articlesCount },
        { count: topicsCount },
        { count: xpProjectsCount },
        { count: xpArticlesCount },
        { count: xpTopicsCount },
        { count: projectCommentsCount },
        { count: articleCommentsCount },
        { data: xpProjects },
        { data: xpArticles },
        { data: projects },
        { data: articles },
        { data: topics },
        { data: levels },
      ] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('approved', true),
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'publicado'),
        supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'publicado'),
        supabase.from('forum_topics').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('project_comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('article_comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('like_count').eq('user_id', user.id),
        supabase.from('articles').select('like_count').eq('user_id', user.id),
        supabase.from('projects').select('id, title, description, is_featured, created_at, like_count, project_images(image_url, display_order, media_type)').eq('user_id', user.id).eq('approved', true),
        supabase.from('articles').select('id, title, summary, cover_image_url, published_at, like_count').eq('user_id', user.id).eq('status', 'publicado'),
        supabase.from('forum_topics').select('id, title, created_at, replies_count').eq('user_id', user.id),
        supabase.from('levels').select('id, name, min_xp').order('min_xp', { ascending: true }),
      ])

      const likesReceived =
        (xpProjects ?? []).reduce((total, project) => total + (project.like_count ?? 0), 0) +
        (xpArticles ?? []).reduce((total, article) => total + (article.like_count ?? 0), 0)
      const commentsCount = (projectCommentsCount ?? 0) + (articleCommentsCount ?? 0)
      const xp =
        (xpProjectsCount ?? 0) * 50 +
        (xpArticlesCount ?? 0) * 40 +
        (xpTopicsCount ?? 0) * 20 +
        commentsCount * 10 +
        likesReceived * 5
      const level = currentLevel((levels ?? []) as Level[], xp)
      setStats({
        xp,
        levelName: level?.name ?? null,
        projectsCount: projectsCount ?? 0,
        articlesCount: articlesCount ?? 0,
        topicsCount: topicsCount ?? 0,
      })
      setFeedItems([
        ...(projects ?? []).map((project) => ({
          id: project.id,
          type: 'project' as const,
          title: project.title,
          description: project.description,
          href: `/projetos/${project.id}`,
          date: project.created_at,
          isPinned: project.is_featured,
          meta: `${project.like_count ?? 0} curtidas`,
          imageUrl: getProjectCover(project.project_images)?.image_url ?? null,
          imageType: getProjectCover(project.project_images)?.media_type ?? null,
        })),
        ...(articles ?? [])
          .map((article) => ({
            id: article.id,
            type: 'article' as const,
            title: article.title,
            description: article.summary,
            href: `/artigos/${article.id}`,
            date: article.published_at ?? '',
            meta: `${article.like_count ?? 0} curtidas`,
            imageUrl: article.cover_image_url,
          }))
          .filter((item) => item.date),
        ...(topics ?? []).map((topic) => ({
          id: topic.id,
          type: 'topic' as const,
          title: topic.title,
          description: null,
          href: `/forum/${topic.id}`,
          date: topic.created_at,
          meta: `${topic.replies_count ?? 0} respostas`,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))

      const { data: egressoData } = await supabase
        .from('egressos').select('id, graduation_year, role, company').eq('user_id', user.id).single()
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
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setError('Erro ao enviar imagem: ' + uploadError.message); setUploadingAvatar(false); return }
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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    if (!userId || !profile.name.trim()) return
    if (isEgresso && egressoForm.graduation_year && parseInt(egressoForm.graduation_year) < 0) {
      setError('O ano de formatura não pode ser negativo.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase.from('users').update({
      name: profile.name,
      bio: profile.bio || null,
      semester: role === 'professor' ? null : (profile.semester ? parseInt(profile.semester) : null),
      github_url: profile.github_url || null,
      linkedin_url: profile.linkedin_url || null,
      portfolio_url: profile.portfolio_url || null,
      avatar_url: profile.avatar_url || null,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (updateError) { setError('Erro ao salvar perfil: ' + updateError.message); setSaving(false); return }

    if (role === 'professor' && professorData.id) {
      const { error: profError } = await supabase.from('professors').update({
        name: profile.name,
        bio: profile.bio || null,
        cargo: professorData.cargo || null,
        whatsapp: professorData.whatsapp || null,
        linkedin: professorData.linkedin || null,
        cnpq: professorData.cnpq || null,
        years_at_if: professorData.years_at_if ? parseInt(professorData.years_at_if) : null,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString(),
      }).eq('id', professorData.id)
      if (profError) { setError('Erro ao salvar dados do professor: ' + profError.message); setSaving(false); return }
    }

    await supabase.from('user_skills').delete().eq('user_id', userId)
    if (skills.length > 0) {
      const { error: skillsError } = await supabase.from('user_skills').insert(
        skills.map((skill_name) => ({ user_id: userId, skill_name }))
      )
      if (skillsError) { setError('Perfil salvo, mas erro ao salvar habilidades: ' + skillsError.message); setSaving(false); return }
    }

    if (isEgresso) {
      const { error: egressoError } = await supabase.rpc('upsert_own_egresso', {
        p_name: profile.name,
        p_graduation_year: egressoForm.graduation_year ? parseInt(egressoForm.graduation_year) : null,
        p_role: egressoForm.role || null,
        p_company: egressoForm.company || null,
        p_linkedin: profile.linkedin_url || null,
        p_bio: profile.bio || null,
        p_avatar_url: profile.avatar_url || null,
      })
      if (egressoError) { setError('Erro ao salvar dados de egresso: ' + egressoError.message); setSaving(false); return }
      if (!egressoId) {
        const { data: eg } = await supabase.from('egressos').select('id').eq('user_id', userId).single()
        if (eg) setEgressoId(eg.id)
      }
    } else if (egressoId) {
      await supabase.from('egressos').update({ is_active: false }).eq('id', egressoId)
    }

    setSuccess(true)
    setSaving(false)
    setEditing(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><p className="text-sm text-zinc-500">Carregando...</p></div>
  }

  if (!editing) {
    const socials = [
      profile.github_url ? { label: 'GitHub', url: profile.github_url } : null,
      profile.linkedin_url ? { label: 'LinkedIn', url: profile.linkedin_url } : null,
      profile.portfolio_url ? { label: 'Portfolio', url: profile.portfolio_url } : null,
    ].filter(Boolean) as { label: string; url: string }[]

    return (
      <div className="px-4 md:px-6 py-8 w-full">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700 transition inline-flex items-center gap-1.5">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Voltar
          </Link>
        </div>

        <section className="border-b border-zinc-100 pb-8">
          <div className="flex items-start gap-5">
            <UserAvatar src={profile.avatar_url} name={profile.name} className="h-20 w-20" sizes="80px" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-zinc-900">{profile.name}</h1>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                    {isEgresso ? 'Egresso' : roleLabel(role)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="ml-6 inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                  >
                    Sair
                  </button>
                </div>
              </div>
              {profile.semester && role !== 'professor' && (
                <p className="mt-1 text-sm text-zinc-400">{profile.semester}{String.fromCharCode(186)} semestre</p>
              )}
              {isEgresso && (
                <p className="mt-1 text-sm text-zinc-400">
                  Egresso{egressoForm.graduation_year ? ` ${egressoForm.graduation_year}` : ''}
                  {egressoForm.role ? ` - ${egressoForm.role}` : ''}
                  {egressoForm.company ? ` @ ${egressoForm.company}` : ''}
                </p>
              )}
              {profile.bio && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{profile.bio}</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 py-6 border-b border-zinc-100 sm:grid-cols-4">
          <ProfileStat label="XP" value={stats.xp.toLocaleString('pt-BR')} detail={stats.levelName} />
          <ProfileStat label="Projetos" value={stats.projectsCount} />
          <ProfileStat label="Artigos" value={stats.articlesCount} />
          <ProfileStat label="Topicos" value={stats.topicsCount} />
        </section>

        {(skills.length > 0 || socials.length > 0) && (
          <section className="py-6 flex flex-col gap-6">
            {skills.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 mb-3">Habilidades</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {socials.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 mb-3">Links</h2>
                <div className="flex flex-col gap-2">
                  {socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                    >
                      <span className="font-medium text-zinc-800">{social.label}</span>
                      <span className="text-xs text-zinc-400">{externalLabel(social.url)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <ProfileActivityFeed items={feedItems} />
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Editar perfil</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Visualize e edite suas informações</p>
        </div>
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
          className="text-sm text-zinc-400 hover:text-red-600 transition"
        >
          Sair
        </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,42rem)_300px] justify-center gap-6 items-start">

        <div className="lg:sticky lg:top-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="h-24 w-full" style={{ background: 'linear-gradient(135deg, #2F9E41 0%, #0d9444 60%, #34d399 100%)' }} />

            <div className="px-6 pb-6">
              <div className="relative -mt-10 mb-4">
                <UserAvatar src={profile.avatar_url} name={profile.name} className="h-20 w-20 border-4 border-white shadow-sm" sizes="80px" />
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-zinc-900 leading-tight">
                  {profile.name || <span className="text-zinc-300 font-normal italic">Seu nome</span>}
                </h2>
                {isEgresso && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#e6f4ec', color: '#2F9E41' }}>
                    Egresso
                  </span>
                )}
              </div>

              {profile.semester && !isEgresso && (
                <p className="text-xs text-zinc-400 mb-3">{profile.semester}{String.fromCharCode(186)} semestre</p>
              )}
              {isEgresso && egressoForm.role && (
                <p className="text-xs text-zinc-400 mb-3">
                  {egressoForm.role}{egressoForm.company ? ` · ${egressoForm.company}` : ''}
                </p>
              )}

              {profile.bio ? (
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">{profile.bio}</p>
              ) : (
                <p className="text-sm text-zinc-300 italic mb-4">Sua bio aparece aqui...</p>
              )}

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize text-zinc-600">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {(profile.github_url || profile.linkedin_url || profile.portfolio_url) && (
                <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition" title="GitHub">
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-[#0077B5] transition" title="LinkedIn">
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition" title="Portfólio">
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={2} y1={12} x2={22} y2={12}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col gap-1">
            <Link href="/meus-projetos" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/></svg>
              Meus projetos
            </Link>
            <Link href="/meus-artigos" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Meus artigos
            </Link>
            <div className="border-t border-zinc-100 my-1" />
            <Link href="/perfil/senha" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x={3} y={11} width={18} height={11} rx={2} ry={2}/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Alterar senha
            </Link>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex w-full flex-col gap-5 lg:col-start-2">

          <div className="bg-white rounded-2xl border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-5">Informações pessoais</h3>
            <div className="flex flex-col gap-4">

              <Field label="Avatar">
                <div className="flex items-center gap-4">
                  <UserAvatar src={profile.avatar_url} name={profile.name} className="h-14 w-14 border border-zinc-200" sizes="56px" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
                  >
                    {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </Field>

              <Field label="Nome completo" required>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={submitted && !profile.name.trim() ? inputErrorClass : inputClass}
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

              {role !== 'professor' && (
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
              )}
            </div>
          </div>

          {role === 'professor' && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-5">Dados profissionais</h3>
              <div className="flex flex-col gap-4">
                <Field label="Cargo">
                  <input
                    type="text"
                    value={professorData.cargo}
                    onChange={(e) => setProfessorData((p) => ({ ...p, cargo: e.target.value }))}
                    className={inputClass}
                    placeholder="Ex: Professor Efetivo"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Anos no IF">
                    <input
                      type="number"
                      min={0}
                      value={professorData.years_at_if}
                      onChange={(e) => setProfessorData((p) => ({ ...p, years_at_if: e.target.value }))}
                      className={inputClass}
                      placeholder="Ex: 8"
                    />
                  </Field>
                  <Field label="WhatsApp (com DDD)">
                    <input
                      type="text"
                      value={professorData.whatsapp}
                      onChange={(e) => setProfessorData((p) => ({ ...p, whatsapp: e.target.value }))}
                      className={inputClass}
                      placeholder="5511999999999"
                    />
                  </Field>
                </div>
                <Field label="LinkedIn">
                  <input
                    type="url"
                    value={professorData.linkedin}
                    onChange={(e) => setProfessorData((p) => ({ ...p, linkedin: e.target.value }))}
                    className={inputClass}
                    placeholder="https://linkedin.com/in/..."
                  />
                </Field>
                <Field label="CNPq / Lattes">
                  <input
                    type="url"
                    value={professorData.cnpq}
                    onChange={(e) => setProfessorData((p) => ({ ...p, cnpq: e.target.value }))}
                    className={inputClass}
                    placeholder="http://lattes.cnpq.br/..."
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-5">Redes sociais</h3>
            <div className="flex flex-col gap-4">
              <Field label="GitHub">
                <input type="url" value={profile.github_url} onChange={(e) => handleChange('github_url', e.target.value)} className={inputClass} placeholder="https://github.com/usuario" />
              </Field>
              <Field label="LinkedIn">
                <input type="url" value={profile.linkedin_url} onChange={(e) => handleChange('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/usuario" />
              </Field>
              <Field label="Portfólio">
                <input type="url" value={profile.portfolio_url} onChange={(e) => handleChange('portfolio_url', e.target.value)} className={inputClass} placeholder="https://meusite.com" />
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-5">Habilidades</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className={inputClass + ' flex-1'}
                placeholder="Ex: React, Python..."
              />
              <button type="button" onClick={addSkill} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition shrink-0">
                Adicionar
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-700">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="text-zinc-400 hover:text-zinc-700 transition ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-900">Sou egresso</h3>
              <div
                onClick={() => setIsEgresso((v) => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${isEgresso ? 'bg-[#2F9E41]' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEgresso ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-4">Apareça na página de egressos do curso.</p>

            {isEgresso && (
              <div className="flex flex-col gap-4">
                <Field label="Ano de formatura">
                  <input
                    type="number"
                    min={0}
                    value={egressoForm.graduation_year}
                    onChange={(e) => setEgressoForm((f) => ({ ...f, graduation_year: e.target.value }))}
                    className={inputClass}
                    placeholder="Ex: 2024"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cargo atual">
                    <input value={egressoForm.role} onChange={(e) => setEgressoForm((f) => ({ ...f, role: e.target.value }))} className={inputClass} placeholder="Ex: Dev Frontend" />
                  </Field>
                  <Field label="Empresa">
                    <input value={egressoForm.company} onChange={(e) => setEgressoForm((f) => ({ ...f, company: e.target.value }))} className={inputClass} placeholder="Ex: Google" />
                  </Field>
                </div>
                <p className="text-xs text-zinc-400">Nome, foto, bio e LinkedIn são puxados do seu perfil.</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Perfil salvo com sucesso!</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
            style={{ backgroundColor: '#2F9E41' }}
          >
            {saving ? 'Salvando...' : 'Salvar perfil'}
          </button>

        </form>

      </div>
    </div>
  )
}

const inputClass = 'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 transition w-full'

const inputErrorClass = 'rounded-lg border border-red-400 bg-red-50/30 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition w-full'

function roleLabel(role: string | null) {
  if (role === 'admin') return 'Admin'
  if (role === 'moderador') return 'Moderador'
  if (role === 'professor') return 'Professor'
  return 'Aluno'
}

function externalLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getProjectCover(images: unknown) {
  const media = (images as { image_url: string; display_order: number; media_type?: string | null }[] | null) ?? []
  return [...media].sort((a, b) => a.display_order - b.display_order)[0] ?? null
}

function currentLevel(levels: Level[], xp: number) {
  return [...levels].reverse().find((level) => xp >= level.min_xp) ?? levels[0] ?? null
}

function ProfileStat({ label, value, detail }: { label: string; value: string | number; detail?: string | null }) {
  return (
    <div>
      <p className="text-xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
      {detail && <p className="mt-1 text-xs font-semibold text-[#2F9E41]">{detail}</p>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
