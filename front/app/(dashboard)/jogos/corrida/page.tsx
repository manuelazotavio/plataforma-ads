'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getAuthUser } from '@/app/lib/auth'


const W = 800
const H = 340
const GROUND = 278
const CAT_W = 110
const CAT_H = 80
const CAT_X = 80
const GRAVITY = 0.20
const JUMP_V = -8
const BASE_SPEED = 3
const CAT_FOOT = 22  

type Phase = 'idle' | 'playing' | 'dead'
type Obs = { x: number; w: number; h: number; count: number; flying?: boolean; fy?: number; cw?: number; ch?: number }

export default function CorridaPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const scaleRef    = useRef({ x: 1, y: 1 })
  const acRef       = useRef<AudioContext | null>(null)
  const milestoneRef = useRef(0)
  const userIdRef   = useRef<string | null>(null)

  function ac() {
    if (!acRef.current) acRef.current = new AudioContext()
    return acRef.current
  }

  function snd(freq: number, endFreq: number, duration: number, delay = 0, vol = 0.25, type: OscillatorType = 'square') {
    try {
      const ctx = ac()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = ctx.currentTime + delay
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
      gain.gain.setValueAtTime(vol, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration + 0.01)
    } catch { /* ignore audio errors */ }
  }

  function playJump()      { snd(520, 260, 0.11, 0, 0.15, 'triangle'); snd(260, 130, 0.11, 0, 0.07, 'sine') }
  function playMilestone() { snd(800, 800, 0.06, 0, 0.2); snd(1000, 1000, 0.06, 0.1, 0.2) }
  function playDead()      { snd(600, 600, 0.07, 0); snd(400, 400, 0.07, 0.08); snd(200, 200, 0.1, 0.17) }

  const phaseRef    = useRef<Phase>('idle')
  const catYRef     = useRef(GROUND - CAT_H + CAT_FOOT)
  const catVYRef    = useRef(0)
  const groundedRef = useRef(true)
  const obsRef      = useRef<Obs[]>([])
  const scoreRef    = useRef(0)
  const bestRef     = useRef(0)
  const speedRef    = useRef(BASE_SPEED)
  const tickRef     = useRef(0)
  const walkRef     = useRef(0)
  const rafRef      = useRef<number | undefined>(undefined)
  const imgsRef     = useRef<Partial<Record<string, HTMLImageElement>>>({})
  const bgRef       = useRef({ building: 0, cloud: 0, bush: 0 })

  const action = useCallback(() => {
    const p = phaseRef.current
    if (p === 'idle') {
      phaseRef.current    = 'playing'
      catYRef.current     = GROUND - CAT_H + CAT_FOOT
      catVYRef.current    = JUMP_V
      groundedRef.current = false
      obsRef.current      = []
      scoreRef.current    = 0
      speedRef.current    = BASE_SPEED
      tickRef.current     = 0
      milestoneRef.current = 0
      playJump()
      return
    }
    if (p === 'dead') {
      phaseRef.current    = 'idle'
      catYRef.current     = GROUND - CAT_H + CAT_FOOT
      catVYRef.current    = 0
      groundedRef.current = true
      obsRef.current      = []
      scoreRef.current    = 0
      speedRef.current    = BASE_SPEED
      tickRef.current     = 0
      milestoneRef.current = 0
      return
    }
    if (p === 'playing' && groundedRef.current) {
      catVYRef.current    = JUMP_V
      groundedRef.current = false
      playJump()
    }
  }, [])

  useEffect(() => {
    const srcs: [string, string][] = [
      ['idle',       '/games/cat-idle.png'],
      ['walk1',      '/games/cat-walk1.png'],
      ['walk2',      '/games/cat-walk2.png'],
      ['cacto',      '/games/cacto.png'],
      ['borboleta1', '/games/borboleta1.png'],
      ['borboleta2', '/games/borboleta2.png'],
    ]
    srcs.forEach(([key, src]) => {
      const img = new Image()
      img.src = src
      imgsRef.current[key] = img
    })
    const stored = localStorage.getItem('gata-run-best')
    if (stored) bestRef.current = parseInt(stored, 10)
    getAuthUser().then(u => { userIdRef.current = u?.id ?? null })
  }, [])


  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    
    function resize() {
      if (!canvas) return
      const dpr  = window.devicePixelRatio || 1
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width  = rect.width  * dpr
      canvas.height = rect.height * dpr
      scaleRef.current = {
        x: dpr * rect.width  / W,
        y: dpr * rect.height / H,
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    function img(key: string): HTMLImageElement | null {
      const i = imgsRef.current[key]
      return i?.complete && i.naturalWidth > 0 ? i : null
    }

  
    function bitmapSprite(bmp: number[][], P: number, colors: string[]) {
      const c = document.createElement('canvas')
      c.width = bmp[0].length * P
      c.height = bmp.length * P
      const cc = c.getContext('2d')!
      bmp.forEach((row, ry) => row.forEach((cell, rx) => {
        if (!cell) return
        cc.fillStyle = colors[cell - 1] ?? colors[0]
        cc.fillRect(rx * P, ry * P, P, P)
      }))
      return c
    }

    const cloudLg = bitmapSprite(
      [[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1]],
      6, ['#ffffff', '#e4e4e7']
    )
    const cloudSm = bitmapSprite(
      [[0,1,1,1,1,0],[1,2,2,2,2,1],[1,2,2,2,2,1]],
      5, ['#ffffff', '#e4e4e7']
    )
    const bushLg = bitmapSprite(
      [[0,0,1,1,1,0,0],[0,1,1,2,1,1,0],[1,1,2,2,2,1,1],[1,1,1,1,1,1,1]],
      5, ['#86efac', '#4ade80']
    )
    const bushSm = bitmapSprite(
      [[0,1,1,1,0],[1,1,2,1,1],[1,1,1,1,1]],
      4, ['#86efac', '#4ade80']
    )

    const CACTUS_W    = 64   
    const CACTUS_H    = 64   
    const CACTUS_FOOT = 16  

    const BUTTERFLY_W  = 56  
    const BUTTERFLY_H  = 36
    const BUTTERFLY_FY = GROUND - 58  

    
    const building = (() => {
      const OV = 4, BW = 158, TOTAL_H = 138
      const c = document.createElement('canvas')
      c.width  = BW + OV * 2  
      c.height = TOTAL_H
      const cc = c.getContext('2d')!

      
      cc.fillStyle = '#f8fafc'
      cc.fillRect(0, 0, c.width, TOTAL_H)
     
      cc.fillStyle = '#cbd5e1'
      cc.fillRect(0, 0, c.width, 4)

     
      const CS = 6, CG = 1
     
      const lx = 22, ly = 12
      const LOGO = [
        [1, 2, 2],
        [2, 2, 0],
        [2, 2, 2],
        [2, 2, 0],
      ] as const
      LOGO.forEach((row, r) => {
        row.forEach((cell, col) => {
          if (cell === 0) return
          const cx = lx + col * (CS + CG)
          const cy = ly + r  * (CS + CG)
          if (cell === 1) {
            cc.fillStyle = '#dc2626'
            cc.beginPath()
            cc.arc(cx + CS / 2, cy + CS / 2, CS / 2, 0, Math.PI * 2)
            cc.fill()
          } else {
            cc.fillStyle = '#16a34a'
            cc.fillRect(cx, cy, CS, CS)
          }
        })
      })

      
      const tx = lx + 3 * (CS + CG) + 5
      cc.fillStyle = '#1e293b'
      cc.font = 'bold 9px sans-serif'
      cc.fillText('INSTITUTO FEDERAL', tx, ly + 10)
      cc.font = '7px sans-serif'
      cc.fillStyle = '#374151'
      cc.fillText('São Paulo', tx, ly + 22)
      cc.fillText('Campus Caraguatatuba', tx, ly + 32)

      
      const WW = 18, WH = 10
     
      const mX = (BW - (4 * WW + 3 * 8)) / 2  
      for (let r = 0; r < 2; r++) {
        for (let col = 0; col < 4; col++) {
          const wx = Math.round(OV + mX + col * (WW + 8))
          const wy = 56 + r * (WH + 10)
          cc.fillStyle = (col + r) % 2 === 0 ? '#93c5fd' : '#bfdbfe'
          cc.fillRect(wx, wy, WW, WH)
          cc.fillStyle = '#94a3b8'
          cc.fillRect(wx, wy, WW, 1)
        }
      }

    
      const coverY = TOTAL_H - 26
      cc.fillStyle = '#94a3b8'
      cc.fillRect(0, coverY, c.width, 6)
    
      cc.fillStyle = '#fef08a'
      for (let i = 0; i < 5; i++) cc.fillRect(10 + i * 30, coverY + 1, 5, 2)

    
      cc.fillStyle = '#e8edf2'
      cc.fillRect(OV, coverY + 6, BW, 20)

      return c
    })()
    const BUILDING_H = building.height 

   
    function drawCloudLayer() {
      const WW = 1400
      const clouds = [
        { x: 80,   y: 30, sp: cloudLg },
        { x: 420,  y: 18, sp: cloudSm },
        { x: 750,  y: 38, sp: cloudLg },
        { x: 1100, y: 14, sp: cloudSm },
      ]
      const off = bgRef.current.cloud % WW
      clouds.forEach(({ x, y, sp }) => {
        ctx.drawImage(sp, Math.round(x - off), y)
        ctx.drawImage(sp, Math.round(x - off + WW), y)
      })
    }

    function drawBushLayer() {
      const WW = 700
      const bushes = [
        { x: 60,  sp: bushLg },
        { x: 230, sp: bushSm },
        { x: 390, sp: bushLg },
        { x: 570, sp: bushSm },
      ]
      const off = bgRef.current.bush % WW
      bushes.forEach(({ x, sp }) => {
        ctx.drawImage(sp, Math.round(x - off), GROUND - sp.height)
        ctx.drawImage(sp, Math.round(x - off + WW), GROUND - sp.height)
      })
    }

    function drawBuildingLayer() {
      const WW = 1800
      const bldgs = [{ x: 300 }, { x: 1100 }]
      const off = bgRef.current.building % WW
      bldgs.forEach(({ x }) => {
        ctx.drawImage(building, Math.round(x - off), GROUND - BUILDING_H)
        ctx.drawImage(building, Math.round(x - off + WW), GROUND - BUILDING_H)
      })
    }

    function drawBackground(speed: number) {
      bgRef.current.building += speed * 0.08
      bgRef.current.cloud    += speed * 0.22
      bgRef.current.bush     += speed * 0.55

      ctx.imageSmoothingEnabled = false

      ctx.fillStyle = '#f0fdf4'
      ctx.fillRect(0, 0, W, H)

      drawBuildingLayer()
      drawCloudLayer()

      ctx.fillStyle = '#e4e4e7'
      ctx.fillRect(0, GROUND, W, H - GROUND)
      ctx.fillStyle = '#d4d4d8'
      ctx.fillRect(0, GROUND, W, 2)

      drawBushLayer()
    }

    function drawScore() {
      const s = Math.floor(scoreRef.current)
      const b = Math.max(bestRef.current, s)
      ctx.textAlign = 'right'
      ctx.font = 'bold 13px monospace'
      ctx.fillStyle = '#a1a1aa'
      ctx.fillText(`REC  ${String(b).padStart(5, '0')}`, W - 18, 26)
      ctx.fillStyle = '#18181b'
      ctx.fillText(String(s).padStart(5, '0'), W - 18, 44)
      ctx.textAlign = 'left'
    }

    function drawCat() {
      const jumping = !groundedRef.current
      let key = 'idle'
      if (!jumping && phaseRef.current === 'playing') {
        key = walkRef.current < 2 ? 'walk1' : 'walk2'
      }
      const i = img(key) ?? img('idle')
      if (i) {
        ctx.drawImage(i, CAT_X, catYRef.current, CAT_W, CAT_H)
      } else {
        ctx.fillStyle = '#3f3f46'
        ctx.fillRect(CAT_X, catYRef.current, CAT_W, CAT_H)
      }
    }

    function drawObs(o: Obs) {
      if (o.flying) {
        const frame = Math.floor(tickRef.current / 18) % 2
        const bImg = img(frame === 0 ? 'borboleta1' : 'borboleta2')
        const fy = o.fy ?? BUTTERFLY_FY
        if (bImg) {
          ctx.drawImage(bImg, o.x, fy, BUTTERFLY_W, BUTTERFLY_H)
        } else {
          ctx.fillStyle = '#7c3aed'
          ctx.fillRect(o.x, fy, BUTTERFLY_W, BUTTERFLY_H)
        }
        return
      }
      const cactoImg = img('cacto')
      const cw = o.cw ?? CACTUS_W
      const ch = o.ch ?? CACTUS_H
      const foot = Math.round(ch * (CACTUS_FOOT / CACTUS_H))
      const step = Math.round(cw * 0.50)
      for (let i = 0; i < o.count; i++) {
        const dx = o.x + i * step
        if (cactoImg) {
          ctx.drawImage(cactoImg, dx, GROUND - ch + foot, cw, ch)
        } else {
          ctx.fillStyle = '#374151'
          ctx.fillRect(dx, GROUND - ch, cw, ch)
        }
      }
    }

    function loop() {
     
      const { x: sx, y: sy } = scaleRef.current
      ctx.setTransform(sx, 0, 0, sy, 0, 0)
      ctx.clearRect(0, 0, W, H)

      drawBackground(speedRef.current)
      drawScore()

      const p = phaseRef.current

      if (p === 'idle') {
        tickRef.current++
        walkRef.current = Math.floor(tickRef.current / 8) % 4
        drawCat()
        ctx.fillStyle = '#52525b'
        ctx.font = '15px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Pressione Espaço ou toque para começar', W / 2, H / 2 + 20)
        ctx.textAlign = 'left'
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      if (p === 'playing') {
        tickRef.current++
        scoreRef.current += 0.1
        speedRef.current  = Math.min(14, BASE_SPEED + scoreRef.current * 0.018)

       
        const milestone = Math.floor(scoreRef.current / 100)
        if (milestone > milestoneRef.current) {
          milestoneRef.current = milestone
          playMilestone()
        }

      
        catVYRef.current += GRAVITY
        catYRef.current  += catVYRef.current
        if (catYRef.current >= GROUND - CAT_H + CAT_FOOT) {
          catYRef.current     = GROUND - CAT_H + CAT_FOOT
          catVYRef.current    = 0
          groundedRef.current = true
        }

       
        walkRef.current = Math.floor(tickRef.current / 7) % 4

      
        const last = obsRef.current.at(-1)
        const spawnGap = Math.max(260, 480 - scoreRef.current * 0.2) + Math.random() * 260
        if (!last || last.x < W - spawnGap) {
          if (Math.random() < 0.28) {
          
            obsRef.current.push({ x: W + 10, w: BUTTERFLY_W, h: BUTTERFLY_H, count: 1, flying: true, fy: BUTTERFLY_FY })
          } else {
           
            const count = 1 + Math.floor(Math.random() * 2)
            const SIZES = [{ cw: 62, ch: 68 }, { cw: 74, ch: 80 }, { cw: 86, ch: 92 }]
            const { cw, ch } = SIZES[Math.floor(Math.random() * 3)]
            const step = Math.round(cw * 0.50)
            const w = cw + (count - 1) * step
            obsRef.current.push({ x: W + 10, w, h: Math.round(ch * 0.75), count, cw, ch })
          }
        }

     
        const sp = speedRef.current
        obsRef.current = obsRef.current
          .map(o => ({ ...o, x: o.x - sp }))
          .filter(o => o.x + o.w > -20)

     
        for (const o of obsRef.current) {
          const catTop = catYRef.current + 16
          const catBot = catYRef.current + CAT_H - 16
          const hitV = o.flying
            ? catTop < (o.fy ?? BUTTERFLY_FY) + BUTTERFLY_H && catBot > (o.fy ?? BUTTERFLY_FY)
            : catTop < GROUND && catBot > GROUND - o.h
          if (
            CAT_X + 30         < o.x + o.w - 8 &&
            CAT_X + CAT_W - 30 > o.x + 8       &&
            hitV
          ) {
            phaseRef.current = 'dead'
            const s = Math.floor(scoreRef.current)
            if (s > bestRef.current) {
              bestRef.current = s
              localStorage.setItem('gata-run-best', String(s))
              if (userIdRef.current) {
                void supabase.from('game_scores').upsert(
                  { user_id: userIdRef.current, game_id: 'corrida', score: s, updated_at: new Date().toISOString() },
                  { onConflict: 'user_id,game_id' }
                )
              }
            }
            playDead()
            break
          }
        }
      }

      obsRef.current.forEach(drawObs)
      drawCat()

      if (p === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.42)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 22px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Game Over', W / 2, H / 2 - 12)
        ctx.font = '13px system-ui, sans-serif'
        ctx.fillStyle = '#d4d4d8'
        ctx.fillText('Pressione Espaço ou toque para reiniciar', W / 2, H / 2 + 14)
        ctx.textAlign = 'left'
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

 
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-white px-4 py-4 dark:bg-zinc-950 md:px-6">

      {/* Portrait mobile → pede para virar */}
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white dark:bg-zinc-950 md:hidden landscape:hidden">
        <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 animate-bounce">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
          <path d="M3 9l3-3 3 3" stroke="#2F9E41" strokeWidth={2} />
          <path d="M6 6v6" stroke="#2F9E41" strokeWidth={2} />
        </svg>
        <div className="text-center">
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">Vire o dispositivo</p>
          <p className="mt-1 text-sm text-zinc-400">O jogo é jogado na horizontal</p>
        </div>
      </div>

      <div className="mb-2 flex shrink-0 items-center gap-2">
        <Link
          href="/jogos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Jogos
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Corrida da Gata</h1>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="cursor-pointer select-none overflow-hidden rounded-2xl border border-zinc-200 bg-[#fafafa] dark:border-zinc-800 dark:bg-zinc-900"
          style={{
            aspectRatio: '800 / 340',
            width: 'min(100%, calc((100vh - 9rem) * 2.353))',
          }}
          onClick={action}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      </div>

      {/* Botão de pulo — landscape mobile (visível quando < md e landscape) */}
      <div className="mt-2 shrink-0 flex items-center justify-center md:hidden">
        <button
          type="button"
          onClick={action}
          style={{ touchAction: 'manipulation' }}
          className="flex h-12 w-44 select-none items-center justify-center gap-2 rounded-2xl border-2 border-zinc-300 bg-zinc-100 text-sm font-bold text-zinc-600 active:scale-95 active:bg-zinc-200 transition-transform dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          aria-label="Pular"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Pular
        </button>
      </div>

      <p className="mt-2 shrink-0 text-center text-xs text-zinc-400 hidden md:block">
        Espaço · ↑ · Toque para pular
      </p>
    </div>
  )
}
