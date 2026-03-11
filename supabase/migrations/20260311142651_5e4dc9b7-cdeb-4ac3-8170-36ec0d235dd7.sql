
-- Add is_approved column to workspaces (existing workspaces are auto-approved)
ALTER TABLE public.workspaces ADD COLUMN is_approved boolean NOT NULL DEFAULT true;
