alter table public.curriculum_subjects
alter column workload_hours type numeric(7,2)
using workload_hours::numeric;
