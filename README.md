# ADS Conecta

Plataforma comunitária para alunos do curso de Análise e Desenvolvimento de Sistemas (ADS). Centraliza publicação de projetos acadêmicos, artigos, fórum de discussão, eventos, oportunidades de carreira, perfis do corpo docente, egressos e a matriz curricular do curso.

O projeto usa Next.js no frontend e Supabase como backend completo (banco de dados, autenticação, storage de arquivos e funções serverless). Não há servidor próprio, toda a lógica de backend vive no Supabase.

## Docker

O arquivo `compose.yaml` sobe dois serviços:

- `app`: frontend Next.js em modo de produção, disponível em `http://localhost:3000`.
- `backup`: backup diário do banco Supabase com `pg_dump`, salvo localmente e em uma pasta sincronizada pelo OneDrive.

Antes da primeira execução, defina a connection string do banco na sessão do terminal:

```powershell
$env:SUPABASE_DB_URL='postgresql://...'
```

Opcionalmente, altere a pasta do OneDrive e os intervalos:

```powershell
$env:ONEDRIVE_BACKUP_DIR='C:/Users/SEU_USUARIO/OneDrive/ADS Conecta/Backups/Supabase'
$env:BACKUP_INTERVAL_SECONDS='86400'
$env:KEEP_DAYS='14'
```

Depois execute:

```powershell
docker compose up -d --build
```

O serviço de backup executa uma cópia imediatamente ao iniciar e repete no intervalo configurado. Os arquivos ficam em:

- `backups/supabase`
- pasta configurada em `ONEDRIVE_BACKUP_DIR`

Para acompanhar:

```powershell
docker compose logs -f backup
```

---

## Pré-requisitos

