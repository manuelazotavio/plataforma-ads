
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id    uuid          REFERENCES public.users(id) ON DELETE SET NULL,
  type        text NOT NULL CHECK (type IN ('comment','reply','reaction','comment_reaction')),
  target_type text NOT NULL CHECK (target_type IN ('article','project','forum_topic')),
  target_id   uuid NOT NULL,
  target_title text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id, read) WHERE read = false;


CREATE UNIQUE INDEX IF NOT EXISTS notifications_reaction_dedup_idx
  ON public.notifications (actor_id, user_id, type, target_type, target_id)
  WHERE type IN ('reaction', 'comment_reaction');

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


CREATE OR REPLACE FUNCTION notify_on_article_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title  text;
  v_parent_author uuid;
BEGIN
  SELECT user_id, title INTO v_author, v_title FROM articles WHERE id = NEW.article_id;

  IF NEW.parent_id IS NULL THEN
    IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_author, NEW.user_id, 'comment', 'article', NEW.article_id, v_title);
    END IF;
  ELSE
    SELECT user_id INTO v_parent_author FROM article_comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_parent_author, NEW.user_id, 'reply', 'article', NEW.article_id, v_title);
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_article_comment ON article_comments;
CREATE TRIGGER trg_notify_article_comment
  AFTER INSERT ON article_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_article_comment();



CREATE OR REPLACE FUNCTION notify_on_project_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title  text;
  v_parent_author uuid;
BEGIN
  SELECT user_id, title INTO v_author, v_title FROM projects WHERE id = NEW.project_id;

  IF NEW.parent_id IS NULL THEN
    IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_author, NEW.user_id, 'comment', 'project', NEW.project_id, v_title);
    END IF;
  ELSE
    SELECT user_id INTO v_parent_author FROM project_comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_parent_author, NEW.user_id, 'reply', 'project', NEW.project_id, v_title);
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_project_comment ON project_comments;
CREATE TRIGGER trg_notify_project_comment
  AFTER INSERT ON project_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_project_comment();



CREATE OR REPLACE FUNCTION notify_on_article_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title  text;
BEGIN
  SELECT user_id, title INTO v_author, v_title FROM articles WHERE id = NEW.article_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
    VALUES (v_author, NEW.user_id, 'reaction', 'article', NEW.article_id, v_title)
    ON CONFLICT (actor_id, user_id, type, target_type, target_id) WHERE type IN ('reaction','comment_reaction') DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_article_reaction ON article_likes;
CREATE TRIGGER trg_notify_article_reaction
  AFTER INSERT ON article_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_article_reaction();



CREATE OR REPLACE FUNCTION notify_on_project_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title  text;
BEGIN
  SELECT user_id, title INTO v_author, v_title FROM projects WHERE id = NEW.project_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
    VALUES (v_author, NEW.user_id, 'reaction', 'project', NEW.project_id, v_title)
    ON CONFLICT (actor_id, user_id, type, target_type, target_id) WHERE type IN ('reaction','comment_reaction') DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_project_reaction ON project_likes;
CREATE TRIGGER trg_notify_project_reaction
  AFTER INSERT ON project_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_project_reaction();



CREATE OR REPLACE FUNCTION notify_on_article_comment_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comment_author uuid;
  v_article_id     uuid;
  v_title          text;
BEGIN
  SELECT user_id, article_id INTO v_comment_author, v_article_id
    FROM article_comments WHERE id = NEW.comment_id;
  SELECT title INTO v_title FROM articles WHERE id = v_article_id;

  IF v_comment_author IS NOT NULL AND v_comment_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
    VALUES (v_comment_author, NEW.user_id, 'comment_reaction', 'article', v_article_id, v_title)
    ON CONFLICT (actor_id, user_id, type, target_type, target_id) WHERE type IN ('reaction','comment_reaction') DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'article_comment_reactions'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_article_comment_reaction ON article_comment_reactions';
    EXECUTE 'CREATE TRIGGER trg_notify_article_comment_reaction
      AFTER INSERT ON article_comment_reactions
      FOR EACH ROW EXECUTE FUNCTION notify_on_article_comment_reaction()';
  END IF;
END; $$;



CREATE OR REPLACE FUNCTION notify_on_project_comment_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comment_author uuid;
  v_project_id     uuid;
  v_title          text;
BEGIN
  SELECT user_id, project_id INTO v_comment_author, v_project_id
    FROM project_comments WHERE id = NEW.comment_id;
  SELECT title INTO v_title FROM projects WHERE id = v_project_id;

  IF v_comment_author IS NOT NULL AND v_comment_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
    VALUES (v_comment_author, NEW.user_id, 'comment_reaction', 'project', v_project_id, v_title)
    ON CONFLICT (actor_id, user_id, type, target_type, target_id) WHERE type IN ('reaction','comment_reaction') DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_comment_reactions'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_project_comment_reaction ON project_comment_reactions';
    EXECUTE 'CREATE TRIGGER trg_notify_project_comment_reaction
      AFTER INSERT ON project_comment_reactions
      FOR EACH ROW EXECUTE FUNCTION notify_on_project_comment_reaction()';
  END IF;
END; $$;



CREATE OR REPLACE FUNCTION notify_on_forum_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_topic_author  uuid;
  v_topic_title   text;
  v_parent_author uuid;
BEGIN
  SELECT user_id, title INTO v_topic_author, v_topic_title
    FROM forum_topics WHERE id = NEW.topic_id;

  IF NEW.parent_id IS NULL THEN
    IF v_topic_author IS NOT NULL AND v_topic_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_topic_author, NEW.user_id, 'reply', 'forum_topic', NEW.topic_id, v_topic_title);
    END IF;
  ELSE
    SELECT user_id INTO v_parent_author FROM forum_replies WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_parent_author, NEW.user_id, 'reply', 'forum_topic', NEW.topic_id, v_topic_title);
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_forum_reply ON forum_replies;
CREATE TRIGGER trg_notify_forum_reply
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION notify_on_forum_reply();
