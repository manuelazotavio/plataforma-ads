'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Professor = {
  id: string
  user_id: string | null
  name: string
  avatar_url: string | null
  bio: string | null
  cargo: string | null
  years_at_if: number | null
  email: string | null
  whatsapp: string | null
  linkedin: string | null
  cnpq: string | null
}

type SocialLink = {
  href: string
  label: string
}

function socialLinks(prof: Professor): SocialLink[] {
  const links: SocialLink[] = []
  const whatsappNumber = prof.whatsapp?.replace(/\D/g, '')

  if (prof.email) links.push({ href: `mailto:${prof.email}`, label: 'Email' })
  if (whatsappNumber) links.push({ href: `https://wa.me/${whatsappNumber}`, label: 'WhatsApp' })
  if (prof.linkedin) links.push({ href: prof.linkedin, label: 'LinkedIn' })
  if (prof.cnpq) links.push({ href: prof.cnpq, label: 'Lattes' })

  return links
}

function formatCargo(cargo: string) {
  const normalized = cargo.toLocaleLowerCase('pt-BR')
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
}

function ProfessorCard({ prof, onOpen }: { prof: Professor; onOpen: (professor: Professor) => void }) {
  const [hovered, setHovered] = useState(false)

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(prof)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(prof)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative h-72 w-52 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-zinc-100 focus:outline-none"
      aria-label={`Ver detalhes de ${prof.name}`}
    >
      {prof.avatar_url ? (
        <Image
          src={prof.avatar_url}
          alt={prof.name}
          fill
          className="object-cover"
          style={{
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)',
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl font-black text-zinc-300">
          {prof.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 py-5"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          transform: hovered ? 'translateY(0)' : 'translateY(30%)',
          opacity: hovered ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.4s ease',
        }}
      >
        <p className="text-base font-bold leading-tight text-white">{prof.name}</p>
        {prof.cargo && (
          <p className="text-sm font-semibold tracking-wide" style={{ color: '#4ade80' }}>
            {formatCargo(prof.cargo)}
          </p>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 px-5 py-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        <p className="truncate text-sm font-semibold leading-tight text-white">{prof.name}</p>
      </div>
    </div>
  )
}

function ProfessorDetailsModal({
  professor,
  onClose,
}: {
  professor: Professor
  onClose: () => void
}) {
  const router = useRouter()
  const links = socialLinks(professor)
  const profileHref = professor.user_id ? `/usuarios/${professor.user_id}` : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${professor.name}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="relative h-36 w-[104px] shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
            {professor.avatar_url ? (
              <Image src={professor.avatar_url} alt={professor.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-black text-zinc-300">
                {professor.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold leading-tight text-zinc-900">{professor.name}</h3>
            {professor.cargo && <p className="mt-1 text-sm text-zinc-500">{professor.cargo}</p>}
            {professor.years_at_if != null && professor.years_at_if > 0 && (
              <p className="mt-2 text-xs font-medium text-zinc-400">
                {professor.years_at_if} {professor.years_at_if === 1 ? 'ano' : 'anos'} no IF
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-sm font-bold text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Fechar detalhes"
          >
            <span aria-hidden="true">X</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-zinc-400">Descri&ccedil;&atilde;o</p>
          {professor.bio ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{professor.bio}</p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Descri&ccedil;&atilde;o do professor ainda n&atilde;o cadastrada.
            </p>
          )}
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-zinc-400">Redes sociais</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {links.length > 0 ? (
              links.map((link) => (
                <a
                  key={`modal-${professor.id}-${link.label}`}
                  href={link.href}
                  target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-[#2F9E41] hover:text-[#2F9E41]"
                >
                  {link.label}
                </a>
              ))
            ) : (
              <span className="text-sm text-zinc-400">Redes sociais ainda n&atilde;o cadastradas.</span>
            )}
          </div>
        </div>

        {profileHref && (
          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="mt-6 rounded-full bg-[#2F9E41] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#278736]"
          >
            Abrir perfil completo
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProfessorsSection({ professors }: { professors: Professor[] }) {
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null)

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-10 md:px-10" style={{ scrollbarWidth: 'none' }}>
        {professors.map((prof) => (
          <ProfessorCard key={prof.id} prof={prof} onOpen={setSelectedProfessor} />
        ))}
      </div>

      {selectedProfessor && (
        <ProfessorDetailsModal
          professor={selectedProfessor}
          onClose={() => setSelectedProfessor(null)}
        />
      )}
    </>
  )
}
