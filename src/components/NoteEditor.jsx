import React, { useState } from 'react';
import { Modal } from './Modal';
import { X } from './Icons';
import { generateId } from '../utils/helpers';
import { useAchilles } from '../context/AchillesContext';
import { Button } from '../ui/Primitives';

export function NoteEditor({ note, onClose, onSave }) {
  const { notify } = useAchilles();
  const [form, setForm] = useState(note || { id: generateId(), title: "", content: "" });
  const [message, setMessage] = useState("");
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.content.trim() && !form.title.trim()) {
      setMessage("Add a title or a line before saving.");
      return;
    }
    onSave(form);
    notify(note ? "Note saved." : "Note added.");
    onClose();
  };

  return (
    <Modal onClose={onClose} width="max-w-md" title={note ? "Edit note" : "New note"}>
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-bold tracking-tight">{note ? "Edit Note" : "New Note"}</h2>
        <button type="button" onClick={onClose} aria-label="Close note editor" className="text-muted hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      
      <div className="space-y-4 bg-surface p-6">
        <input value={form.title} onChange={e => setField("title", e.target.value)} className="w-full bg-transparent font-display text-xl font-bold tracking-tight text-white placeholder:text-muted focus:outline-none" placeholder="Note Title" />
        <textarea value={form.content} onChange={e => setField("content", e.target.value)} className="w-full resize-none bg-transparent text-white placeholder:text-muted focus:outline-none" rows="8" placeholder="Write your note here..." />
        {message && <p role="alert" className="text-sm text-muted">{message}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Note</Button>
      </div>
    </Modal>
  );
}
