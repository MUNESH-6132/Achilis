import React, { useState } from 'react';
import { Modal } from './Modal';
import { X } from './Icons';
import { generateId } from '../utils/helpers';

export function NoteEditor({ note, onClose, onSave }) {
  const [form, setForm] = useState(note || { id: generateId(), title: "", content: "" });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.content.trim() && !form.title.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal onClose={onClose} width="max-w-md">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-black">{note ? "Edit Note" : "New Note"}</h2>
        <button onClick={onClose} className="text-muted hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      
      <div className="space-y-4 p-6 bg-yellow-50">
        <input value={form.title} onChange={e => setField("title", e.target.value)} className="w-full bg-transparent font-display text-xl font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none" placeholder="Note Title" />
        <textarea value={form.content} onChange={e => setField("content", e.target.value)} className="w-full bg-transparent text-gray-700 placeholder:text-gray-400 focus:outline-none resize-none" rows="8" placeholder="Write your note here..." />
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-surface2">Cancel</button>
        <button onClick={handleSave} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-ink hover:bg-accent/90">Save Note</button>
      </div>
    </Modal>
  );
}
