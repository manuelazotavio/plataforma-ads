export const CURRICULUM_SUBJECTS_TABLE = 'curriculum_subjects'

export type CurriculumSubject = {
  id: string
  semester: number
  name: string
  workload_hours: number | null
  display_order: number
  is_active: boolean
}

export type CurriculumSemester = {
  semester: number
  subjects: {
    name: string
    workload_hours: number | null
  }[]
}

export const DEFAULT_CURRICULUM: CurriculumSemester[] = [
  {
    semester: 1,
    subjects: [
      { name: 'Lógica de Programação', workload_hours: null },
      { name: 'Algoritmos e Estruturas de Dados', workload_hours: null },
      { name: 'Matemática Discreta', workload_hours: null },
      { name: 'Inglês Técnico', workload_hours: null },
      { name: 'Comunicação e Expressão', workload_hours: null },
      { name: 'Fundamentos de TI', workload_hours: null },
    ],
  },
  {
    semester: 2,
    subjects: [
      { name: 'Programação Orientada a Objetos', workload_hours: null },
      { name: 'Banco de Dados I', workload_hours: null },
      { name: 'Redes de Computadores', workload_hours: null },
      { name: 'Sistemas Operacionais', workload_hours: null },
      { name: 'Engenharia de Software I', workload_hours: null },
    ],
  },
  {
    semester: 3,
    subjects: [
      { name: 'Desenvolvimento Web Front-end', workload_hours: null },
      { name: 'Banco de Dados II', workload_hours: null },
      { name: 'Padrões de Projeto', workload_hours: null },
      { name: 'Segurança da Informação', workload_hours: null },
      { name: 'Engenharia de Software II', workload_hours: null },
    ],
  },
  {
    semester: 4,
    subjects: [
      { name: 'Desenvolvimento Web Back-end', workload_hours: null },
      { name: 'Desenvolvimento Mobile', workload_hours: null },
      { name: 'Cloud Computing', workload_hours: null },
      { name: 'Inteligência Artificial', workload_hours: null },
      { name: 'Gestão de Projetos', workload_hours: null },
    ],
  },
  {
    semester: 5,
    subjects: [
      { name: 'DevOps e CI/CD', workload_hours: null },
      { name: 'Ciência de Dados', workload_hours: null },
      { name: 'Empreendedorismo em TI', workload_hours: null },
      { name: 'Projeto Integrador I', workload_hours: null },
      { name: 'Estágio Supervisionado I', workload_hours: null },
    ],
  },
  {
    semester: 6,
    subjects: [
      { name: 'Tópicos Avançados em TI', workload_hours: null },
      { name: 'Projeto Integrador II', workload_hours: null },
      { name: 'Estágio Supervisionado II', workload_hours: null },
      { name: 'Trabalho de Conclusão de Curso', workload_hours: null },
    ],
  },
]

export const curriculumTableSql = `create table if not exists public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  semester integer not null check (semester between 1 and 12),
  name text not null,
  workload_hours numeric(7,2),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.curriculum_subjects
alter column workload_hours type numeric(7,2)
using workload_hours::numeric;

alter table public.curriculum_subjects enable row level security;

create policy "Anyone can read curriculum subjects"
on public.curriculum_subjects for select
using (true);

create policy "Admins can manage curriculum subjects"
on public.curriculum_subjects for all
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
);`

export function groupCurriculumSubjects(subjects: CurriculumSubject[]): CurriculumSemester[] {
  const bySemester = new Map<number, CurriculumSemester>()

  for (const subject of subjects) {
    if (!bySemester.has(subject.semester)) {
      bySemester.set(subject.semester, { semester: subject.semester, subjects: [] })
    }

    bySemester.get(subject.semester)!.subjects.push({
      name: subject.name,
      workload_hours: subject.workload_hours,
    })
  }

  return Array.from(bySemester.values()).sort((a, b) => a.semester - b.semester)
}

export function parseWorkloadHours(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null

  const workload = Number(normalized)
  return Number.isFinite(workload) ? workload : Number.NaN
}

export function formatWorkloadHours(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value)
}
