import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateComplaint } from "@/lib/complaint.functions";
import { createComplaint, uploadPhoto } from "@/lib/storage";
import { CATEGORIES, LANGUAGES, categoryLabel, type AiResult, type Category, type Language, type Status } from "@/lib/complaint-types";
import { AiLabel, Badge, Btn, Card, fieldCls } from "./ui";

const urgencyTone = { low: "gray", medium: "amber", high: "red" } as const;
type FieldErr = Partial<Record<"category" | "location" | "description" | "photo", string>>;

export function ReportFlow({ onSaved, onCancel }: { onSaved: (status: Status) => void; onCancel: () => void }) {
  const gen = useServerFn(generateComplaint);
  const [category, setCategory] = useState<Category | "">("");
  const [language, setLanguage] = useState<Language>("en");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<FieldErr>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errSource, setErrSource] = useState<"gen" | "save">("gen");
  const [ai, setAi] = useState<AiResult | null>(null);
  const [finalCategory, setFinalCategory] = useState<Category | null>(null);
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);

  function validate() {
    const e: FieldErr = {};
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
      const r = await gen({ data: { category: category as Category, location, description, language, photo } });
      if (!r.ok) {
        setApiError(r.error);
        setErrSource("gen");
        return;
      }
      setAi(r.result);
      setFinalCategory(r.result.categoryMatches ? (category as Category) : null);
      setText(r.result.complaintText);
      setReviewed(false);
    } catch {
      setErrSource("gen");
      setApiError("Could not reach the AI service. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  function onPhoto(f?: File) {
    setPhotoFile(undefined);
    setPhoto(undefined);
    if (!f) return;
    if (f.size > 4_000_000) return setErrors((x) => ({ ...x, photo: "Photo must be under 4 MB." }));
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) return setErrors((x) => ({ ...x, photo: "Please use a JPG, PNG, WebP or GIF image." }));
    setErrors((x) => ({ ...x, photo: "" }));
    setPhotoFile(f);
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  }

  async function save(status: Status) {
    if (!ai || !finalCategory) return;
    setSaving(true);
    setApiError(null);
    try {
      const photoPath = photoFile ? await uploadPhoto(photoFile) : null;
      await createComplaint({
        category: finalCategory,
        location: location.trim(),
        description: description.trim(),
        photoPath,
        language,
        summary: ai.summary,
        missingInfo: ai.missingInfo,
        urgency: ai.urgency,
        urgencyReason: ai.urgencyReason,
        photoObservations: ai.photoObservations,
        text,
        status,
      });
      onSaved(status);
    } catch (e) {
      setErrSource("save");
      setApiError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold">1. Describe the issue</h2>
        <p className="mt-1 text-sm text-muted-foreground">Public demo: don't include real names, phone numbers or home addresses.</p>
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cat" className="mb-1.5 block text-sm font-semibold">Issue type *</label>
              <select id="cat" className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-invalid={!!errors.category}>
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category}</p>}
            </div>
            <div>
              <label htmlFor="lang" className="mb-1.5 block text-sm font-semibold">Complaint language</label>
              <select id="lang" className={fieldCls} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
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
            <input id="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onPhoto(e.target.files?.[0])} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground" />
            {errors.photo && <p className="mt-1 text-xs text-destructive">{errors.photo}</p>}
            {photo && <img src={photo} alt="Uploaded issue" className="mt-3 h-32 rounded-lg border border-border object-cover" />}
          </div>
        </div>
        {apiError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <span>{apiError}</span>
            <Btn variant="outline" className="px-3 py-1.5 text-xs" onClick={errSource === "gen" ? generate : () => setApiError(null)} disabled={loading}>
              {errSource === "gen" ? "Retry" : "Dismiss"}
            </Btn>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Btn onClick={generate} disabled={loading || saving}>
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> Analysing…</> : ai ? "Regenerate draft" : "✦ Generate complaint"}
          </Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </Card>

      {ai && (
        <Card className="border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">2. Review & edit</h2>
            <AiLabel demo={false} />
          </div>

          {!ai.categoryMatches && (
            <div className="mt-5 rounded-lg bg-warning p-4 text-warning-foreground">
              <p className="text-sm font-semibold">The AI thinks this may be a different issue type. Which should we use?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[category as Category, ai.detectedCategory].map((c, i) => (
                  <Btn key={c} variant={finalCategory === c ? "primary" : "outline"} className="text-xs" onClick={() => setFinalCategory(c)}>
                    {i === 0 ? "Your choice" : "AI suggestion"}: {categoryLabel(c)}
                  </Btn>
                ))}
              </div>
            </div>
          )}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Issue type</dt><dd className="mt-1 font-medium">{finalCategory ? categoryLabel(finalCategory) : "Please choose above"}</dd></div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Urgency · AI suggestion — please review</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={urgencyTone[ai.urgency]}>{ai.urgency}</Badge><span className="text-sm text-muted-foreground">{ai.urgencyReason}</span></dd>
            </div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted-foreground">Summary</dt><dd className="mt-1">{ai.summary}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted-foreground">Photo observations</dt><dd className="mt-1 text-sm">{ai.photoObservations}</dd></div>
          </dl>
          {ai.missingInfo.length > 0 && (
            <div className="mt-5 rounded-lg bg-secondary p-4 text-secondary-foreground">
              <p className="text-sm font-semibold">Missing information — consider adding these to the description and regenerating:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{ai.missingInfo.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          <label htmlFor="draft" className="mt-5 mb-1.5 block text-sm font-semibold">Complaint draft (editable)</label>
          <textarea id="draft" rows={12} lang={language} className={fieldCls + " leading-relaxed"} value={text} onChange={(e) => setText(e.target.value)} />
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            I have reviewed and edited this AI-generated content and confirm it is accurate.
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn onClick={() => save("ready")} disabled={saving || !finalCategory || !reviewed || text.trim().length < 20}>Save as Ready to Submit</Btn>
            <Btn variant="outline" onClick={() => save("draft")} disabled={saving || !finalCategory || text.trim().length < 20}>{saving ? "Saving…" : "Save as Draft"}</Btn>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Saving stores the complaint in this public demo. CivicFix AI does not send it to any authority.</p>
        </Card>
      )}
    </div>
  );
}
