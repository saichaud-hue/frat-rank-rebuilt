-- Create table for party attendance/RSVP
CREATE TABLE public.party_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_going BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.party_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for party attendance
CREATE POLICY "Anyone can view attendance counts" 
ON public.party_attendance 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create their own attendance" 
ON public.party_attendance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" 
ON public.party_attendance 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attendance" 
ON public.party_attendance 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_party_attendance_updated_at
BEFORE UPDATE ON public.party_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();