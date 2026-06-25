'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type Settings = {
  fontSize: number
  letterSpacing: number
  lineHeight: number
  boldText: boolean
  highlightLinks: boolean
  highlightButtons: boolean
  contrast: number
  saturation: number
  readingMask: boolean
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: 0,
  letterSpacing: 0,
  lineHeight: 0,
  boldText: false,
  highlightLinks: false,
  highlightButtons: false,
  contrast: 0,
  saturation: 0,
  readingMask: false,
}

const STORAGE_KEY = 'ads-conecta-accessibility'

export default function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false)
  const [maskY, setMaskY] = useState(300)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } catch {
       
      } finally {
        settingsLoaded.current = true
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!settingsLoaded.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = `${100 + settings.fontSize * 12.5}%`
    return () => { root.style.fontSize = '' }
  }, [settings.fontSize])

  useEffect(() => {
    document.body.style.letterSpacing = settings.letterSpacing ? `${settings.letterSpacing * 1.5}px` : ''
    return () => { document.body.style.letterSpacing = '' }
  }, [settings.letterSpacing])

  useEffect(() => {
    document.body.style.lineHeight = settings.lineHeight ? `${1.6 + settings.lineHeight * 0.4}` : ''
    return () => { document.body.style.lineHeight = '' }
  }, [settings.lineHeight])

  useEffect(() => {
    document.body.classList.toggle('a11y-bold', settings.boldText)
    document.body.classList.toggle('a11y-highlight-links', settings.highlightLinks)
    document.body.classList.toggle('a11y-highlight-buttons', settings.highlightButtons)

    return () => {
      document.body.classList.remove('a11y-bold', 'a11y-highlight-links', 'a11y-highlight-buttons')
    }
  }, [settings.boldText, settings.highlightLinks, settings.highlightButtons])

  useEffect(() => {
    const content = document.getElementById('a11y-content')
    if (!content) return

    content.classList.remove('a11y-high-contrast', 'a11y-inverted', 'a11y-low-saturation', 'a11y-grayscale')
    if (settings.contrast === 1) content.classList.add('a11y-high-contrast')
    if (settings.contrast === 2) content.classList.add('a11y-inverted')
    if (settings.saturation === 1) content.classList.add('a11y-low-saturation')
    if (settings.saturation === 2) content.classList.add('a11y-grayscale')
  }, [settings.contrast, settings.saturation])

  useEffect(() => {
    if (!settings.readingMask) return
    const trackMouse = (event: MouseEvent) => setMaskY(event.clientY)
    window.addEventListener('mousemove', trackMouse)
    return () => window.removeEventListener('mousemove', trackMouse)
  }, [settings.readingMask])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const step = (key: 'fontSize' | 'letterSpacing' | 'lineHeight', amount: number) => {
    setSettings((current) => ({
      ...current,
      [key]: Math.max(0, Math.min(4, current[key] + amount)),
    }))
  }

  const openVLibras = () => {
    const tryClick = (attempt = 0) => {
      const button = document.querySelector<HTMLElement>('[vw-access-button]')
      if (button) {
        button.click()
        return
      }
      if (attempt < 20) window.setTimeout(() => tryClick(attempt + 1), 250)
    }
    tryClick()
  }

  return (
    <>
      <span className="ml-4 inline-flex items-center gap-3" role="group" aria-label="Recursos de acessibilidade">
        <button
          type="button"
          onClick={openVLibras}
          className="overflow-hidden rounded-lg transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Traduzir a página em Libras"
          title="Traduzir em Libras"
        >
          <Image src="/libras.png" alt="" width={32} height={32} className="size-8 object-cover" />
        </button>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="overflow-hidden rounded-lg transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Abrir painel de acessibilidade"
          aria-expanded={isOpen}
          title="Acessibilidade"
        >
          <Image src="/acessibilidade.png" alt="" width={32} height={32} className="size-8 object-cover" />
        </button>
      </span>

      {isOpen && (
        <div
          className="fixed bottom-20 left-1/2 z-[9998] flex max-h-[80vh] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl md:bottom-8 md:left-auto md:right-8 md:translate-x-0 dark:border-zinc-700 dark:bg-zinc-900"
          role="dialog"
          aria-label="Painel de acessibilidade"
        >
          <div className="flex items-center justify-between bg-blue-600 px-5 py-4 text-white">
            <h2 className="m-0 text-sm font-bold">Acessibilidade</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                Resetar
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-xl hover:bg-white/20"
                aria-label="Fechar painel de acessibilidade"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-5 overflow-y-auto p-4 text-zinc-800 dark:text-zinc-100">
            <ControlSection title="Controle de fonte">
              <Stepper label="Tamanho da fonte" value={settings.fontSize} onChange={(amount) => step('fontSize', amount)} />
              <Stepper label="Espaçamento entre letras" value={settings.letterSpacing} onChange={(amount) => step('letterSpacing', amount)} />
              <Stepper label="Espaçamento entre linhas" value={settings.lineHeight} onChange={(amount) => step('lineHeight', amount)} />
              <Toggle label="Texto em negrito" active={settings.boldText} onClick={() => update('boldText', !settings.boldText)} />
            </ControlSection>

            <ControlSection title="Navegação">
              <Toggle label="Destacar links" active={settings.highlightLinks} onClick={() => update('highlightLinks', !settings.highlightLinks)} />
              <Toggle label="Destacar botões" active={settings.highlightButtons} onClick={() => update('highlightButtons', !settings.highlightButtons)} />
              <Toggle label="Máscara de leitura" active={settings.readingMask} onClick={() => update('readingMask', !settings.readingMask)} />
            </ControlSection>

            <ControlSection title="Controle de cor">
              <Cycle
                label="Contraste"
                value={['Normal', 'Alto', 'Invertido'][settings.contrast]}
                active={settings.contrast > 0}
                onClick={() => update('contrast', (settings.contrast + 1) % 3)}
              />
              <Cycle
                label="Saturação"
                value={['Normal', 'Baixa', 'Cinza'][settings.saturation]}
                active={settings.saturation > 0}
                onClick={() => update('saturation', (settings.saturation + 1) % 3)}
              />
            </ControlSection>
          </div>
        </div>
      )}

      {settings.readingMask && (
        <div className="pointer-events-none fixed inset-0 z-[9990]" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 bg-black/60" style={{ height: Math.max(0, maskY - 40) }} />
          <div className="absolute inset-x-0 bottom-0 bg-black/60" style={{ top: maskY + 40 }} />
        </div>
      )}
    </>
  )
}

function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold text-blue-600">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (amount: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" disabled={value === 0} onClick={() => onChange(-1)} className="size-7 rounded-md border border-zinc-200 bg-white disabled:opacity-30 dark:border-zinc-600 dark:bg-zinc-900" aria-label={`Diminuir ${label}`}>−</button>
        <span className="w-12 text-center text-xs font-semibold text-blue-600">{value === 0 ? 'Padrão' : `+${value}`}</span>
        <button type="button" disabled={value === 4} onClick={() => onChange(1)} className="size-7 rounded-md border border-zinc-200 bg-white disabled:opacity-30 dark:border-zinc-600 dark:bg-zinc-900" aria-label={`Aumentar ${label}`}>+</button>
      </div>
    </div>
  )
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
    >
      {label}
    </button>
  )
}

function Cycle({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-blue-600 text-white' : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
    >
      <span>{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </button>
  )
}
