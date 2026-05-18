export const COURSE_SETTINGS_TABLE = 'course_settings'
export const COURSE_DOCUMENTS_BUCKET = 'course-documents'
export const CLASS_SCHEDULE_PDF_KEY = 'class_schedule_pdf_url'
export const PEDAGOGICAL_PROJECT_PDF_KEY = 'pedagogical_project_pdf_url'
export const COURSE_DESCRIPTION_KEY = 'course_description'
export const COURSE_INFO_CARDS_KEY = 'course_info_cards'
export const COURSE_LEARNING_ITEMS_KEY = 'course_learning_items'

export type InfoCard = { label: string; value: string }

export const DEFAULT_COURSE_DESCRIPTION =
  'O curso Tecnológico em Análise e Desenvolvimento de Sistemas (ADS) forma profissionais capazes de desenvolver, implantar e manter sistemas computacionais. Com foco em soluções práticas e inovadoras, o curso prepara os alunos para o mercado de trabalho em todas as etapas do ciclo de desenvolvimento de software.'

export const DEFAULT_INFO_CARDS: InfoCard[] = [
  { label: 'Duração', value: '3 anos (6 semestres)' },
  { label: 'Modalidade', value: 'Presencial' },
  { label: 'Turno', value: 'Noturno' },
  { label: 'Grau', value: 'Tecnólogo' },
]

export const DEFAULT_LEARNING_ITEMS: string[] = [
  'Desenvolvimento web e mobile',
  'Banco de dados e modelagem de dados',
  'Engenharia e qualidade de software',
  'Redes e infraestrutura de TI',
  'Inteligência artificial e ciência de dados',
  'Empreendedorismo e gestão de projetos',
]

export type CourseSetting = {
  key: string
  value: string | null
  updated_at: string
}

export const courseSettingsSql = `create table if not exists public.course_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.course_settings enable row level security;

drop policy if exists "Anyone can read course settings" on public.course_settings;
create policy "Anyone can read course settings"
on public.course_settings for select
using (true);

drop policy if exists "Admins can manage course settings" on public.course_settings;
create policy "Admins can manage course settings"
on public.course_settings for all
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

insert into storage.buckets (id, name, public)
values ('course-documents', 'course-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read course documents" on storage.objects;
create policy "Anyone can read course documents"
on storage.objects for select
using (bucket_id = 'course-documents');

drop policy if exists "Admins can upload course documents" on storage.objects;
create policy "Admins can upload course documents"
on storage.objects for insert
with check (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can update course documents" on storage.objects;
create policy "Admins can update course documents"
on storage.objects for update
using (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "Admins can delete course documents" on storage.objects;
create policy "Admins can delete course documents"
on storage.objects for delete
using (
  bucket_id = 'course-documents'
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
    and users.role = 'admin'
  )
);`
