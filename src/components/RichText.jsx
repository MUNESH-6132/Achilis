import React from 'react';

export function RichText({ text, className }) {
  const src = String(text == null ? "" : text);
  if (!src.trim()) return null;
  const lines = src.split(/\n/), out = [];
  let list = null, li = 0;

  const flush = () => {
    if (list) {
      out.push(<ul className="my-2 list-disc space-y-1 pl-5 marker:text-accent" key={"ul" + out.length}>{list}</ul>);
      list = null;
    }
  };

  const parseInline = (text, keyBase) => {
    const res = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[A-Za-z0-9_]+)/g;
    let last = 0, m, i = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) res.push(text.slice(last, m.index));
      const tk = m[0];
      if (tk.startsWith("**")) res.push(<strong className="font-bold text-white" key={keyBase + "b" + i}>{tk.slice(2, -2)}</strong>);
      else if (tk.startsWith("`")) res.push(<code className="rounded bg-surface2 px-1 py-0.5 text-[0.9em]" key={keyBase + "c" + i}>{tk.slice(1, -1)}</code>);
      else if (tk.startsWith("@")) res.push(<span className="font-semibold text-accent" key={keyBase + "m" + i}>{tk}</span>);
      else res.push(<em className="italic" key={keyBase + "i" + i}>{tk.slice(1, -1)}</em>);
      last = m.index + tk.length;
      i++;
    }
    if (last < text.length) res.push(text.slice(last));
    return res;
  };

  lines.forEach((raw, idx) => {
    const t = raw.trim();
    if (/^[-*]\s+/.test(t)) {
      (list = list || []).push(<li key={"li" + (li++)}>{parseInline(t.replace(/^[-*]\s+/, ""), "l" + idx + "_")}</li>);
      return;
    }
    flush();
    if (!t) { out.push(<div className="h-1.5" key={"sp" + idx} />); return; }
    if (/^#{1,3}\s+/.test(t)) {
      out.push(<p className="mt-3 font-display text-base font-bold text-white" key={"h" + idx}>{parseInline(t.replace(/^#{1,3}\s+/, ""), "h" + idx + "_")}</p>);
      return;
    }
    out.push(<p className="whitespace-pre-wrap" key={"p" + idx}>{parseInline(raw, "p" + idx + "_")}</p>);
  });
  flush();
  return <div className={className || "text-sm leading-relaxed text-muted"}>{out}</div>;
}
