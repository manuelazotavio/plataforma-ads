export default function RegrasPage() {
  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-black text-zinc-900 mb-2">Regras do ADS Comunica</h1>
      <p className="text-sm text-zinc-400 mb-10">Última atualização: abril de 2026</p>

      <div className="flex flex-col gap-8 text-sm text-zinc-700 leading-relaxed">
        <Section title="1. Propósito da plataforma">
          O ADS Comunica é um espaço exclusivo para a comunidade do curso de Análise e Desenvolvimento de Sistemas. Seu objetivo é conectar alunos, egressos e professores por meio de projetos, fórum de discussão, oportunidades e conteúdo acadêmico.
        </Section>

        <Section title="2. Conduta esperada">
          Todos os membros devem agir com respeito, ética e responsabilidade. São proibidos: discurso de ódio, assédio, discriminação de qualquer natureza, spam, divulgação de conteúdo ilegal ou prejudicial, e uso da plataforma para fins comerciais não autorizados.
        </Section>

        <Section title="3. Conteúdo publicado">
          Ao publicar qualquer conteúdo — tópicos, respostas, projetos ou artigos — você declara que possui os direitos necessários e que o conteúdo não viola leis ou direitos de terceiros. Conteúdos que violem estas regras poderão ser removidos sem aviso prévio.
        </Section>

        <Section title="4. Uso de dados">
          Informações do seu perfil, como nome e semestre, podem ser exibidas publicamente dentro da plataforma. Dados sensíveis são tratados conforme nossa Política de Privacidade.
        </Section>

        <Section title="5. Moderação">
          A equipe administrativa reserva-se o direito de remover conteúdos, suspender ou encerrar contas que violem estas regras. Em casos graves, o ocorrido poderá ser comunicado à coordenação do curso.
        </Section>

        <Section title="6. Alterações">
          Estas regras podem ser atualizadas a qualquer momento. O uso continuado da plataforma após alterações implica aceitação das novas regras.
        </Section>

        <Section title="7. Contato">
          Dúvidas ou denúncias podem ser enviadas pela página de Contato da plataforma ou diretamente à coordenação do curso.
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
