import type { ReactNode } from 'react'

export default function ContactInfoCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold text-zinc-900">Coordenação de ADS</h2>

      <InfoItem
        icon={<IconMail />}
        label="E-mail"
        value="ads@ifspcaraguatatuba.edu.br"
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
  )
}

function InfoItem({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
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
