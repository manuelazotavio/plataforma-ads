ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS semester_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS semester_confirmation_snoozed_until timestamptz;

UPDATE public.users
SET semester_confirmed_at = COALESCE(updated_at, created_at, now())
WHERE semester IS NOT NULL
  AND semester_confirmed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_semester_confirmed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.semester IS NOT NULL AND NEW.semester_confirmed_at IS NULL THEN
      NEW.semester_confirmed_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.semester IS DISTINCT FROM OLD.semester THEN
    NEW.semester_confirmed_at := now();
    NEW.semester_confirmation_snoozed_until := NULL;
  ELSIF NEW.semester IS NOT NULL AND NEW.semester_confirmed_at IS NULL THEN
    NEW.semester_confirmed_at := now();
  END IF;

  IF NEW.semester IS NULL THEN
    NEW.semester_confirmed_at := NULL;
    NEW.semester_confirmation_snoozed_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_semester_confirmed_at ON public.users;
CREATE TRIGGER trg_set_semester_confirmed_at
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_semester_confirmed_at();
