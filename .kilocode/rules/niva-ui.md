# Niva UI Rules — Achilis

## Design tokens
- Canvas: #020202
- Surface: #0E0D0C
- Rose-gold accent: #F3C6B6
- Muted text: #A1A1AA
- Text: #F2EBE6
- Hairline border: rgba(255,255,255,0.08)

## Typography
- Headings and large numbers: font-serif
- Body and labels: font-sans
- Micro labels: uppercase, tracking-widest, text-[10px]

## Layout
- No heavy boxes, no nested cards, no glassmorphism.
- Use negative space and dotted dividers.
- Active filters: rose-gold pill, black text.
- Inactive filters: white/5 pill, muted text.
- Max content width: max-w-5xl mx-auto.

## Editing rules
- Do not change data logic, Supabase sync, routing, or auth.
- Do not run npm run build.
- Read the target file fully before editing.
- Prefer small diffs over rewriting the whole file.
- After edits, verify JSX tag balance. If Vite reports a parse error, fix only the syntax.