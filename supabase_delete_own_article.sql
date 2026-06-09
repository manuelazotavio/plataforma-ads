create or replace function public.delete_own_article(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.articles
    where id = p_article_id
      and user_id = auth.uid()
  ) then
    raise exception 'Artigo não encontrado ou sem permissão para excluir';
  end if;

  delete from public.notifications
  where target_type = 'article'
    and target_id = p_article_id;

  delete from public.article_comment_reactions
  where comment_id in (
    select id
    from public.article_comments
    where article_id = p_article_id
  );

  delete from public.article_comments
  where article_id = p_article_id;

  delete from public.article_likes
  where article_id = p_article_id;

  delete from public.article_tags
  where article_id = p_article_id;

  delete from public.articles
  where id = p_article_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_own_article(uuid) from public;
grant execute on function public.delete_own_article(uuid) to authenticated;
