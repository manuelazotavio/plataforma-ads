export default function ContratoPage() {
  return (
    <div className="px-10 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-black text-zinc-900 mb-2">Contrato de Usuário</h1>
      <p className="text-sm text-zinc-400 mb-10">Última atualização: abril de 2026</p>

      <div className="flex flex-col gap-8 text-sm text-zinc-700 leading-relaxed">
        <Section title="1. Aceitação dos termos">
          Ao criar uma conta ou utilizar o ADS Comunica, você declara ter lido, compreendido e concordado com este Contrato de Usuário, com as Regras da plataforma e com a Política de Privacidade. Caso não concorde, não utilize a plataforma.
        </Section>

        <Section title="2. Elegibilidade">
          O acesso é permitido a alunos matriculados, egressos e professores do curso de Análise e Desenvolvimento de Sistemas. A administração pode verificar e revogar acessos de usuários que não atendam a este critério.
        </Section>

        <Section title="3. Conta e responsabilidade">
          Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Em caso de uso não autorizado, notifique a administração imediatamente.
        </Section>

        <Section title="4. Propriedade intelectual">
          O conteúdo publicado por você na plataforma (textos, projetos, imagens) permanece de sua propriedade. Ao publicá-lo, você concede ao ADS Comunica uma licença não exclusiva para exibi-lo dentro da plataforma.
        </Section>

        <Section title="5. Conteúdo de terceiros">
          A plataforma pode conter links ou referências a recursos externos. O ADS Comunica não se responsabiliza pelo conteúdo, disponibilidade ou práticas de privacidade de sites de terceiros.
        </Section>

        <Section title="6. Limitação de responsabilidade">
          O ADS Comunica é fornecido "no estado em que se encontra", sem garantias de disponibilidade contínua. Não nos responsabilizamos por eventuais perdas de dados, interrupções ou danos decorrentes do uso da plataforma.
        </Section>

        <Section title="7. Rescisão">
          Você pode encerrar sua conta a qualquer momento. A administração pode suspender ou encerrar contas que violem este contrato, sem necessidade de aviso prévio.
        </Section>

        <Section title="8. Legislação aplicável">
          Este contrato é regido pelas leis da República Federativa do Brasil. Eventuais disputas serão resolvidas no foro da comarca onde o Instituto Federal está localizado.
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
      <p>{children}</p>
    </div>
  )
}
