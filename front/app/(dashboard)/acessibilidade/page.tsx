export default function AcessibilidadePage() {
  return (
    <div className="px-10 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-black text-zinc-900 mb-2">Acessibilidade</h1>
      <p className="text-sm text-zinc-400 mb-10">Última atualização: abril de 2026</p>

      <div className="flex flex-col gap-8 text-sm text-zinc-700 leading-relaxed">
        <Section title="Nosso compromisso">
          O ADS Comunica está comprometido em garantir que a plataforma seja acessível ao maior número possível de pessoas, independentemente de habilidades ou tecnologias utilizadas. Seguimos as diretrizes WCAG 2.1 como referência de boas práticas.
        </Section>

        <Section title="O que estamos fazendo">
          Trabalhamos continuamente para melhorar a experiência de todos os usuários. Entre as práticas adotadas estão: uso de HTML semântico, contraste adequado entre texto e fundo, navegação por teclado, textos alternativos em imagens e interfaces responsivas para diferentes tamanhos de tela.
        </Section>

        <Section title="Limitações conhecidas">
          Algumas partes da plataforma ainda estão em desenvolvimento e podem não estar totalmente otimizadas para leitores de tela ou outros recursos assistivos. Estamos trabalhando para resolver essas limitações progressivamente.
        </Section>

        <Section title="Compatibilidade">
          A plataforma é compatível com os principais navegadores modernos (Chrome, Firefox, Edge, Safari) e com tecnologias assistivas como NVDA, JAWS e VoiceOver em suas versões recentes.
        </Section>

        <Section title="Feedback">
          Se você encontrar barreiras de acessibilidade ao usar o ADS Comunica, queremos saber. Entre em contato pela página de Contato descrevendo o problema e, se possível, o navegador e tecnologia assistiva utilizados. Sua contribuição é fundamental para melhorarmos a plataforma.
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
