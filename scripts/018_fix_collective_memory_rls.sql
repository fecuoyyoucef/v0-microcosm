-- Add INSERT policy for collective_memory table
-- Members can create memory summaries for their groups

CREATE POLICY "Members can insert group memory"
ON public.collective_memory
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = collective_memory.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Add UPDATE policy for collective_memory table  
-- Members can update memory summaries for their groups

CREATE POLICY "Members can update group memory"
ON public.collective_memory
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = collective_memory.group_id
    AND group_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = collective_memory.group_id
    AND group_members.user_id = auth.uid()
  )
);
