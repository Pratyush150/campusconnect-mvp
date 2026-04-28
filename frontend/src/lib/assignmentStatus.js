// Status grouping + 6-step timeline helpers shared across client/doer/admin views.

export const TIMELINE_STEPS = [
  { key: "posted",     label: "Posted" },
  { key: "published",  label: "Published" },
  { key: "assigned",   label: "Assigned" },
  { key: "paid",       label: "Paid" },
  { key: "delivered",  label: "Delivered" },
  { key: "completed",  label: "Completed" },
];

export function statusToStepIndex(a) {
  const s = a?.status;
  if (s === "completed") return 5;
  if (s === "delivered") return 4;
  if (["assigned", "in_progress", "review", "revision"].includes(s)) {
    return a?.clientPaid ? 3 : 2;
  }
  if (["published", "bidding"].includes(s)) return 1;
  if (s === "pending") return 0;
  return -1; // disputed / cancelled / refunded
}

export const CLIENT_TABS = [
  { key: "all",       label: "All",            statuses: null },
  { key: "review",    label: "In review",      statuses: ["pending", "published", "bidding"] },
  { key: "allotted",  label: "Allotted",       statuses: ["assigned", "in_progress", "review", "revision"] },
  { key: "awaiting",  label: "Awaiting you",   statuses: ["delivered"] },
  { key: "completed", label: "Completed",      statuses: ["completed"] },
  { key: "issues",    label: "Issues",         statuses: ["disputed", "cancelled", "refunded"] },
];

export const DOER_TABS = [
  { key: "all",       label: "All",            statuses: null },
  { key: "in_flight", label: "In progress",    statuses: ["assigned", "in_progress", "revision"] },
  { key: "review",    label: "Awaiting review",statuses: ["review"] },
  { key: "delivered", label: "Delivered",      statuses: ["delivered"] },
  { key: "completed", label: "Completed",      statuses: ["completed"] },
  { key: "issues",    label: "Issues",         statuses: ["disputed", "cancelled", "refunded"] },
];

export function bucketCount(items, statuses) {
  if (!statuses) return items.length;
  return items.filter((a) => statuses.includes(a.status)).length;
}

export function bucketFilter(items, statuses) {
  if (!statuses) return items;
  return items.filter((a) => statuses.includes(a.status));
}

export function deadlineMeta(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { label: "overdue", tone: "danger" };
  const hours = ms / 36e5;
  if (hours < 24) return { label: `${Math.max(1, Math.round(hours))}h left`, tone: "danger" };
  const days = Math.round(hours / 24);
  return { label: `${days}d left`, tone: days <= 2 ? "warn" : null };
}

export function relativeTime(date) {
  if (!date) return "";
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return "just now";
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}