- Node.js 18 ou superior
- npm
- Uma conta no [Supabase](https://supabase.com) com um projeto criado (será passado para o responsável do projeto)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Estilização | Tailwind CSS v4 com modo escuro via classe `.dark` |
| Editor de texto | Tiptap (starter kit) |
| Backend / Auth | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Edge Functions | Supabase Functions (Deno runtime) |
| Hospedagem | Vercel (frontend) + Supabase (backend) |

---

## Configuração inicial (do zero)

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd plataforma-ads
```

### 2. Configure as variáveis de ambiente

Crie o arquivo `front/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
```

Essas variáveis são públicas (expostas no browser). A segurança de acesso ao banco é feita via Row Level Security no Supabase, não pela chave.

### 3. Instale as dependências e suba o servidor

```bash
cd front
npm install
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

---

## Estrutura do repositório

```
plataforma-ads/
├── front/                          # Aplicação Next.js
│   ├── app/
│   │   ├── layout.tsx              # Root layout: fonte Inter, script de dark mode.
│   │   ├── page.tsx                # Página inicial pública
│   │   ├── globals.css             # Estilos globais + overrides de dark mode
│   │   ├── login/                  # Formulário de login (email/senha)
│   │   ├── cadastro/               # Registro de nova conta
│   │   ├── onboarding/             # Preenchimento obrigatório de perfil no primeiro acesso
│   │   ├── auth/callback/          # Rota de callback para OAuth (caso habilitado)
│   │   ├── (dashboard)/            # Grupo de rotas protegidas — exige sessão ativa
│   │   │   ├── layout.tsx          # Verifica sessão, redireciona suspensos e sem onboarding
│   │   │   ├── area-aluno/         # Área do aluno (boletim, progresso)
│   │   │   ├── artigos/            # Listagem, criação e leitura de artigos
│   │   │   ├── calendario/         # Calendário acadêmico
│   │   │   ├── contato/            # Formulário de contato (salva em contact_messages)
│   │   │   ├── corpo-docente/      # Listagem de professores
│   │   │   ├── curso/              # Informações do curso + matriz curricular
│   │   │   ├── egressos/           # Diretório de egressos
│   │   │   ├── eventos/[id]/       # Detalhe de evento com curtidas e inscrição
│   │   │   ├── forum/[id]/         # Tópicos de fórum com comentários e respostas
│   │   │   ├── meus-artigos/       # Artigos do usuário autenticado
│   │   │   ├── meus-projetos/      # Projetos do usuário autenticado
│   │   │   ├── perfil/             # Edição de perfil e troca de senha
│   │   │   ├── projetos/           # Listagem e criação de projetos
│   │   │   ├── usuarios/[id]/      # Perfil público de outro usuário
│   │   │   └── vagas/              # Oportunidades de carreira (estágios, bolsas)
│   │   ├── admin/                  # Painel administrativo — exige role = 'admin'
│   │   │   ├── layout.tsx          # Verifica se o usuário é admin; redireciona se não for
│   │   │   ├── artigos/            # Moderação de artigos (aprovar, rejeitar, remover)
│   │   │   ├── corpo-docente/      # Cadastro e gerenciamento de professores
│   │   │   ├── curso/              # Configurações do curso (nome, período, etc.)
│   │   │   ├── egressos/           # Cadastro e edição de egressos
│   │   │   ├── eventos/            # Cadastro e gerenciamento de eventos
│   │   │   │   └── categorias/     # CRUD de categorias de eventos
│   │   │   ├── forum/              # Moderação de tópicos do fórum
│   │   │   ├── matriz-curricular/  # Gerenciamento das disciplinas por semestre
│   │   │   ├── mensagens/          # Mensagens recebidas pelo formulário de contato
│   │   │   ├── niveis/             # Configuração dos níveis de gamificação (XP)
│   │   │   ├── permissoes/         # Gerenciamento de papéis de usuários
│   │   │   ├── projetos/           # Moderação de projetos (aprovar, devolver, remover)
│   │   │   ├── tecnologias/        # Tags de tecnologia disponíveis para projetos
│   │   │   ├── usuarios/           # Lista de usuários, suspensão, edição de role
│   │   │   └── vagas/              # Cadastro e aprovação de vagas
│   │   ├── components/             # Componentes React reutilizáveis (ver seção abaixo)
│   │   └── lib/                    # Funções auxiliares e cliente Supabase
│   │       ├── supabase.ts         # Inicializa o cliente Supabase com as env vars
│   │       ├── auth.ts             # getAuthUser() com retry para evitar falsos 401
│   │       ├── authRedirect.ts     # Helpers de redirecionamento pós-login
│   │       ├── curriculum.ts       # Dados e tipos da matriz curricular
│   │       ├── courseSettings.ts   # Queries de configurações do curso
│   │       ├── files.ts            # Upload e remoção de arquivos no Storage
│   │       └── projectTags.ts      # Queries de tags de projetos
│   ├── next.config.ts              # Permite imagens do Supabase Storage
│   └── package.json
├── supabase/
│   └── functions/                  # Edge Functions (Deno)
│       ├── send-job-notifications/ # Disparo de e-mails para inscritos em vagas
│       ├── create-professor-user/  # Criação de conta para professores
│       └── delete-user/            # Remoção completa de usuário
└── supabase_*.sql                  # Scripts de migração do banco (executar no SQL Editor)
```

---

## Como o sistema funciona

### Autenticação

O Supabase Auth gerencia login, registro e sessão. O cliente é inicializado com a anon key em `front/app/lib/supabase.ts`. Não existe middleware Next.js — cada `layout.tsx` de grupo de rotas chama `supabase.auth.getUser()` e redireciona para `/login` se não houver sessão.

Dois estados especiais são tratados antes de dar acesso ao dashboard:
- **Usuário suspenso**: redirecionado com `?suspended=1` e impedido de prosseguir
- **Onboarding incompleto**: redirecionado para `/onboarding` até preencher nome, semestre e foto

### Papéis de usuário

O campo `role` na tabela `users` controla o nível de acesso:

| Role | O que pode fazer |
|---|---|
| `student` | Acessar o dashboard, criar projetos e artigos, participar do fórum |
| `professor` | Mesmo que student, mais perfil docente visível na página do curso |
| `admin` | Tudo que student/professor fazem, mais acesso ao painel `/admin` |

Para tornar um usuário admin, atualize diretamente no banco:
```sql
UPDATE users SET role = 'admin' WHERE email = 'email@exemplo.com';
```

### Segurança (Row Level Security)

Toda a segurança de dados vive no banco via RLS. O padrão aplicado é:
- Conteúdo publicado (artigos, projetos, eventos, vagas ativas) é lido publicamente
- Rascunhos e dados pessoais só são acessados pelo dono
- Operações de escrita exigem que `auth.uid()` corresponda ao `user_id` do registro
- Admins têm políticas separadas que permitem operar sobre registros alheios
- Arquivos no Storage são restritos por pasta (`usuarios/`, `professores/`, `egressos/`, `eventos/`)

### Fluxo de conteúdo moderado

Projetos e artigos passam por aprovação antes de ficarem visíveis publicamente. O fluxo é:

```
Aluno cria conteúdo -> status: 'pendente'
Admin aprova         -> status: 'aprovado' (visível publicamente)
Admin devolve        -> status: 'pendente' (volta para revisão)
Admin reprova        -> status: 'reprovado'
```

Vagas seguem um fluxo similar com o campo `is_active`.

### Dark mode

O tema é aplicado adicionando a classe `dark` ao elemento `<html>`. Um script inline no `layout.tsx` raiz lê o `localStorage` e aplica a classe antes do React hidratar, evitando flash de tema errado. O `suppressHydrationWarning` está no `<html>` para evitar erro de hidratação causado por essa diferença entre server e client.

---

## Banco de dados

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `users` | Perfis sincronizados com `auth.users`. Contém role, semestre, avatar, onboarding |
| `articles` / `article_tags` / `article_likes` | Artigos com tags e reações |
| `projects` / `project_tags` / `project_likes` | Projetos com tags e reações |
| `project_collaborators` | Colaboradores de projetos — pode ser usuário registrado ou externo (só nome) |
| `forum_topics` | Tópicos do fórum com comentários e respostas aninhadas |
| `events` / `event_categories` / `event_likes` | Eventos com categorias parametrizáveis pelo admin |
| `jobs` / `job_tags` | Oportunidades de carreira com tags |
| `job_notification_subscriptions` | Usuários que optaram por receber alertas de novas vagas por e-mail |
| `job_notification_emails_sent` | Log de e-mails enviados — evita reenvio para a mesma vaga |
| `professors` | Perfis do corpo docente vinculados a `users` |
| `egressos` | Perfis de ex-alunos |
| `notifications` | Notificações geradas por comentários, respostas e reações |
| `levels` | Configuração dos 6 níveis de gamificação com threshold de XP |
| `curriculum_subjects` | Disciplinas da matriz curricular com semestre, carga horária e ordem |
| `course_settings` | Configurações globais do curso exibidas na página `/curso` |
| `contact_messages` | Mensagens enviadas pelo formulário de contato em `/contato` |

### Observação sobre a tabela `users`

O Supabase possui `auth.users` (gerenciado internamente) e uma tabela pública `users` no schema `public`. A tabela `users` é criada pelo projeto e sincronizada com `auth.users` via trigger ou manualmente. O campo `id` em `users` é o mesmo UUID do `auth.users`.

---

## Edge Functions

As Edge Functions ficam em `supabase/functions/` e rodam no runtime Deno do Supabase. Para deployá-las, use o Supabase CLI:

```bash
supabase functions deploy send-job-notifications
supabase functions deploy create-professor-user
supabase functions deploy delete-user
```

Todas requerem que o usuário autenticado tenha `role = 'admin'`.

### `send-job-notifications`
Chamada pelo painel admin ao aprovar uma vaga. Busca todos os usuários com inscrição ativa, verifica quais ainda não receberam e-mail para aquela vaga, envia os e-mails e registra em `job_notification_emails_sent`.

```ts
supabase.functions.invoke('send-job-notifications', { body: { job_id: 'uuid' } })
```

### `create-professor-user`
Cria uma conta de autenticação + perfil `users` com `role = 'professor'`, vinculando ao registro em `professors`. Se a criação do perfil falhar, o usuário de auth é removido para evitar conta órfã.

```ts
supabase.functions.invoke('create-professor-user', {
  body: { professor_id: 'uuid', email: 'prof@email.com', password: 'senha' }
})
```

### `delete-user`
Remove o usuário da tabela `auth.users`, o que em cascata remove o perfil em `users` e todos os dados vinculados via `ON DELETE CASCADE`. Não permite que um admin se auto-exclua.

```ts
supabase.functions.invoke('delete-user', { body: { user_id: 'uuid' } })
```

---

## Componentes reutilizáveis

Todos os componentes ficam em `front/app/components/`. São Client Components (`'use client'`) salvo exceção.

| Componente | Descrição |
|---|---|
| `AppSidebar` | Barra lateral do dashboard com navegação, avatar e menu do usuário |
| `Select` | Dropdown customizado com posicionamento `fixed` para não ser cortado por overflow |
| `DatePicker` | Seletor de data com máscara DD/MM/YYYY, validação e calendário sincronizado |
| `LikeButton` | Reações (curtidas com picker de emoji) para projetos, artigos e eventos |
| `Comments` | Sistema de comentários e respostas aninhadas com paginação |
| `RichTextEditor` | Editor Tiptap encapsulado com placeholder e serialização HTML |
| `NotificationBell` | Sino com badge de contagem; usa Supabase Realtime para atualização ao vivo |
| `ThemeToggle` | Alterna entre tema claro e escuro, persiste em `localStorage` |
| `UserAvatar` | Foto de perfil com fallback para iniciais do nome |
| `TechnologyTagPicker` | Campo de seleção múltipla de tags com busca |
| `ProjectForm` | Formulário completo de criação/edição de projeto |
| `ProjectMediaMosaic` | Grade de imagens/vídeos do projeto com suporte a galeria |
| `ShareProjectButton` | Compartilhamento via Web Share API com fallback para copiar link |
| `JobNotificationSubscribeButton` | Botão de inscrição/cancelamento em alertas de vagas |
| `HomeShell` | Shell da página inicial com feed e cards |
| `HomeCalendarCard` | Card de próximos eventos para a home |
| `ProfileActivityFeed` | Feed de atividade recente no perfil do usuário |
| `SearchBar` | Barra de busca global |
| `PublicAuthControls` | Botões de login/cadastro para usuários não autenticados |

---

## Deploy

### Frontend (Vercel)

O frontend já esta deployado na vercel. O acesso será repassado ao administrador do projeto e todo commit na branch main feito na conta do github vinculada ao vercel será automaticamente deployado para produção.

### Backend (Supabase)

O banco já está em produção ao criar o projeto Supabase. Para as Edge Functions:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-id>
supabase functions deploy --no-verify-jwt
```

---

## Scripts disponíveis

Executar a partir da pasta `front/`:

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `localhost:3000` |
| `npm run build` | Build de produção |
| `npm run start` | Inicia o servidor de produção (após build) |
| `npm run lint` | Executa ESLint |
