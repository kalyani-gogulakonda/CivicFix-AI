import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReportFlow } from "@/components/civic/ReportFlow";
import { Badge, Btn, Card } from "@/components/civic/ui";
import { categoryLabel, type Complaint } from "@/lib/complaint-types";
import { loadComplaints, saveComplaints } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicFix AI — Smart Civic Complaint Assistant" },
      { name: "description", content: "Turn potholes, garbage, broken streetlights and leaks into clear, professional complaints with AI." },
      { property: "og:title", content: "CivicFix AI — Smart Civic Complaint Assistant" },
      { property: "og:description", content: "Write clear civic complaints with an AI assistant. Review, edit and keep your drafts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [list, setList] = useState<Complaint[] | null>(null);
  const [mode, setMode] = useState<"home" | "report">("home");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setList(loadComplaints()), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function update(next: Complaint[]) {
    setList(next);
    saveComplaints(next);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button onClick={() => setMode("home")} className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">✓</span>
            CivicFix <span className="text-primary">AI</span>
          </button>
          <Badge>Demo data only</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {toast && <div role="status" className="mb-6 rounded-lg bg-accent p-3 text-sm font-medium text-accent-foreground">{toast}</div>}

        {mode === "report" ? (
          <ReportFlow
            onCancel={() => setMode("home")}
            onSave={(c) => {
              update([c, ...(list ?? [])]);
              setMode("home");
              setToast(`Saved as ${c.status === "ready" ? "Ready to Submit" : "Draft"}. It has not been sent to any authority.`);
            }}
          />
        ) : (
          <>
            <section className="rounded-2xl bg-navy p-6 text-navy-foreground sm:p-8">
              <h1 className="text-3xl font-bold sm:text-4xl">Report it clearly. Get it fixed faster.</h1>
              <p className="mt-3 max-w-xl text-navy-foreground/80">
                Describe a pothole, overflowing bin, broken streetlight or water leak. Our AI assistant turns it into a clear, professional complaint you can review and send to your municipality yourself.
              </p>
              <Btn className="mt-6" onClick={() => setMode("report")}>+ Report an Issue</Btn>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-bold">Your complaints</h2>
              {list === null ? (
                <div className="mt-4 space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
              ) : list.length === 0 ? (
                <Card className="mt-4 text-center">
                  <p className="font-semibold">No complaints yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Report your first issue to get started.</p>
                </Card>
              ) : (
                <ul className="mt-4 space-y-3">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Card className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{categoryLabel(c.category)}</p>
                            <p className="truncate text-sm text-muted-foreground">{c.location}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.status === "ready" ? <Badge tone="green">Ready to Submit</Badge> : <Badge>Draft</Badge>}
                            <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-1">
                          <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide" : "View"}</Btn>
                          {c.status === "draft" && <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => update(list.map((x) => (x.id === c.id ? { ...x, status: "ready" } : x)))}>Mark Ready</Btn>}
                          <Btn variant="danger" className="px-2 py-1 text-xs" onClick={() => confirm("Delete this complaint?") && update(list.filter((x) => x.id !== c.id))}>Delete</Btn>
                        </div>
                        {open === c.id && (
                          <div className="mt-3 space-y-3 border-t border-border pt-3">
                            {c.photo && <img src={c.photo} alt="Issue" className="h-32 rounded-lg object-cover" />}
                            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm">{c.text}</pre>
                            <Btn variant="outline" className="text-xs" onClick={() => navigator.clipboard.writeText(c.text).then(() => setToast("Copied to clipboard."))}>Copy text</Btn>
                          </div>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted-foreground">
        CivicFix AI helps you write complaints. It does not submit them to, or represent, any government body.
      </footer>
    </div>
  );
}
