import Link from 'next/link'

const materials = [
  {
    title: 'Biblioteca virtual',
    description: 'Livros, artigos e bases de pesquisa usados nas disciplinas do curso.',
    href: '#',
  },
  {
    title: 'Modelos acadêmicos',
    description: 'Templates para trabalhos, relatórios, projetos e apresentações.',
    href: '#',
  },
]

const guidance = [
  {
    title: 'Passe escolar',
    description: 'Entenda quais dados reunir, onde acompanhar a solicitação e o que conferir antes de enviar.',
    videoTitle: 'Como solicitar o passe escolar',
    steps: [
      'Confira se seus dados pessoais e acadêmicos estão atualizados nos sistemas institucionais.',
      'Separe os documentos solicitados para comprovar matrícula e vínculo com o campus.',
      'Acesse o canal indicado pela instituição ou empresa responsável pelo transporte.',
      'Preencha a solicitação com atenção e salve comprovantes, protocolos ou prints importantes.',
      'Acompanhe o andamento e procure o setor responsável caso a análise demore ou retorne com pendência.',
    ],
  },
  {
    title: 'Requerimentos no SUAP',
    description: 'Veja como abrir solicitações acadêmicas sem se perder entre menus, anexos e protocolos.',
    videoTitle: 'Como abrir um requerimento no SUAP',
    steps: [
      'Entre no SUAP com seu usuário institucional.',
      'Localize a área de requerimentos ou solicitações acadêmicas.',
      'Escolha o tipo de pedido mais próximo da sua necessidade, como declaração, matrícula, aproveitamento ou revisão.',
      'Leia a descrição do requerimento antes de enviar e anexe documentos quando necessário.',
      'Depois do envio, acompanhe o status pelo próprio SUAP e responda pendências dentro do prazo.',
    ],
  },
  {
    title: 'Processos acadêmicos no geral',
    description: 'Um guia para saber por onde começar quando o aluno não sabe qual setor procurar.',
    videoTitle: 'Como entender processos acadêmicos',
    steps: [
      'Identifique primeiro qual é o assunto: matrícula, frequência, estágio, documentos, transporte ou disciplina.',
      'Verifique se existe prazo em calendário acadêmico, edital, comunicado ou sistema institucional.',
      'Procure o canal oficial antes de enviar mensagens soltas para vários setores.',
      'Descreva sua situação com dados objetivos: nome, prontuário, curso, turma e o que precisa resolver.',
      'Guarde protocolos e respostas para conseguir retomar o atendimento caso seja necessário.',
    ],
  },
  {
    title: 'Estágio',
    description: 'Estrutura para explicar o início, acompanhamento e encerramento do estágio.',
    videoTitle: 'Como funciona o estágio do início ao fim',
    steps: [
      'Início do estágio: requisitos, documentos e primeira solicitação.',
      'Durante o estágio: acompanhamento, entregas, relatórios e comunicação com responsáveis.',
      'Mudanças no estágio: prorrogação, alteração de dados, troca de empresa ou interrupção.',
      'Fim do estágio: encerramento, validação dos documentos e registro final.',
      'Dúvidas frequentes: o que fazer quando há pendências, atrasos ou informações divergentes.',
    ],
  },
  {
    title: 'Iniciação científica',
    description: 'Estrutura para reunir informações sobre projetos, editais, orientação e entregas.',
    videoTitle: 'Como começar uma iniciação científica',
    steps: [
      'O que é iniciação científica e quando faz sentido participar.',
      'Como encontrar editais, temas, professores orientadores e grupos de pesquisa.',
      'Como funciona a inscrição ou submissão de proposta.',
      'Quais entregas, relatórios ou apresentações costumam existir durante o projeto.',
      'Como registrar a experiência no currículo acadêmico e profissional.',
    ],
  },
  {
    title: 'TCC',
    description: 'Estrutura para orientar escolha de tema, orientação, desenvolvimento e entrega final.',
    videoTitle: 'Como se organizar para o TCC',
    steps: [
      'Como escolher tema, escopo e possível orientador.',
      'Quais etapas existem antes, durante e depois do desenvolvimento.',
      'Como organizar cronograma, documentação, pesquisa e implementação.',
      'Como preparar apresentação, banca ou entrega final.',
      'Dúvidas frequentes: atrasos, mudança de tema, dupla, reprovação ou ajustes finais.',
    ],
  },
]

const links = [
  { label: 'ECAD', href: 'https://ecad.ifspcaraguatatuba.edu.br/' },
  { label: 'SUAP', href: 'https://suap.ifsp.edu.br/' },
  { label: 'Meu perfil', href: '/perfil' },
  { label: 'Meus projetos', href: '/meus-projetos' },
  { label: 'Meus artigos', href: '/meus-artigos' },
]

export default function AreaAlunoPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-10 md:px-6">
      <div className="w-full">
        <header className="mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Recursos acadêmicos
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
              Acesse materiais do curso, orientações importantes e atalhos usados no dia a dia.
            </p>
          </div>
        </header>

        <section id="materiais" className="scroll-mt-24 border-t border-zinc-100 py-8">
          <h2 className="text-lg font-semibold text-zinc-900">Materiais</h2>
          <div className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {materials.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex flex-col gap-1 px-5 py-4 transition hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-500">{item.description}</span>
                </span>
                <span className="text-sm font-medium text-zinc-400">Acessar</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="orientacoes-academicas" className="scroll-mt-24 border-t border-zinc-100 py-8">
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-zinc-900">Orientações acadêmicas</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Escolha o assunto que você precisa consultar. Cada tema tem espaço para vídeo explicativo e passo a passo.
            </p>
          </div>

          <div className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {guidance.map((item) => (
              <details key={item.title} className="group open:bg-zinc-50/60">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-zinc-500">{item.description}</span>
                  </span>
                  <svg className="mt-1 w-4 h-4 shrink-0 text-zinc-300 transition group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>

                <div className="px-5 pb-5">
                  <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
                    Vídeo: {item.videoTitle}
                  </div>
                  <ol className="space-y-3">
                  {item.steps.map((step, index) => (
                    <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-6 text-zinc-600">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                  </ol>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section id="links-uteis" className="scroll-mt-24 border-t border-zinc-100 py-8">
          <h2 className="text-lg font-semibold text-zinc-900">Links úteis</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
