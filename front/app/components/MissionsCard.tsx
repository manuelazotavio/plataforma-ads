'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'

type Mission = {
  id: string
  title: string
  description: string | null
  type: string
  target_count: number
  xp_reward: number
}

type WeeklySet = {
  id: string
  week_start: string
  bonus_xp: number
  missions: Mission[]
}

type MissionProgress = {
  mission_id: string
  progress: number
  completed: boolean
  xp_claimed: boolean
}

type WeeklySetMissionRow = {
  missions: Mission | null
}

function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

async function computeProgress(userId: string, weekStart: Date, missions: Mission[]): Promise<MissionProgress[]> {
  const ws = weekStart.toISOString()
  const we = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: forumTopicVotes },
    { count: forumReplyVotes },
    { count: projComments },
    { count: artComments },
    { count: forumReplies },
    { count: forumTopics },
    { count: projects },
    { count: articles },
  ] = await Promise.all([
    supabase.from('forum_topic_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('forum_reply_votes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('project_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('forum_replies').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('forum_topics').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws).lt('created_at', we),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('approved', true).gte('created_at', ws).lt('created_at', we),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'publicado').gte('created_at', ws).lt('created_at', we),
  ])

  const counts: Record<string, number> = {
    forum_votes:      (forumTopicVotes ?? 0) + (forumReplyVotes ?? 0),
    comments:         (projComments ?? 0) + (artComments ?? 0),
    forum_replies:    forumReplies ?? 0,
    topics_created:   forumTopics ?? 0,
    projects_created: projects ?? 0,
    articles_created: articles ?? 0,
  }

  return missions.map(m => {
    const progress = Math.min(m.target_count, counts[m.type] ?? 0)
    return { mission_id: m.id, progress, completed: progress >= m.target_count, xp_claimed: false }
  })
}

export default function MissionsCard() {
  const [set, setSet] = useState<WeeklySet | null>(null)
  const [progress, setProgress] = useState<MissionProgress[]>([])
  const [completions, setCompletions] = useState<{ mission_id: string | null; type: string }[]>([])
  const [loading, setLoading] = useState(true)

  const autoClaim = useCallback(async (
    uid: string, setId: string,
    prog: MissionProgress[],
    existingComps: { mission_id: string | null; type: string }[],
    missions: Mission[],
    bonusXp: number,
  ) => {
    const claimedMissionIds = new Set(existingComps.filter(c => c.type === 'mission').map(c => c.mission_id))
    const newlyCompleted = prog.filter(p => p.completed && !claimedMissionIds.has(p.mission_id))

    if (newlyCompleted.length > 0) {
      await supabase.from('mission_completions').insert(
        newlyCompleted.map(p => {
          const m = missions.find(m => m.id === p.mission_id)!
          return { user_id: uid, type: 'mission', mission_id: p.mission_id, set_id: setId, xp: m.xp_reward }
        })
      )
    }

    const alreadyBonus = existingComps.some(c => c.type === 'weekly_bonus')
    const allDone = prog.every(p => p.completed)
    const totalCompleted = new Set([...claimedMissionIds, ...newlyCompleted.map(p => p.mission_id)])
    const allClaimed = missions.every(m => totalCompleted.has(m.id))

    if (bonusXp > 0 && allDone && allClaimed && !alreadyBonus) {
      await supabase.from('mission_completions').insert({
        user_id: uid, type: 'weekly_bonus', set_id: setId, xp: bonusXp,
      })
    }

    
    const { data: comps } = await supabase.from('mission_completions').select('mission_id, type').eq('user_id', uid).eq('set_id', setId)
    setCompletions((comps ?? []) as { mission_id: string | null; type: string }[])
  }, [])

  const load = useCallback(async () => {
    const user = await getAuthUser()
    if (!user) { setLoading(false); return }

    const monday = getMonday()
    const weekStr = monday.toISOString().split('T')[0]

    const { data: setData } = await supabase
      .from('weekly_mission_sets')
      .select('id, week_start, bonus_xp, weekly_set_missions(missions(*))')
      .eq('week_start', weekStr)
      .eq('is_active', true)
      .single()

    if (!setData) { setLoading(false); return }

    const missions = ((setData.weekly_set_missions ?? []) as unknown as WeeklySetMissionRow[])
      .map((wsm) => wsm.missions)
      .filter((mission): mission is Mission => Boolean(mission))

    const currentSet: WeeklySet = { id: setData.id, week_start: setData.week_start, bonus_xp: setData.bonus_xp, missions }
    setSet(currentSet)

    const [prog, { data: comps }] = await Promise.all([
      computeProgress(user.id, monday, missions),
      supabase.from('mission_completions').select('mission_id, type').eq('user_id', user.id).eq('set_id', setData.id),
    ])

    setProgress(prog)
    setCompletions((comps ?? []) as { mission_id: string | null; type: string }[])
    setLoading(false)

    
    void autoClaim(user.id, setData.id, prog, (comps ?? []) as { mission_id: string | null; type: string }[], missions, setData.bonus_xp)
  }, [autoClaim])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  if (loading || !set) return null

  const claimedMissionIds = new Set(completions.filter(c => c.type === 'mission').map(c => c.mission_id))
  const bonusClaimed = completions.some(c => c.type === 'weekly_bonus')
  const allComplete = set.missions.every(m => {
    const p = progress.find(p => p.mission_id === m.id)
    return p?.completed
  })
  const totalXp = set.missions.reduce((acc, m) => acc + m.xp_reward, 0)
  const weeklyTotalXp = totalXp + (set.bonus_xp > 0 ? set.bonus_xp : 0)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900">Missões da semana</h3>
        {allComplete && set.bonus_xp > 0 && (
          <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: '#e6f4ec', color: '#2F9E41' }}>
            +{set.bonus_xp} XP bônus {bonusClaimed ? '✓' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {set.missions.map(m => {
          const p = progress.find(p => p.mission_id === m.id)
          const current = p?.progress ?? 0
          const done = p?.completed ?? false
          const claimed = claimedMissionIds.has(m.id)
          const pct = Math.min(100, Math.round((current / m.target_count) * 100))

          return (
            <div key={m.id} className={`rounded-xl p-3 transition ${done ? 'bg-green-50/60' : 'bg-zinc-50'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {done ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#2F9E41' }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300" />
                  )}
                  <span className={`text-sm font-medium truncate ${done ? 'text-zinc-500 line-through' : 'text-zinc-800'}`}>{m.title}</span>
                </div>
                <span className="shrink-0 text-xs font-semibold" style={{ color: done ? '#2F9E41' : '#a1a1aa' }}>
                  {claimed ? '✓ ' : ''}{m.xp_reward} XP
                </span>
              </div>
              {m.description && !done && <p className="text-xs text-zinc-400 ml-7 mb-2">{m.description}</p>}
              <div className="ml-7">
                <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: '#2F9E41' }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">{current} / {m.target_count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {allComplete && set.bonus_xp > 0 && (
        <div className="mt-4 rounded-xl p-3 text-center text-sm font-semibold border" style={{ backgroundColor: '#e6f4ec', borderColor: '#bbf7d0', color: '#2F9E41' }}>
          🎉 Todas as missões completadas! +{set.bonus_xp} XP bônus ganho
        </div>
      )}

      <p className="mt-3 text-[10px] text-zinc-400 text-center">
        {totalXp} XP nas missões{set.bonus_xp > 0 ? ` + ${set.bonus_xp} XP bônus = ${weeklyTotalXp} XP possíveis` : ' disponíveis'}
      </p>
    </div>
  )
}
