
ALTER TABLE public.missions DROP CONSTRAINT IF EXISTS missions_type_check;

ALTER TABLE public.missions
  ADD CONSTRAINT missions_type_check CHECK (type IN (
    'forum_votes',
    'comments',
    'forum_replies',
    'topics_created',
    'projects_created',
    'articles_created',
    'projects_with_collaborator'
  ));
