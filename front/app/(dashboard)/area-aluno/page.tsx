import Image from 'next/image'
import Link from 'next/link'

const materials = [
  {
    title: 'Biblioteca virtual',
    description: 'Livros, artigos e bases de pesquisa usados nas disciplinas do curso.',
    href: 'https://ifsp.pergamum.com.br/',
  },
  {
    title: 'Modelos acadêmicos',
    description: 'Templates para trabalhos, relatórios, projetos e apresentações.',
    href: 'https://drive.google.com/drive/folders/1uwdUxBcqMXekJorwt66Ot7zNji-8eGlk?usp=sharing',
  },
]

const guidance = [
  {
    title: 'Passe escolar',
    description: 'Entenda quais dados reunir, onde acompanhar a solicitação e o que conferir antes de enviar.',
    videoTitle: 'Como solicitar o passe escolar',
    videoEmbedUrl: null,
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
    description: 'Passo a passo para abrir solicitações acadêmicas no SUAP e anexar documentos quando necessário.',
    videoTitle: 'Como abrir requerimentos no SUAP',
    videoEmbedUrl: 'https://www.youtube.com/embed/y3MWSuP7kLk',
    steps: [
      {
        title: 'Acesse o SUAP',
        text: 'Entre no sistema SUAP utilizando seu CG e sua senha.',
        image: '/orientacoes/requerimentos-suap/01-login-suap.png',
        imageAlt: 'Tela de login do SUAP com usuário e senha preenchidos.',
      },
      {
        title: 'Acesse a área de Ensino',
        text: 'No menu localizado no canto esquerdo da tela, procure a opção “Ensino” e clique em “Boletins”.',
        image: '/orientacoes/requerimentos-suap/02-menu-ensino-boletins.png',
        imageAlt: 'Menu lateral do SUAP com a opção Ensino e o item Boletins.',
      },
      {
        title: 'Localize a área de Requerimentos',
        text: 'Ao abrir a página do boletim, observe o menu superior da tela e localize a opção “Requerimentos”. Ao acessar essa área, serão exibidos todos os requerimentos já realizados pelo aluno, incluindo solicitações anteriores e seus respectivos status.',
        image: '/orientacoes/requerimentos-suap/03-aba-requerimentos.png',
        imageAlt: 'Menu superior do boletim com a aba Requerimentos.',
      },
      {
        title: 'Crie um novo requerimento',
        text: 'Clique no botão “Adicionar Requerimento” para iniciar uma nova solicitação.',
        image: '/orientacoes/requerimentos-suap/04-adicionar-requerimento.png',
        imageAlt: 'Botão Adicionar Requerimento no SUAP.',
      },
      {
        title: 'Preencha e salve a solicitação',
        text: 'Selecione o assunto desejado, escreva sua mensagem de forma clara e objetiva e clique em Salvar. Após salvar, será possível anexar documentos, caso sejam necessários para a análise do requerimento.',
        image: '/orientacoes/requerimentos-suap/05-formulario-requerimento.png',
        imageAlt: 'Formulário de requerimento do SUAP com tipo, curso e descrição.',
      },
    ],
  },
  {
    title: 'Processos acadêmicos no geral',
    description: 'Um guia para saber por onde começar quando o aluno não sabe qual setor procurar.',
    videoTitle: 'Como entender processos acadêmicos',
    videoEmbedUrl: null,
    steps: [
      'Identifique primeiro qual é o assunto: matrícula, frequência, estágio, documentos, transporte ou disciplina.',
      'Verifique se existe prazo em calendário acadêmico, edital, comunicado ou sistema institucional.',
      'Procure o canal oficial antes de enviar mensagens soltas para vários setores.',
      'Descreva sua situação com dados objetivos: nome, prontuário, curso, turma e o que precisa resolver.',
      'Guarde protocolos e respostas para conseguir retomar o atendimento caso seja necessário.',
    ],
  },
  {
    title: 'Frequência e limite de faltas',
    description: 'Entenda quantas faltas são permitidas de acordo com a quantidade de aulas da disciplina.',
    videoTitle: null,
    videoEmbedUrl: null,
    steps: [
      'Para ser aprovado, o aluno precisa ter no mínimo 75% de frequência em cada disciplina.',
      'Isso significa que é possível faltar, no máximo, 25% do total de aulas da disciplina.',
      'Em uma disciplina com 80 aulas, o limite é de 20 faltas.',
      'Em uma disciplina com 60 aulas, o limite é de 15 faltas.',
      'Em uma disciplina com 40 aulas, o limite é de 10 faltas.',
      'Em uma disciplina com 20 aulas, o limite é de 5 faltas.',
      'As faltas são registradas por aula, e não apenas por dia. Se uma disciplina tiver quatro aulas no mesmo dia, faltar nesse dia pode resultar em quatro faltas.',
      'Acompanhe sua frequência pelo SUAP. Evite chegar exatamente ao limite, pois ultrapassar 25% pode causar reprovação por falta, mesmo que as notas estejam suficientes.',
    ],
    sections: [
      {
        title: 'Como fazer o cálculo',
        content: [
          'Multiplique o total de aulas da disciplina por 0,25. O resultado corresponde ao limite máximo de faltas.',
          'Exemplo: 80 aulas × 0,25 = 20 faltas. Para manter os 75% de frequência, o aluno deve comparecer a pelo menos 60 aulas.',
          'Se o resultado não for um número inteiro, não arredonde o limite para cima. Consulte o registro oficial no SUAP ou a coordenação para confirmar a quantidade permitida.',
        ],
      },
    ],
  },
  {
    title: 'Estágio',
    description: 'Orientações sobre estágio obrigatório e não obrigatório, documentos, prazos, acompanhamento e encerramento.',
    videoTitle: null,
    videoEmbedUrl: null,
    steps: [
      'O estágio é uma atividade acadêmica supervisionada que permite desenvolver experiências práticas na área de tecnologia.',
      'No curso de ADS, o estágio pode ser obrigatório ou não obrigatório.',
      'Todos os estágios devem seguir as normas do IFSP, a Lei nº 11.788/2008 e as orientações da Coordenadoria de Extensão (CEX).',
      'O estágio só deve começar após assinatura, aprovação e validação completa da documentação.',
    ],
    sections: [
      {
        title: 'Coordenação e orientadores',
        content: [
          'Coordenadora do curso: Prof.ª Juliana Matheus Gregio Pereira.',
          'Professores orientadores de estágio: Prof. Mario Tadashi Shimanuki (shimanuki@ifsp.edu.br) e Prof. Nelson Alves Pinto (nelson.alves@ifsp.edu.br).',
          'Orientadores designados conforme a Portaria nº 013/2025.',
        ],
      },
      {
        title: 'Tipos de estágio',
        content: [
          'O estágio obrigatório é previsto na matriz curricular e necessário para conclusão da graduação. Sem cumprir a carga horária obrigatória, o aluno não poderá concluir sua formação.',
          'O estágio não obrigatório é opcional e realizado além da carga horária obrigatória, mas ainda precisa estar relacionado à área do curso, ter documentação regularizada e professor orientador.',
        ],
        steps: [
          'Estágio obrigatório: pode ser remunerado ou não, deve possuir acompanhamento e exige documentação obrigatória.',
          'Estágio não obrigatório: precisa seguir as regras institucionais, mesmo sendo uma atividade opcional.',
        ],
      },
      {
        title: 'Como iniciar o estágio',
        content: [
          'Antes de procurar uma vaga, verifique se você está regularmente matriculado, se atende às exigências do curso e se não possui pendências acadêmicas ou documentais.',
          'Pendências podem incluir relatórios atrasados, documentos incompletos ou estágios anteriores não finalizados.',
        ],
        steps: [
          'Verifique se você pode iniciar o estágio.',
          'Procure uma vaga em empresas, plataformas de estágio, agências integradoras, programas institucionais ou vagas divulgadas pelo IFSP.',
          'Escolha um professor orientador do IFSP e identifique o supervisor na empresa.',
        ],
      },
      {
        title: 'Plataformas recomendadas',
        content: [
          'Algumas plataformas úteis para procurar oportunidades são CIEE, NUBE, Estagiários.com, IEL, LinkedIn e vagas divulgadas pelo IFSP.',
        ],
      },
      {
        title: 'Termo de Compromisso de Estágio',
        content: [
          'O Termo de Compromisso de Estágio (TCE) é o principal documento do estágio e é obrigatório para iniciar as atividades.',
          'O aluno não pode iniciar as atividades antes da assinatura do contrato.',
        ],
        steps: [
          'O TCE deve conter dados do aluno, empresa, período do estágio, carga horária, atividades, bolsa quando houver, seguro, supervisor e professor orientador.',
          'O documento deve ser assinado pelo aluno, empresa concedente, professor orientador, Diretor Geral do campus e responsável legal caso o aluno seja menor de idade.',
        ],
      },
      {
        title: 'Plano de Atividades',
        content: [
          'O Plano de Atividades descreve o que o aluno realizará durante o estágio.',
          'As atividades devem estar relacionadas à área de tecnologia e desenvolvimento de sistemas.',
        ],
        steps: [
          'Informe atividades desenvolvidas, tecnologias utilizadas, setor de atuação e relação das atividades com o curso de ADS.',
          'O Plano de Atividades deve ser assinado pelo aluno, supervisor da empresa e professor orientador.',
        ],
      },
      {
        title: 'Prazo e envio de documentos',
        content: [
          'A documentação deve ser enviada com pelo menos 10 dias de antecedência do início do estágio.',
          'Documentos incompletos ou enviados fora do prazo podem atrasar a aprovação.',
        ],
      },
      {
        title: 'Documentos complementares',
        content: [
          'Termo Aditivo: usado para renovação, alteração de horário, mudança de supervisor, alteração de atividades, bolsa ou carga horária.',
          'Relatório de Atividades: acompanha o desenvolvimento do aluno e deve ser entregue em período máximo de 6 meses.',
          'Ficha de Frequência: registra horários, presença e carga horária realizada.',
          'Termo de Rescisão: obrigatório quando o estágio é encerrado antes da data prevista.',
          'Termo de Realização de Estágio: entregue ao final para comprovar período, atividades e conclusão do estágio.',
        ],
      },
      {
        title: 'Seguro obrigatório',
        content: [
          'Todo estágio exige Seguro Contra Acidentes Pessoais.',
          'A responsabilidade pelo seguro é da empresa concedente.',
        ],
      },
      {
        title: 'Regras importantes',
        content: [
          'A carga horária deve respeitar o máximo de 6 horas diárias e 30 horas semanais.',
          'O estágio não pode prejudicar as aulas, não pode conflitar com horários acadêmicos e deve respeitar a disponibilidade do aluno.',
        ],
      },
      {
        title: 'Aproveitamento profissional',
        content: [
          'Alunos que já trabalham na área de tecnologia podem solicitar aproveitamento profissional.',
          'A solicitação deve ser realizada pelo módulo “Estágio e Afins” no SUAP.',
        ],
      },
      {
        title: 'Acompanhamento e finalização',
        content: [
          'Durante o estágio, o aluno deve cumprir as atividades previstas, manter frequência, seguir orientações da empresa e manter contato com o professor orientador.',
        ],
        steps: [
          'Desenvolva as atividades previstas.',
          'Entregue relatórios periódicos, fichas de frequência e documentos complementares quando solicitados.',
          'Ao concluir, entregue o Termo de Realização, regularize pendências e finalize toda a documentação.',
          'Somente após validação completa o estágio será oficialmente encerrado.',
        ],
      },
      {
        title: 'Links úteis',
        content: [
          'Informações, modelos de documentos e orientações oficiais estão disponíveis na página de estágio do IFSP Caraguatatuba.',
          'https://www.ifspcaraguatatuba.edu.br/estagio/estagios-obrigatorios-e-nao-obrigatorios',
        ],
      },
      {
        title: 'Atendimento e suporte',
        content: [
          'Em caso de dúvidas sobre contratos, relatórios, documentação, aproveitamento profissional ou encerramento do estágio, procure a Coordenadoria de Extensão (CEX), coordenação do curso, professores orientadores ou setor de estágio do campus.',
        ],
      },
    ],
  },
  {
    title: 'Iniciação científica',
    description: 'Entenda as modalidades de iniciação científica e tecnológica, editais, bolsas e responsabilidades.',
    videoTitle: null,
    videoEmbedUrl: null,
    steps: [
      'A Iniciação Científica e Tecnológica permite participar de projetos de pesquisa e inovação com orientação de um professor.',
      'Os projetos podem ter bolsa ou serem voluntários, dependendo da modalidade escolhida e do edital vigente.',
      'O primeiro passo é procurar um professor orientador para conversar sobre áreas de interesse, ideias de projeto e oportunidades disponíveis.',
      'Os projetos devem ser submetidos obrigatoriamente pelo professor orientador.',
      'A tramitação normalmente acontece pelo SUAP, no caminho Pesquisa → Projetos.',
    ],
    sections: [
      {
        title: 'Como participar',
        content: [
          'Demonstre interesse em pesquisa procurando um professor orientador do seu curso.',
          'Converse sobre áreas de interesse, ideias de projetos, grupos de pesquisa e editais disponíveis.',
          'Depois, escolha a modalidade mais adequada: voluntária, com bolsa institucional, CNPq ou FAPESP.',
        ],
        note: 'Importante: a submissão do projeto é feita pelo professor orientador.',
      },
      {
        title: 'PIVICT',
        subtitle: 'Programa Institucional Voluntário de Iniciação Científica e Tecnológica',
        content: [
          'Modalidade para alunos que desejam participar de projetos de pesquisa ou inovação sem bolsa remunerada.',
          'É indicada para quem quer iniciar experiência em pesquisa, ainda não atende requisitos de bolsa ou quer começar antes de editais remunerados.',
        ],
        steps: [
          'Acompanhe a publicação do edital no início do ano no site do campus e no SUAP.',
          'O professor orientador submete o projeto pelo SUAP em Pesquisa → Projetos.',
          'Após o envio, o orientador comunica obrigatoriamente o CPI pelo e-mail cpi.car@ifsp.edu.br.',
          'Durante o projeto, o aluno desenvolve as atividades previstas, entrega relatório parcial, relatório final e apresenta ao menos uma publicação relacionada aos resultados.',
        ],
      },
      {
        title: 'PIBIFSP',
        subtitle: 'Programa Institucional de Bolsas de Iniciação Científica e Tecnológica',
        content: [
          'Programa com bolsas para alunos de cursos técnicos e superiores participarem de projetos de pesquisa e inovação.',
          'Podem participar alunos regularmente matriculados que não tenham vínculo empregatício, não recebam outra bolsa do IFSP, exceto auxílio PAE, e não recebam bolsas de órgãos de fomento externos.',
        ],
        steps: [
          'Acompanhe o edital anual, normalmente divulgado no último trimestre do ano.',
          'O professor orientador realiza a submissão do projeto pelo SUAP em Pesquisa → Projetos.',
          'Se aprovado, professor e aluno desenvolvem a pesquisa por nove meses.',
          'Durante o período, são exigidos relatório parcial, relatório final e pelo menos uma publicação relacionada ao projeto.',
          'Valores e duração da bolsa seguem a disponibilidade orçamentária e o edital vigente.',
        ],
      },
      {
        title: 'PIBIC',
        subtitle: 'Programa Institucional de Bolsas de Iniciação Científica (CNPq)',
        content: [
          'Programa do CNPq voltado ao incentivo da pesquisa científica em instituições de ensino e pesquisa.',
          'As modalidades incluem PIBIC para ensino superior, PIBIC-EM para ensino médio e PIBIC-AF para ingressantes por ações afirmativas.',
        ],
        steps: [
          'Procure um professor interessado em orientar o projeto.',
          'Acompanhe editais e documentos publicados pela Pró-Reitoria de Pesquisa e Pós-Graduação (PRP) do IFSP.',
          'A submissão é feita pelo professor orientador conforme as orientações da PRP.',
          'Após aprovação, o aluno participa das atividades científicas previstas no projeto.',
        ],
      },
      {
        title: 'PIBITI',
        subtitle: 'Programa Institucional de Bolsas de Iniciação em Desenvolvimento Tecnológico e Inovação (CNPq)',
        content: [
          'Modalidade voltada para alunos do ensino superior interessados em inovação, desenvolvimento tecnológico e criação de soluções inovadoras.',
          'O programa aproxima estudantes de pesquisa aplicada e inovação tecnológica.',
        ],
        steps: [
          'Busque um professor orientador para acompanhar a proposta.',
          'Acompanhe editais e documentações divulgados pela PRP do IFSP.',
          'A submissão é realizada pelo orientador conforme as orientações institucionais.',
          'Alunos aprovados participam das atividades de pesquisa, inovação e desenvolvimento tecnológico propostas.',
        ],
      },
      {
        title: 'Bolsas FAPESP',
        subtitle: 'Fundação de Amparo à Pesquisa do Estado de São Paulo',
        content: [
          'Bolsas destinadas a alunos de graduação que desejam desenvolver pesquisa científica ou tecnológica com orientação de professor doutor ou qualificação equivalente.',
          'Para solicitar, o aluno deve ter bom desempenho acadêmico, ter concluído disciplinas importantes para o projeto e participar de uma proposta relevante cientificamente.',
        ],
        steps: [
          'Converse com um professor orientador.',
          'Organize a proposta de pesquisa junto ao orientador.',
          'Solicite a bolsa diretamente no sistema SAGe da FAPESP.',
          'Se aprovada, a bolsa normalmente dura um ano e inclui reserva técnica para eventos, materiais e despesas relacionadas à pesquisa.',
        ],
      },
      {
        title: 'Projetos no SUAP',
        content: [
          'Toda a tramitação dos projetos de iniciação científica é realizada pelo SUAP.',
          'Caminho no sistema: SUAP → Pesquisa → Projetos.',
          'Nesse ambiente é possível submeter projetos, acompanhar andamento, enviar relatórios e acessar informações relacionadas às pesquisas.',
        ],
      },
      {
        title: 'Dúvidas e atendimento',
        content: [
          'Em caso de dúvidas sobre projetos, editais ou programas de iniciação científica, entre em contato com a Coordenadoria de Pesquisa, Inovação e Pós-Graduação (CPI).',
          'E-mail: cpi.car@ifsp.edu.br',
        ],
      },
    ],
  },
  {
    title: 'RESAB',
    description: 'Reconhecimento de Saberes: saiba como aproveitar conhecimentos e experiências profissionais para dispensar disciplinas do curso.',
    videoTitle: null,
    videoEmbedUrl: null,
    steps: [
      'O Reconhecimento de Saberes (RESAB) é um instrumento pelo qual o estudante comprova que possui conhecimentos, habilidades e competências específicos da área de conhecimento de um componente curricular do curso.',
      'Por meio do RESAB, o aluno pode aproveitar até 30% da carga horária total do curso.',
      'O pedido deve ser feito dentro do prazo definido no calendário acadêmico.',
      'O RESAB é regulamentado pela Instrução Normativa PRE/IFSP nº 003, de 11 de maio de 2020.',
    ],
    sections: [
      {
        title: 'Como solicitar',
        content: [
          'Abra um requerimento no SUAP e anexe os documentos exigidos.',
        ],
        steps: [
          'Acesse o SUAP e abra um novo requerimento (veja a orientação "Requerimentos no SUAP" para o passo a passo).',
          'Preencha o Requerimento de Reconhecimento de Saberes e anexe-o ao requerimento.',
          'Anexe ao menos um documento comprobatório que demonstre seu conhecimento no componente curricular solicitado.',
        ],
      },
      {
        title: 'Documentos comprobatórios aceitos',
        content: [
          'Ao menos um dos documentos abaixo deve ser anexado ao requerimento:',
          'Carteira de Trabalho — páginas da foto, da identificação e do registro utilizado para requerer o RESAB.',
          'Contrato de Estágio ou Contrato de Trabalho.',
          'Declaração do Empregador descrevendo as atividades desempenhadas com período de início e fim.',
          'Anotações de Responsabilidade Técnica (ART) devidamente recolhidas.',
          'Certificado ou Diploma de curso(s) ligado(s) ao componente curricular solicitado.',
          'Registros fotográficos, audiovisuais ou escritos relacionados à prática profissional.',
          'Documentos comprobatórios de exercício profissional: projetos, portfólios ou declaração de serviços prestados emitida por pessoa jurídica.',
          'Memorial Socioprofissional firmado pelo candidato.',
        ],
      },
    ],
  },
  {
    title: 'TCC',
    description: 'Orientações para escolha do tema, desenvolvimento, estrutura, formatação e defesa do Trabalho de Conclusão de Curso.',
    videoTitle: null,
    videoEmbedUrl: null,
    steps: [
      'O Trabalho de Conclusão de Curso é uma etapa importante da formação acadêmica em ADS, porém não é obrigatório para a conclusão do curso.',
      'O aluno desenvolve um projeto de pesquisa, sistema, estudo ou solução tecnológica relacionada à área de Análise e Desenvolvimento de Sistemas.',
      'O trabalho deve ser acompanhado por um professor orientador e seguir o modelo institucional do IFSP.',
    ],
    sections: [
      {
        title: 'Como desenvolver o TCC',
        content: [
        ],
        steps: [
          'Escolha um tema relevante e que desperte seu interesse.',
          'Procure um professor orientador. Se necessário, o trabalho também pode ter coorientador.',
          'Defina problema, objetivos, justificativa, metodologia e cronograma de desenvolvimento.',
        ],
      },
      {
        title: 'Papel do orientador',
        content: [
          'O orientador acompanha o desenvolvimento do trabalho e ajuda o aluno a organizar a pesquisa e o projeto.',
          'Ele também orienta sobre metodologia, revisa a documentação e prepara o aluno para a banca.',
        ],
      },
      {
        title: 'Estrutura do TCC',
        content: [
          'O trabalho deve seguir as normas acadêmicas e o modelo institucional do IFSP.',
          'Entre os elementos obrigatórios estão capa, folha de rosto, folha de aprovação, resumo, abstract, palavras-chave e sumário.',
          'O resumo deve apresentar de forma objetiva o tema, os objetivos, a metodologia, os resultados e a conclusão do trabalho.',
        ],
        steps: [
          'Capa: instituição, curso, título, autor, cidade e ano.',
          'Folha de rosto: aluno, título, descrição do TCC, orientador, coorientador se houver, cidade e ano.',
          'Folha de aprovação: data de aprovação, banca examinadora e assinaturas.',
          'Resumo e abstract: versão em português e inglês, com palavras-chave.',
          'Sumário: capítulos e seções organizados com suas páginas.',
        ],
      },
      {
        title: 'Desenvolvimento do trabalho',
        content: [
          'Durante o desenvolvimento, o aluno deve fundamentar teoricamente o projeto, implementar ou analisar a solução proposta e documentar os resultados.',
          'A fundamentação pode usar livros, artigos científicos, documentações, normas técnicas e trabalhos acadêmicos.',
        ],
        steps: [
          'Produza a fundamentação teórica.',
          'Desenvolva o projeto, sistema, estudo ou solução proposta.',
          'Registre metodologia, tecnologias empregadas, testes, resultados, dificuldades e melhorias futuras.',
          'Elabore a conclusão com os resultados alcançados, resposta ao problema proposto e sugestões para trabalhos futuros.',
        ],
      },
      {
        title: 'Formatação',
        content: [
          'O TCC deve seguir o padrão acadêmico definido pelo IFSP e pelas normas ABNT.',
          'Configurações principais: fonte Arial, tamanho 12 no texto, espaçamento 1,5, texto justificado, papel A4, margem superior e esquerda de 3 cm, margem inferior e direita de 2 cm.',
          'Títulos: capítulos em Arial 18, negrito e caixa alta; seções em Arial 14 em negrito; subseções em Arial 12 em negrito.',
        ],
      },
      {
        title: 'Elementos opcionais',
        content: [
          'O TCC também pode conter dedicatória, agradecimentos, epígrafe, lista de figuras, lista de tabelas, lista de siglas, apêndices e anexos.',
          'Use esses elementos quando eles ajudarem a organizar ou complementar o trabalho.',
        ],
      },
      {
        title: 'Referências bibliográficas',
        content: [
          'Todas as fontes utilizadas no trabalho devem ser citadas corretamente conforme as normas da ABNT.',
          'As referências podem incluir livros, artigos, sites, documentações, trabalhos acadêmicos e materiais utilizados na pesquisa.',
        ],
      },
      {
        title: 'Defesa do TCC',
        content: [
          'Após finalizar o trabalho, o aluno apresenta o TCC para uma banca avaliadora.',
          'É importante preparar slides, demonstração do sistema se houver, explicação do projeto e resultados obtidos.',
          'Após a defesa, a banca pode solicitar ajustes e correções. O trabalho só é considerado finalizado após essas correções.',
        ],
      },
      {
        title: 'Ficha catalográfica',
        content: [
          'Após as correções da banca, o aluno deve solicitar a ficha catalográfica junto à biblioteca do campus.',
          'Esse documento é obrigatório para a versão final do TCC.',
        ],
      },
      {
        title: 'Dicas importantes',
        content: [
          'Comece o TCC com antecedência e mantenha contato frequente com o orientador.',
          'Organize o cronograma, utilize referências confiáveis, revise o texto e a formatação constantemente.',
          'Salve backups do trabalho e siga o modelo oficial disponibilizado pelo IFSP.',
        ],
      },
      {
        title: 'Links úteis',
        content: [
          'Anexos do Regimento do Trabalho de Conclusão de Curso em formato editável.',
          'Diretrizes para elaboração e diagramação do Trabalho de Conclusão de Curso.',
          'Consulte também a seção de Estágio, quando o trabalho ou documentação estiver relacionado às atividades práticas do curso.',
          'https://www.ifspcaraguatatuba.edu.br/biblioteca/trabalho-de-conclusao-de-curso',
        ],
      },
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
    <div className="min-h-screen bg-white px-4 py-10 dark:bg-zinc-950 md:px-6">
      <div className="w-full">
        <header className="mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Recursos acadêmicos
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Acesse materiais do curso, orientações importantes e atalhos usados no dia a dia.
            </p>
          </div>
        </header>

        <section id="materiais" className="scroll-mt-24 border-t border-zinc-100 py-8 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Materiais</h2>
          <div className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {materials.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex flex-col gap-1 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.description}</span>
                </span>
                <span className="text-sm font-medium text-zinc-400">Acessar</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="orientacoes-academicas" className="scroll-mt-24 border-t border-zinc-100 py-8 dark:border-zinc-800">
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Orientações acadêmicas</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Escolha o assunto que você precisa consultar. Cada tema tem espaço para vídeo explicativo e passo a passo.
            </p>
          </div>

          <div className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {guidance.map((item) => (
              <details key={item.title} className="group open:bg-zinc-50/60 dark:open:bg-zinc-900/60">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.description}</span>
                  </span>
                  <svg className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition group-open:rotate-45 dark:text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>

                <div className="px-5 pb-5">
                  {item.videoEmbedUrl ? (
                    <div className="mb-5 max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-900">
                        <iframe
                          className="h-full w-full"
                          src={item.videoEmbedUrl}
                          title={item.videoTitle ?? 'Vídeo de orientação acadêmica'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : item.videoTitle && (
                    <div className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                      Vídeo: {item.videoTitle}
                    </div>
                  )}
                  <ol className="space-y-3">
                  {item.steps.map((step, index) => (
                    <li key={typeof step === 'string' ? step : step.title} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                        {index + 1}
                      </span>
                      {typeof step === 'string' ? (
                        <span>{step}</span>
                      ) : (
                        <span className="min-w-0">
                          <span className="block font-semibold text-zinc-800 dark:text-zinc-100">{step.title}</span>
                          <span className="mt-1 block">{step.text}</span>
                          <span className="mt-3 block max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                            <Image
                              src={step.image}
                              alt={step.imageAlt}
                              width={1004}
                              height={652}
                              className="h-auto max-h-80 w-full object-contain"
                            />
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                  </ol>

                  {'sections' in item && item.sections && (
                    <div className="mt-5 space-y-2">
                      {item.sections.map((section) => (
                        <details key={section.title} className="group/section rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</span>
                              {'subtitle' in section && section.subtitle && (
                                <span className="mt-0.5 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">{section.subtitle}</span>
                              )}
                            </span>
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 transition group-open/section:rotate-45 dark:text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                          </summary>

                          <div className="min-w-0 px-4 pb-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            {section.content.map((paragraph) => (
                              paragraph.startsWith('http') ? (
                                <a
                                  key={paragraph}
                                  href={paragraph}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 block max-w-full text-[#2F9E41] underline decoration-[#2F9E41]/30 underline-offset-2 [overflow-wrap:anywhere] first:mt-0 hover:decoration-[#2F9E41]"
                                >
                                  {paragraph}
                                </a>
                              ) : (
                                <p key={paragraph} className="mt-2 min-w-0 [overflow-wrap:anywhere] first:mt-0">{paragraph}</p>
                              )
                            ))}

                            {'note' in section && section.note && (
                              <p className="mt-3 rounded-lg border border-[#2F9E41]/20 bg-[#2F9E41]/10 px-3 py-2 text-xs font-medium text-[#2F9E41]">
                                {section.note}
                              </p>
                            )}

                            {'steps' in section && section.steps && (
                              <ol className="mt-3 space-y-2">
                                {section.steps.map((step, index) => (
                                  <li key={step} className="grid grid-cols-[1.5rem_1fr] gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                                      {index + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section id="links-uteis" className="scroll-mt-24 border-t border-zinc-100 py-8 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Links úteis</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
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
