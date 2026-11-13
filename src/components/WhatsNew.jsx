import React, { useState } from 'react';
import { Modal } from './Modal';
import { Book, Check, Edit, Grid, Play, Plus, Search, X } from './Icons';

const FEATURES = [
  {
    icon: Search,
    title: "Fuzzy search",
    body: "Type “hp” and find Harry Potter. Search now matches loosely instead of needing the exact phrase."
  },
  {
    icon: Grid,
    title: "Select",
    body: "Select in Library or Entertainment puts a checkbox on every card, then you can delete or change status in one go."
  },
  {
    icon: Check,
    title: "One-tap status",
    body: "Every card has a button that moves a title from watchlist to reading or watching, then finished."
  },
  {
    icon: Play,
    title: "Cinema mode",
    body: "Play fades through your covers full-screen, five seconds each, with a progress bar."
  },
  {
    icon: Edit,
    title: "@Mentions",
    body: "Write @[Dune] in a note or diary entry and it becomes a link straight to that title."
  },
  {
    icon: Book,
    title: "Voice & video notes",
    body: "Record a voice note or a short video straight into a diary entry instead of typing."
  },
  {
    icon: Plus,
    title: "Quick capture",
    body: "The + button adds a note, starts a diary entry or opens the timer from any screen."
  }
];

export function WhatsNew({ onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  return (
    <Modal onClose={() => onClose(dontShowAgain)} width="max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Achilis update</p>
          <h2 className="mt-1 font-display text-2xl font-black leading-tight">What’s new</h2>
          <p className="mt-1 text-xs text-muted">Seven shortcuts worth knowing. You can reopen this any time from Settings.</p>
        </div>
        <button
          type="button"
          onClick={() => onClose(dontShowAgain)}
          aria-label="Close what’s new"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-5">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border border-line bg-ink/40 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={event => setDontShowAgain(event.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--c-accent))]"
          />
          Don’t show this again
        </label>
        <button type="button" onClick={() => onClose(dontShowAgain)} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition duration-200 hover:bg-[#ff6a1f] hover:shadow-[0_12px_30px_-12px_#ff5500] active:scale-[.98]">
          Start exploring
        </button>
      </div>
    </Modal>
  );
}
