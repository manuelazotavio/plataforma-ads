create table if not exists public.curriculum_subject_plans (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.curriculum_subjects(id) on delete cascade,
  ementa text,
  objectives text,
  content text,
  methodology text,
  evaluation text,
  bibliography_basic text,
  bibliography_complementary text,
  updated_at timestamptz not null default now(),
  unique (subject_id)
);

alter table public.curriculum_subject_plans enable row level security;

create policy "Anyone can read subject plans"
on public.curriculum_subject_plans for select
using (true);

create policy "Admins can manage subject plans"
on public.curriculum_subject_plans for all
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

create table if not exists public.curriculum_subject_professors (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.curriculum_subjects(id) on delete cascade,
  professor_name text not null,
  period text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.curriculum_subject_professors enable row level security;

create policy "Anyone can read subject professors"
on public.curriculum_subject_professors for select
using (true);

create policy "Admins can manage subject professors"
on public.curriculum_subject_professors for all
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
)
with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

alter table public.curriculum_subject_plans
  add column if not exists tipo text,
  add column if not exists n_docentes integer,
  add column if not exists n_aulas_semanais integer,
  add column if not exists total_aulas integer,
  add column if not exists ch_ensino numeric(7,2),
  add column if not exists ch_ead numeric(7,2),
  add column if not exists ch_extensao numeric(7,2),
  add column if not exists ch_total numeric(7,2),
  add column if not exists abordagem_metodologica text,
  add column if not exists usa_laboratorio boolean,
  add column if not exists ch_laboratorio numeric(7,2),
  add column if not exists laboratorio_descricao text,
  add column if not exists nucleo_formacao text,
  add column if not exists grupo_conhecimentos text;

alter table public.curriculum_subject_professors
  add column if not exists professor_id uuid references public.professors(id) on delete set null;
