-- Create storage bucket for party photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-photos', 'party-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to party-photos bucket
CREATE POLICY "Authenticated users can upload party photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'party-photos');

-- Allow anyone to view party photos
CREATE POLICY "Anyone can view party photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'party-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own party photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'party-photos' AND auth.uid()::text = (storage.foldername(name))[1]);