-- Change option_id from UUID to TEXT to allow string option IDs like "devines", "shooters", etc.
ALTER TABLE public.move_votes 
ALTER COLUMN option_id TYPE text USING option_id::text;