-- Add contact_email column to parties table for approval workflow
ALTER TABLE public.parties 
ADD COLUMN IF NOT EXISTS contact_email text;