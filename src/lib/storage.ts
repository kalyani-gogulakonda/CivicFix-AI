import { supabase } from "@/integrations/supabase/client";
import type { Complaint, Status } from "./complaint-types";

const BUCKET = "complaint-photos";

type Row = {
  id: string; category: string; location: string; description: string; photo_url: string | null;
  language: string; summary: string; missing_info: unknown; urgency: string; urgency_reason: string;
  photo_observations: string; complaint_text: string; status: string; is_sample: boolean;
  created_at: string; updated_at: string;
};

function fromRow(r: Row): Complaint {
  return {
    id: r.id,
    category: r.category as Complaint["category"],
    location: r.location,
    description: r.description,
    photoPath: r.photo_url,
    language: r.language as Complaint["language"],
    summary: r.summary,
    missingInfo: Array.isArray(r.missing_info) ? (r.missing_info as string[]) : [],
    urgency: r.urgency as Complaint["urgency"],
    urgencyReason: r.urgency_reason,
    photoObservations: r.photo_observations,
    text: r.complaint_text,
    status: r.status as Status,
    isSample: r.is_sample,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase.from("complaints").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load complaints.");
  return (data as Row[]).map(fromRow);
}

export async function uploadPhoto(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error("Photo upload failed.");
  return path;
}

export async function photoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function createComplaint(c: Omit<Complaint, "id" | "createdAt" | "updatedAt" | "isSample">) {
  const { error } = await supabase.from("complaints").insert({
    category: c.category, location: c.location, description: c.description, photo_url: c.photoPath,
    language: c.language, summary: c.summary, missing_info: c.missingInfo, urgency: c.urgency,
    urgency_reason: c.urgencyReason, photo_observations: c.photoObservations, complaint_text: c.text, status: c.status,
  });
  if (error) throw new Error("Could not save the complaint.");
}

export async function updateComplaint(id: string, patch: { status?: Status; text?: string }) {
  const { error } = await supabase
    .from("complaints")
    .update({ ...(patch.status && { status: patch.status }), ...(patch.text !== undefined && { complaint_text: patch.text }) })
    .eq("id", id);
  if (error) throw new Error("Could not update the complaint.");
}

export async function deleteComplaint(c: Complaint) {
  const { error } = await supabase.from("complaints").delete().eq("id", c.id);
  if (error) throw new Error("Could not delete the complaint.");
  if (c.photoPath) await supabase.storage.from(BUCKET).remove([c.photoPath]);
}
