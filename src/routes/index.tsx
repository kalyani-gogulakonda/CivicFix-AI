import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReportFlow } from "@/components/civic/ReportFlow";
import { Badge, Btn, Card, fieldCls } from "@/components/civic/ui";
import { categoryLabel, hasPlaceholders, languageLabel, placeholderBlockMessage, type Complaint, type Status } from "@/lib/complaint-types";
import { deleteComplaint, listComplaints, photoUrl, updateComplaint } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicFix AI — Smart Civic Complaint Assistant" },
      { name: "description", content: "Turn potholes, garbage, broken streetlights and leaks into clear, professional complaints with AI, in English or Telugu." },
      { property: "og:title", content: "CivicFix AI — Smart Civic Complaint Assistant" },
      { property: "og:description", content: "Write clear civic complaints with an AI assistant. Review, edit and keep your drafts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const urgencyTone = { low: "gray", medium: "amber", high: "red" } as const;

function Photo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { photoUrl(path).then(setUrl); }, [path]);
  return url ? <img src={url} alt="Reported issue" className="h-40 rounded-lg object-cover" /> : <div className="h-40 w-56 animate-pulse rounded-lg bg-muted" />;
}

async function downloadPhoto(path: string, name: string) {
  const url = await photoUrl(path);
  if (!url) throw new Error("Could not get the photo link. Please try again.");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download the photo. Please try again.");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Index() {
  const [list, setList] = useState<Complaint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"home" | "report">("home");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [readyTarget, setReadyTarget] = useState<Complaint | null>(null);
  const [readyReviewed, setReadyReviewed] = useState(false);

  function requestReady(c: Complaint) {
    if (hasPlaceholders(c.text)) { setToast(placeholderBlockMessage(c.text)); return; }
    setReadyReviewed(false);
    setReadyTarget(c);
  }

  async function refresh() {
    setLoadError(null);
    try { setList(await listComplaints()); } catch (e) { setLoadError(e instanceof Error ? e.message : "Could not load."); setList([]); }
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function act(id: string, fn: () => Promise<void>, msg: string) {
    setBusy(id);
    try { await fn(); await refresh(); setToast(msg); } catch (e) { setToast(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(null); }
  }
  const setStatus = (c: Complaint, status: Status) => act(c.id, () => updateComplaint(c.id, { status }), status === "ready" ? "Marked Ready to Submit." : "Moved back to Draft.");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button onClick={() => setMode("home")} className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">✓</span>
            CivicFix <span className="text-primary">AI</span>
          </button>
          <Badge tone="amber">Public demo</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div role="note" className="mb-6 rounded-lg border border-border bg-warning p-3 text-sm text-warning-foreground">
          <strong>Public demo — no login.</strong> Saved complaints are visible to anyone using this app. Do not enter real names, phone numbers or home addresses.
        </div>
        {toast && <div role="status" className="mb-6 rounded-lg bg-accent p-3 text-sm font-medium text-accent-foreground">{toast}</div>}

        {mode === "report" ? (
          <ReportFlow
            onCancel={() => setMode("home")}
            onSaved={(status) => {
              setMode("home");
              refresh();
              setToast(`Saved as ${status === "ready" ? "Ready to Submit" : "Draft"}. It has not been sent to any authority.`);
            }}
          />
        ) : (
          <>
            <section className="rounded-2xl bg-navy p-6 text-navy-foreground sm:p-8">
              <h1 className="text-3xl font-bold sm:text-4xl">Turn a street problem into a clear complaint.</h1>
              <p className="mt-3 max-w-xl text-navy-foreground/80">
                Describe a pothole, overflowing bin, broken streetlight or water leak. Our AI assistant turns it into a clear, professional complaint in English or Telugu that you can review and send to your municipality yourself.
              </p>
              <Btn className="mt-6" onClick={() => setMode("report")}>+ Report an Issue</Btn>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-bold">Saved complaints</h2>
              {loadError && <div role="alert" className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{loadError}<Btn variant="outline" className="px-3 py-1.5 text-xs" onClick={refresh}>Retry</Btn></div>}
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
                            <p className="flex flex-wrap items-center gap-2 font-semibold">{categoryLabel(c.category)} {c.isSample && <Badge tone="amber">Fictional sample</Badge>}</p>
                            <p className="truncate text-sm text-muted-foreground">{c.location}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {c.status === "ready" ? <Badge tone="green">Ready to Submit</Badge> : <Badge>Draft</Badge>}
                            {c.status === "ready" && (
                              <>
                                <span className="text-xs text-muted-foreground">You've reviewed this complaint. Copy it and send it to the right authority yourself.</span>
                                <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(c.text).then(() => setToast("Complaint copied. Paste it into an email or portal to the authority."))}>Copy complaint</Btn>
                              </>
                            )}
                            {c.status === "ready" && c.photoPath && (
                              <>
                                <span className="text-xs text-muted-foreground">{/\bphoto\b|ఫోటో|చిత్రం/i.test(c.text) ? "Attach this photo when you submit. The complaint text refers to it." : "Attach this photo when you submit."}</span>
                                <Btn variant="ghost" className="px-2 py-1 text-xs" disabled={busy === c.id} onClick={() => act(c.id, () => downloadPhoto(c.photoPath!, "complaint-photo"), "")}>Download photo</Btn>
                              </>
                            )}
                            <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide" : "View"}</Btn>
                          {!c.isSample && <Btn variant="ghost" className="px-2 py-1 text-xs" disabled={busy === c.id} onClick={() => { setOpen(c.id); setEditing({ id: c.id, text: c.text }); }}>Edit</Btn>}
                          {!c.isSample && c.status === "draft" && <Btn variant="ghost" className="px-2 py-1 text-xs" disabled={busy === c.id} onClick={() => requestReady(c)}>Mark Ready</Btn>}
                          {!c.isSample && c.status === "ready" && <Btn variant="ghost" className="px-2 py-1 text-xs" disabled={busy === c.id} onClick={() => setStatus(c, "draft")}>Back to Draft</Btn>}
                          {c.isSample ? <span className="self-center text-xs text-muted-foreground">Read-only example</span> : <Btn variant="danger" className="px-2 py-1 text-xs" disabled={busy === c.id} onClick={() => confirm("Delete this complaint?") && act(c.id, () => deleteComplaint(c), "Complaint deleted.")}>Delete</Btn>}
                        </div>
                        {open === c.id && (
                          <div className="mt-3 space-y-3 border-t border-border pt-3">
                            {c.photoPath && <Photo path={c.photoPath} />}
                            <p className="text-sm"><span className="font-semibold">Summary:</span> {c.summary}</p>
                            <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">Urgency (AI suggestion — please review):</span> <Badge tone={urgencyTone[c.urgency]}>{c.urgency}</Badge> <span className="text-muted-foreground">{c.urgencyReason}</span></p>
                            <p className="text-sm"><span className="font-semibold">Photo observations:</span> {c.photoObservations}</p>
                            {c.missingInfo.length > 0 && <div className="text-sm"><span className="font-semibold">Missing information:</span><ul className="mt-1 list-disc pl-5">{c.missingInfo.map((m) => <li key={m}>{m}</li>)}</ul></div>}
                            <p className="text-xs text-muted-foreground">Language: {languageLabel(c.language)} · {c.isSample ? "Fictional sample, not AI" : "AI-generated, reviewed by the user"} · Updated {new Date(c.updatedAt).toLocaleString()}</p>
                            {editing?.id === c.id ? (
                              <div>
                                <label htmlFor={`edit-${c.id}`} className="mb-1.5 block text-sm font-semibold">Complaint text</label>
                                <textarea id={`edit-${c.id}`} rows={10} className={fieldCls} value={editing.text} onChange={(e) => setEditing({ id: c.id, text: e.target.value })} />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Btn className="text-xs" disabled={busy === c.id || editing.text.trim().length < 20} onClick={() => act(c.id, () => updateComplaint(c.id, { text: editing.text }), "Changes saved.").then(() => setEditing(null))}>Save changes</Btn>
                                  <Btn variant="ghost" className="text-xs" onClick={() => setEditing(null)}>Cancel</Btn>
                                </div>
                              </div>
                            ) : (
                              <>
                                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm">{c.text}</pre>
                                <Btn variant="outline" className="text-xs" onClick={() => navigator.clipboard.writeText(c.text).then(() => setToast("Copied to clipboard."))}>Copy text</Btn>
                              </>
                            )}
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
      {readyTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="ready-title" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setReadyTarget(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="ready-title" className="text-lg font-bold">Mark as Ready to Submit?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review the complaint text before marking it ready. CivicFix AI does not send it to any authority.</p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={readyReviewed} onChange={(e) => setReadyReviewed(e.target.checked)} />
              I have reviewed and edited this AI-generated content and confirm it is accurate.
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <Btn className="text-xs" disabled={!readyReviewed || busy === readyTarget.id} onClick={() => { const c = readyTarget; setReadyTarget(null); setStatus(c, "ready"); }}>Confirm Ready to Submit</Btn>
              <Btn variant="ghost" className="text-xs" onClick={() => setReadyTarget(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-muted-foreground">
        CivicFix AI helps you write complaints. It does not submit them to, or represent, any government body.
      </footer>
    </div>
  );
}
