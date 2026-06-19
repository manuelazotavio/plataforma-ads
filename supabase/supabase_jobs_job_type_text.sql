
alter table public.jobs
alter column job_type type text
using job_type::text;

alter table public.jobs
alter column job_type drop not null;
