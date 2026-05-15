
DROP POLICY IF EXISTS "Admins can upload event covers" ON storage.objects;
CREATE POLICY "Admins can upload event covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'eventos'
  );

DROP POLICY IF EXISTS "Admins can update event covers" ON storage.objects;
CREATE POLICY "Admins can update event covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'eventos'
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'eventos'
  );

DROP POLICY IF EXISTS "Admins can delete event covers" ON storage.objects;
CREATE POLICY "Admins can delete event covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'eventos'
  );
