'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const games = [
  {
    href: '/jogos/corrida',
    icon: '/games/cat-idle.png',
    title: 'Corrida da Gata',
    description: 'Desvie dos obstáculos e vá o mais longe possível com a gatinha do IF.'
  },
]

export default function JogosPage() {
  const [modal, setModal] = useState(false)

  return (
    <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Jogos</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Dica: Não jogue durante as aulas :)</p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#2F9E41' }}
          >
            Tem uma ideia de jogo?
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {games.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6 transition hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2F9E41]/10 overflow-hidden">
                <Image src={g.icon} alt={g.title} width={40} height={40} className="object-contain" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{g.title}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{g.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={e => e.stopPropagation()}
          >
            
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Contribuir com um jogo</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Os jogos da plataforma são open source. Você pode enviar o seu via Pull Request!
                </p>
              </div>
              <button
                onClick={() => setModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
                aria-label="Fechar"
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            
            <ol className="mb-5 flex flex-col gap-3">
              {[
                { n: '1', text: 'Faça um fork do repositório no GitHub' },
                { n: '2', text: 'Clone o fork e crie uma branch com o nome do seu jogo' },
                { n: '3', text: <>Adicione seu jogo em <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">front/app/(dashboard)/jogos/</code></> },
                { n: '4', text: 'Abra um Pull Request para o repositório oficial' },
              ].map(({ n, text }) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2F9E41]/10 text-xs font-bold text-[#2F9E41]">{n}</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{text}</span>
                </li>
              ))}
            </ol>

          
            <a
              href="https://github.com/adsifspcaragua/plataforma-ads"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              github.com/adsifspcaragua/plataforma-ads
            </a>

         
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2F9E41" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z"/>
              </svg>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Dúvidas? Entre em contato:{' '}
                <a href="tel:+5511942881397" className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">
                  (11) 94288-1397
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
