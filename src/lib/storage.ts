import type { Complaint } from "./complaint-types";

const KEY = "civicfix.complaints.v1";

const DEMO: Complaint[] = [
  {
    id: "demo-1",
    category: "streetlight",
    location: "Maple Avenue, near Greenfield Park gate (fictional)",
    description: "Streetlight has been out for a week; the path is very dark at night.",
    summary: "Broken streetlight on Maple Avenue near the park gate.",
    priority: "medium",
    status: "ready",
    text: "To the Municipal Services Department,\n\nThe streetlight on Maple Avenue near the Greenfield Park gate has not worked for about a week...\n\nSincerely,\n[Your name]",
    createdAt: "2026-10-10T09:00:00.000Z",
    aiMode: "demo",
  },
];

export function loadComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEMO;
    return JSON.parse(raw) as Complaint[];
  } catch {
    return [];
  }
}

export function saveComplaints(list: Complaint[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
