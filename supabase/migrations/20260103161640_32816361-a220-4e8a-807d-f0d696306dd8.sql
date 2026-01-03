-- Create storage bucket for party cover photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-covers', 'party-covers', true);

-- Allow anyone to view party cover photos (public bucket)
CREATE POLICY "Anyone can view party covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'party-covers');

-- Allow authenticated users to upload party cover photos
CREATE POLICY "Authenticated users can upload party covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'party-covers' AND auth.uid() IS NOT NULL);

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own party covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'party-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own party covers"
ON storage.objects
FOR DELETE
USING (bucket_id = 'party-covers' AND auth.uid()::text = (storage.foldername(name))[1]);