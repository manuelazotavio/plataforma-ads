'use client'

import { useState } from 'react'
import Select from '@/app/components/Select'
import { supabase } from '@/app/lib/supabase'

const SUBJECTS = [
  'Dúvida sobre o curso',
  'Informações sobre matrícula',
  'Estágio e TCC',
  'Problemas com a plataforma',
  'Sugestão ou feedback',
  'Outro assunto',
]

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2F9E41] focus:ring-2 focus:ring-[#2F9E41]/10'

export default function ContatoPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setSending(true)
    setError(null)
    const { error: err } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject || null,
      message: form.message.trim(),
    })
    if (err) {
      setError('Não foi possível enviar sua mensagem. Tente novamente.')
      setSending(false)
      return
    }
    setSent(true)
    setSending(false)
  }

  return (
    <div className="px-4 md:px-6 py-8 w-full">

      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-900">Contato</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Fale com a coordenação do curso de Análise e Desenvolvimento de Sistemas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 items-start">

        <div className="flex flex-col gap-4">

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-zinc-900">Coordenação de ADS</h2>

            <InfoItem
              icon={<IconMail />}
              label="E-mail"
              value="ads@ifspcaraguatatuba.edu.br"
              href="mailto:ads@ifspcaraguatatuba.edu.br"
            />
            <InfoItem
              icon={<IconMap />}
              label="Endereço"
              value="Avenida Bahia, 1739 - Indaiá, Caraguatatuba - SP, CEP: 11665-071"
            />
            <InfoItem
              icon={<IconInfo />}
              label="Localização"
              value="A sala da coordenação fica na sala dos professores, no segundo andar do IFSP."
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-900">Sistemas institucionais</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Portal do Aluno (SUAP)', href: 'https://suap.ifsp.edu.br' },
                { label: 'Moodle — Ambiente Virtual', href: 'https://ead.ifsp.edu.br' },
                { label: 'Site do IFSP', href: 'https://ifsp.edu.br' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition group"
                >
                  <span>{link.label}</span>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 group-hover:text-zinc-400 shrink-0">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1={10} y1={14} x2={21} y2={3}/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2F9E41' }}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-zinc-900">Mensagem enviada!</p>
                <p className="text-sm text-zinc-500 mt-1">Entraremos em contato pelo e-mail informado em breve.</p>
              </div>
              <button
                onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                className="mt-2 text-sm font-medium text-[#2F9E41] hover:underline"
              >
                Enviar outra mensagem
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Envie uma mensagem</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Respondemos em até 2 dias úteis.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Nome <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Seu nome completo"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">E-mail <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="seu@email.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Assunto</label>
                <Select
                  value={form.subject}
                  onChange={(value) => set('subject', value)}
                  options={SUBJECTS.map((subject) => ({ value: subject, label: subject }))}
                  placeholder="Selecione um assunto"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Mensagem <span className="text-red-400">*</span></label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  className={inputClass + ' resize-none'}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#2F9E41' }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Enviando…
                  </>
                ) : (
                  <>
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1={22} y1={2} x2={11} y2={13}/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Enviar mensagem
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}

function InfoItem({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-[#2F9E41]">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-zinc-400 leading-none mb-1">{label}</p>
        <p className="text-sm text-zinc-700 leading-snug">{value}</p>
      </div>
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block hover:opacity-80 transition" target={href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer">
        {content}
      </a>
    )
  }
  return content
}

function IconMail() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function IconInfo() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={12} y1={16} x2={12} y2={12}/><line x1={12} y1={8} x2={12} y2={8}/></svg>
}
function IconMap() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx={12} cy={10} r={3}/></svg>
}
