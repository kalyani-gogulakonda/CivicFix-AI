import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deleteComplaintAndPhoto } from "@/lib/complaint-deletion.server";

function fixture(deleted: { photo_url: string | null } | null, count = 0, photoError: unknown = null) {
  const remove = vi.fn().mockResolvedValue({ error: photoError });
  const filters = vi.fn().mockReturnThis();
  const deletion = { eq: filters, select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: deleted, error: null }) };
  filters.mockReturnValue(deletion);
  const references = { eq: vi.fn().mockResolvedValue({ count, error: null }) };
  const client = {
    from: vi.fn().mockReturnValue({ delete: () => deletion, select: () => references }),
    storage: { from: vi.fn().mockReturnValue({ remove }) },
  };
  return { client: client as unknown as SupabaseClient<Database>, remove, filters };
}

describe("Public demo coupled photo deletion", () => {
  it("deletes only a non-sample complaint and its database-returned photo", async () => {
    const f = fixture({ photo_url: "stored-photo.png" });
    await deleteComplaintAndPhoto(f.client, "complaint-id");
    expect(f.filters).toHaveBeenCalledWith("id", "complaint-id");
    expect(f.filters).toHaveBeenCalledWith("is_sample", false);
    expect(f.remove).toHaveBeenCalledWith(["stored-photo.png"]);
  });
  it("never deletes a photo when the complaint was not deleted", async () => {
    const f = fixture(null);
    await expect(deleteComplaintAndPhoto(f.client, "sample-id")).rejects.toThrow("read-only example");
    expect(f.remove).not.toHaveBeenCalled();
  });
  it("preserves a photo still attached to another complaint", async () => {
    const f = fixture({ photo_url: "shared-photo.png" }, 1);
    await deleteComplaintAndPhoto(f.client, "complaint-id");
    expect(f.remove).not.toHaveBeenCalled();
  });
  it("deletes a complaint without a photo without touching storage", async () => {
    const f = fixture({ photo_url: null });
    await deleteComplaintAndPhoto(f.client, "complaint-id");
    expect(f.remove).not.toHaveBeenCalled();
  });
  it("reports a failed photo removal instead of claiming complete cleanup", async () => {
    const f = fixture({ photo_url: "photo.png" }, 0, new Error("storage failed"));
    await expect(deleteComplaintAndPhoto(f.client, "complaint-id")).rejects.toThrow("photo could not be removed");
  });
});