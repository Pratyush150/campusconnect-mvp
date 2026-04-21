const PATTERNS = [
  { name: "phone", re: /(?:\+?91[-\s]?|0)?[6-9]\d{9}\b/ },
  { name: "email", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
  { name: "instagram", re: /(?:^|\s)@[a-zA-Z0-9._]{3,}/ },
  { name: "whatsapp", re: /\b(whatsapp|wa\.me|watsapp)\b/i },
  { name: "telegram", re: /\b(telegram|t\.me)\b/i },
  { name: "contactLanguage", re: /\b(call me|text me|dm me|reach me at|ping me|message me on)\b/i },
  { name: "urlShortener", re: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl)\/[A-Za-z0-9]/i },
];

export function scanText(text) {
  const hits = [];
  const t = String(text || "");
  for (const p of PATTERNS) {
    if (p.re.test(t)) hits.push(p.name);
  }
  return { flagged: hits.length > 0, hits };
}

export function scanMany(...texts) {
  const allHits = new Set();
  for (const t of texts) {
    const r = scanText(t);
    r.hits.forEach((h) => allHits.add(h));
  }
  return { flagged: allHits.size > 0, hits: Array.from(allHits) };
}
