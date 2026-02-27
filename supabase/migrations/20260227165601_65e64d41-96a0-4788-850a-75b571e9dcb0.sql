
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files', 'client-files', false);

-- Avatars: public read, workspace members can upload/update/delete
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Workspace members can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can update avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can delete avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

-- Logos: public read, workspace members can manage
CREATE POLICY "Logo images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Workspace members can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

-- Client files: private, workspace members only
CREATE POLICY "Workspace members can view client files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-files'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can upload client files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-files'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );

CREATE POLICY "Workspace members can delete client files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-files'
    AND (storage.foldername(name))[1] IN (SELECT get_user_workspace_ids()::text)
  );
