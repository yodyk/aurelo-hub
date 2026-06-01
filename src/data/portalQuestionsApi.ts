// ── Portal Q&A API (freelancer side) ────────────────────────────────
import { supabase } from "@/integrations/supabase/client";

export interface PortalQuestion {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId: string | null;
  askedBy: "owner" | "client";
  question: string;
  answer: string | null;
  status: "open" | "answered" | "closed";
  askedAt: string;
  answeredAt: string | null;
  answeredBy: string | null;
}

function mapRow(r: any): PortalQuestion {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    clientId: r.client_id,
    projectId: r.project_id,
    askedBy: r.asked_by,
    question: r.question,
    answer: r.answer,
    status: r.status,
    askedAt: r.asked_at,
    answeredAt: r.answered_at,
    answeredBy: r.answered_by,
  };
}

export async function loadPortalQuestions(clientId: string): Promise<PortalQuestion[]> {
  const { data, error } = await supabase
    .from("portal_questions")
    .select("*")
    .eq("client_id", clientId)
    .order("asked_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function askPortalQuestion(input: {
  workspaceId: string;
  clientId: string;
  projectId?: string | null;
  question: string;
}): Promise<PortalQuestion> {
  const { data, error } = await supabase
    .from("portal_questions")
    .insert({
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      asked_by: "owner",
      question: input.question,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function answerPortalQuestion(id: string, answer: string): Promise<PortalQuestion> {
  const { data, error } = await supabase
    .from("portal_questions")
    .update({
      answer,
      answered_at: new Date().toISOString(),
      answered_by: "owner",
      status: "answered",
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function closePortalQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from("portal_questions")
    .update({ status: "closed" })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePortalQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("portal_questions").delete().eq("id", id);
  if (error) throw error;
}
