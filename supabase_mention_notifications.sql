
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('comment','reply','comment_reply','reaction','comment_reaction','mention','event_reminder'));

CREATE UNIQUE INDEX IF NOT EXISTS notifications_mention_dedup_idx
  ON public.notifications (actor_id, user_id, type, target_type, target_id)
  WHERE type = 'mention';

CREATE OR REPLACE FUNCTION create_mention_notifications(
  p_content    text,
  p_actor_id   uuid,
  p_target_type text,
  p_target_id  uuid,
  p_target_title text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
BEGIN
  FOR v_uid IN
    SELECT DISTINCT (regexp_matches(p_content, '@\[[^\]]+\]\(([a-f0-9-]{36})\)', 'g'))[1]::uuid
  LOOP
    -- skip self-mentions
    IF v_uid IS DISTINCT FROM p_actor_id THEN
      INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, target_title)
      VALUES (v_uid, p_actor_id, 'mention', p_target_type, p_target_id, p_target_title)
      ON CONFLICT (actor_id, user_id, type, target_type, target_id)
        WHERE type = 'mention' DO NOTHING;
    END IF;
  END LOOP;
END; $$;

-- 4. Triggers

-- Forum topics (mention in topic body)
CREATE OR REPLACE FUNCTION notify_mention_forum_topic()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM create_mention_notifications(NEW.content, NEW.user_id, 'forum_topic', NEW.id, NEW.title);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mention_forum_topic ON forum_topics;
CREATE TRIGGER trg_mention_forum_topic
  AFTER INSERT ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION notify_mention_forum_topic();


CREATE OR REPLACE FUNCTION notify_mention_forum_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM forum_topics WHERE id = NEW.topic_id;
  PERFORM create_mention_notifications(NEW.content, NEW.user_id, 'forum_topic', NEW.topic_id, v_title);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mention_forum_reply ON forum_replies;
CREATE TRIGGER trg_mention_forum_reply
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION notify_mention_forum_reply();

CREATE OR REPLACE FUNCTION notify_mention_article_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM articles WHERE id = NEW.article_id;
  PERFORM create_mention_notifications(NEW.content, NEW.user_id, 'article', NEW.article_id, v_title);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mention_article_comment ON article_comments;
CREATE TRIGGER trg_mention_article_comment
  AFTER INSERT ON article_comments
  FOR EACH ROW EXECUTE FUNCTION notify_mention_article_comment();

CREATE OR REPLACE FUNCTION notify_mention_project_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM projects WHERE id = NEW.project_id;
  PERFORM create_mention_notifications(NEW.content, NEW.user_id, 'project', NEW.project_id, v_title);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mention_project_comment ON project_comments;
CREATE TRIGGER trg_mention_project_comment
  AFTER INSERT ON project_comments
  FOR EACH ROW EXECUTE FUNCTION notify_mention_project_comment();
