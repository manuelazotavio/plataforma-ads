export default function PrivacidadePage() {
  return (
    <div className="px-4 md:px-6 py-8 md:py-12 w-full">
      <h1 className="text-2xl font-black text-zinc-900 mb-2">Política de Privacidade</h1>
      <p className="text-sm text-zinc-400 mb-10">Última atualização: abril de 2026</p>

      <div className="flex flex-col gap-8 text-sm text-zinc-700 leading-relaxed">
        <Section title="1. Dados coletados">
          Coletamos as informações fornecidas no cadastro (nome, e-mail, semestre), dados de perfil opcionais (bio, foto, links) e dados de uso da plataforma (tópicos criados, projetos publicados, interações no fórum).
        </Section>

        <Section title="2. Finalidade do uso">
          Os dados são utilizados exclusivamente para operação da plataforma: exibição de perfil, participação no fórum, listagem de projetos e egressos, e comunicação interna entre membros da comunidade ADS.
        </Section>

        <Section title="3. Compartilhamento de dados">
          Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais. Informações podem ser compartilhadas com a coordenação do curso em situações que envolvam violação das regras da plataforma.
        </Section>

        <Section title="4. Armazenamento e segurança">
          Os dados são armazenados em servidores seguros com criptografia. Utilizamos a infraestrutura do Supabase, que segue práticas modernas de segurança da informação.
        </Section>

        <Section title="5. Seus direitos">
          Você pode, a qualquer momento, acessar, corrigir ou excluir seus dados pessoais por meio das configurações de perfil ou entrando em contato com a administração da plataforma.
        </Section>

        <Section title="6. Cookies">
          A plataforma utiliza cookies de sessão para manter seu login ativo. Não utilizamos cookies de rastreamento ou publicidade.
        </Section>

        <Section title="7. Dados de menores">
          A plataforma é destinada a estudantes do ensino superior. Não coletamos intencionalmente dados de menores de 18 anos sem o consentimento dos responsáveis.
        </Section>

        <Section title="8. Contato">
          Para exercer seus direitos ou esclarecer dúvidas sobre esta política, utilize a página de Contato da plataforma.
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
