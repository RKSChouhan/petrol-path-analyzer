-- Add UPDATE policy for user_roles to enable upsert
CREATE POLICY "Users can update their own roles" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);