import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateComplaint } from "@/lib/complaint.functions";
import { CATEGORIES, categoryLabel, type AiResult, type Category, type Complaint, type Status } from "@/lib/complaint-types";
import { AiLabel, Badge, Btn, Card, fieldCls } from "./ui";

const priorityTone = { low: "gray", medium: "amber", high: "red" } as const;

export function ReportFlow({ onSave, onCancel }: { onSave: (c: Complaint) => void; onCancel: () => void }) {
  const gen = useServerFn(generateComplaint);
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<Partial<Record<"category" | "location" | "description" | "photo", string>>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);

  function validate() {
    const e: Partial<Record<"category" | "location" | "description" | "photo", string>> = {};
    if (!category) e.category = "Please choose an issue type.";
    if (location.trim().length < 3) e.location = "Please enter a location or nearby landmark.";
    if (description.trim().length < 10) e.description = "Please describe the problem (at least 10 characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function generate() {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      const r = await gen({ data: { category: category as Category, location, description, hasPhoto: !!photo } });
      setAi(r);
      setText(r.draft);
      setReviewed(false);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onPhoto(f?: File) {
    if (!f) return setPhoto(undefined);
    if (f.size > 1_500_000) {
      setErrors((x) => ({ ...x, photo: "Photo must be under 1.5 MB." }));
      return;
    }
    setErrors((x) => ({ ...x, photo: "" }));
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  }

  function save(status: Status) {
    if (!ai) return;
    onSave({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      category: category as Category,
      location: location.trim(),
      description: description.trim(),
      photo,
      status,
      summary: ai.summary,
      priority: ai.priority,
      text,
      aiMode: ai.mode,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold">1. Describe the issue</h2>
        <p className="mt-1 text-sm text-muted-foreground">Please don't include personal details like phone numbers or ID numbers.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="cat" className="mb-1.5 block text-sm font-semibold">Issue type *</label>
            <select id="cat" className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-invalid={!!errors.category}>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category}</p>}
          </div>
          <div>
            <label htmlFor="loc" className="mb-1.5 block text-sm font-semibold">Location or nearby landmark *</label>
            <input id="loc" maxLength={200} className={fieldCls} placeholder="e.g. Corner of Oak St and 3rd Ave, opposite the library" value={location} onChange={(e) => setLocation(e.target.value)} aria-invalid={!!errors.location} />
            {errors.location && <p className="mt-1 text-xs text-destructive">{errors.location}</p>}
          </div>
          <div>
            <label htmlFor="desc" className="mb-1.5 block text-sm font-semibold">Description *</label>
            <textarea id="desc" rows={4} maxLength={2000} className={fieldCls} placeholder="What's wrong, how long it's been there, any safety risk…" value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>
          <div>
            <label htmlFor="photo" className="mb-1.5 block text-sm font-semibold">Photo (optional)</label>
            <input id="photo" type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground" />
            {errors.photo && <p className="mt-1 text-xs text-destructive">{errors.photo}</p>}
            {photo && <img src={photo} alt="Uploaded issue" className="mt-3 h-32 rounded-lg border border-border object-cover" />}
          </div>
        </div>
        {apiError && <div role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{apiError}</div>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Btn onClick={generate} disabled={loading}>
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> Generating…</> : ai ? "Regenerate draft" : "✦ Generate complaint"}
          </Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </Card>

      {ai && (
        <Card className="border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">2. Review & edit</h2>
            <AiLabel demo={ai.mode === "demo"} />
          </div>
          {ai.mode === "demo" && <p className="mt-2 text-xs text-muted-foreground">AI is not available, so this draft was built from a simple template.</p>}
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Classified as</dt><dd className="mt-1 font-medium">{categoryLabel(ai.category)}</dd></div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Suggested priority (for human review)</dt>
              <dd className="mt-1 flex items-center gap-2"><Badge tone={priorityTone[ai.priority]}>{ai.priority}</Badge><span className="text-sm text-muted-foreground">{ai.priorityReason}</span></dd>
            </div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted-foreground">Summary</dt><dd className="mt-1">{ai.summary}</dd></div>
          </dl>
          {ai.missingInfo.length > 0 && (
            <div className="mt-5 rounded-lg bg-warning p-4 text-warning-foreground">
              <p className="text-sm font-semibold">Missing information — consider adding these to the description and regenerating:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{ai.missingInfo.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          <label htmlFor="draft" className="mt-5 mb-1.5 block text-sm font-semibold">Complaint draft (editable)</label>
          <textarea id="draft" rows={12} className={fieldCls + " font-mono leading-relaxed"} value={text} onChange={(e) => setText(e.target.value)} />
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            I have reviewed and edited this AI-generated content and confirm it is accurate.
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn onClick={() => save("ready")} disabled={!reviewed || text.trim().length < 20}>Save as Ready to Submit</Btn>
            <Btn variant="outline" onClick={() => save("draft")} disabled={text.trim().length < 20}>Save as Draft</Btn>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Saving keeps the complaint on this device only. CivicFix AI does not send it to any authority.</p>
        </Card>
      )}
    </div>
  );
}
