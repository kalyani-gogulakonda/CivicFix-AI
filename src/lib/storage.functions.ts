import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const deleteDemoComplaint = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data }) => {
    // Public by design: all visitors may delete non-sample demo complaints.
    // Authorization is the non-sample predicate inside the server-only helper.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteComplaintAndPhoto } = await import("./complaint-deletion.server");
    await deleteComplaintAndPhoto(supabaseAdmin, data.id);
  });