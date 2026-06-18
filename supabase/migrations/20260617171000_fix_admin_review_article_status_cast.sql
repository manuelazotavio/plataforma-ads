create or replace function public.admin_review_article(
  p_article_id uuid,
  p_status text,
  p_rejection_message text default null
)
returns table (
  status text,
  rejection_message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Apenas administradores podem revisar artigos.';
  end if;

  if p_status not in ('publicado', 'rejeitado') then
    raise exception 'Status de revisão inválido.';
  end if;

  if p_status = 'rejeitado' and nullif(trim(coalesce(p_rejection_message, '')), '') is null then
    raise exception 'Informe o motivo da rejeição.';
  end if;

  return query
  update public.articles
  set
    status = p_status::public.article_status,
    rejection_message = case
      when p_status = 'rejeitado' then trim(p_rejection_message)
      else null
    end,
    published_at = case
      when p_status = 'publicado' then coalesce(published_at, now())
      else null
    end
  where id = p_article_id
  returning articles.status::text, articles.rejection_message;

  if not found then
    raise exception 'Artigo não encontrado.';
  end if;
end;
$$;
