import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// This public demo deliberately allows deleting non-sample complaints.
// The caller supplies only an ID: never trust a client-supplied photo path.
export async function deleteComplaintAndPhoto(client: SupabaseClient<Database>, id: string) {
  const { data: deleted, error } = await client.from("complaints")
    .delete().eq("id", id).eq("is_sample", false).select("photo_url").maybeSingle();
  if (error) throw new Error("Could not delete the complaint.");
  if (!deleted) throw new Error("Complaint not found or is a read-only example.");
  if (!deleted.photo_url) return;

  // Never remove a file still used by another complaint, including the sample.
  const { count, error: referenceError } = await client.from("complaints")
    .select("id", { count: "exact", head: true }).eq("photo_url", deleted.photo_url);
  if (referenceError) throw new Error("Complaint deleted, but photo cleanup could not be checked.");
  if (count !== 0) return;
  const { error: photoError } = await client.storage.from("complaint-photos").remove([deleted.photo_url]);
  if (photoError) throw new Error("Complaint deleted, but its photo could not be removed.");
}