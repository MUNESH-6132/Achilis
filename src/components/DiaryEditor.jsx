import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { countWords, formatMonthDay, generateId, getCurrentTime, getToday, parseTags } from '../utils/helpers';
import { Modal } from './Modal';
import { Edit, Trash, X } from './Icons';

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" }
];

const INPUT_CLASS = "w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition focus:border-accent/70 focus:bg-surface2";
const BUTTON_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition duration-200 hover:bg-[#ff6a1f] active:scale-[.98]";
const BUTTON_SECONDARY = "inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-white/80 transition duration-200 hover:border-accent/60 hover:bg-white/[0.04] hover:text-white active:scale-[.98]";

function createEntry(entry) {
  return {
    ...entry,
    id: entry?.id || generateId(),
    date: entry?.date || getToday(),
    time: entry?.time || getCurrentTime(),
    title: typeof entry?.title === "string" ? entry.title : "",
    mood: entry?.mood ?? 3,
    tags: typeof entry?.tags === "string" ? entry.tags : "",
    body: String(entry?.body ?? entry?.content ?? ""),
  };
}

export function DiaryEditor({ entry, onClose, onSave }) {
  const { data, update } = useAchilles();
  const [form, setForm] = useState(() => createEntry(entry));
  const onSaveRef = useRef(onSave);
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  const [listening, setListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recordingKind, setRecordingKind] = useState(null);
  const speechRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const isNew = !data.diary.some(item => item.id === form.id);

  const setField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setMessage("");
  };

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const commit = useCallback(() => {
    if (!form.title.trim() && !form.body.trim() && !form.photo && !form.audio && !form.video) return false;
    const savedEntry = {
      ...form,
      title: form.title.trim() || "Untitled",
      tags: parseTags(form.tags).join(", "),
      content: form.body,
      createdAt: Number(form.createdAt) || Date.now(),
      updated: Date.now(),
    };

    if (onSaveRef.current) {
      onSaveRef.current(savedEntry);
    } else {
      update(state => ({
        ...state,
        diary: state.diary.some(item => item.id === savedEntry.id)
          ? state.diary.map(item => item.id === savedEntry.id ? { ...item, ...savedEntry } : item)
          : [savedEntry, ...state.diary]
      }));
    }
    return true;
  }, [form, update]);

  const close = () => {
    commit();
    onClose();
  };

  const save = () => {
    if (!form.title.trim() && !form.body.trim() && !form.photo && !form.audio && !form.video) {
      setMessage("Add a line, a title, or some media first.");
      return;
    }
    commit();
    onClose();
  };

  const deleteEntry = () => {
    if (!window.confirm("Delete this entry?")) return;
    update(state => ({ ...state, diary: state.diary.filter(item => item.id !== form.id) }));
    onClose();
  };

  useEffect(() => {
    if (!form.title.trim() && !form.body.trim() && !form.photo && !form.audio && !form.video) return undefined;
    const timer = setTimeout(() => {
      if (commit()) setSavedAt(Date.now());
    }, 900);
    return () => clearTimeout(timer);
  }, [form.title, form.body, form.tags, form.mood, form.date, form.time, form.photo, form.audio, form.video, commit]);

  useEffect(() => () => {
    try { speechRef.current?.abort(); } catch {}
    try { cameraStreamRef.current?.getTracks().forEach(track => track.stop()); } catch {}
    try { mediaStreamRef.current?.getTracks().forEach(track => track.stop()); } catch {}
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {}
    clearTimeout(recordTimerRef.current);
  }, []);

  const toggleSpeech = () => {
    if (listening) {
      try { speechRef.current?.stop(); } catch {}
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Voice input is not available in this browser.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = event => {
        let transcript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += event.results[index][0].transcript;
        }
        setForm(current => ({
          ...current,
          body: `${current.body ? `${current.body} ` : ""}${transcript.trim()}`
        }));
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        setMessage("Voice input stopped. Check the microphone permission.");
      };
      recognition.start();
      speechRef.current = recognition;
      setListening(true);
      setMessage("");
    } catch {
      setMessage("Could not start voice input.");
    }
  };

  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera capture is not supported here.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } }
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }, 80);
    } catch {
      setMessage("Camera unavailable or permission denied.");
    }
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const scale = Math.min(1, 400 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      setField("photo", canvas.toDataURL("image/jpeg", 0.82));
      closeCamera();
      setMessage("Snapshot added to this entry.");
    } catch {
      setMessage("Could not capture that frame.");
    }
  };

  const stopRecording = () => {
    clearTimeout(recordTimerRef.current);
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {}
    setRecordingKind(null);
  };

  const startRecording = async kind => {
    if (recordingKind) {
      stopRecording();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setMessage("Recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video"
          ? { video: { facingMode: "user" }, audio: true }
          : { audio: true }
      );
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || (kind === "video" ? "video/webm" : "audio/webm")
          });
          if (blob.size > 2.4e6) {
            setMessage("That recording is too big to keep in this browser. Try a shorter one.");
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              setField(kind === "video" ? "video" : "audio", String(reader.result || ""));
              setMessage(kind === "video" ? "Video note added." : "Voice note added.");
            };
            reader.readAsDataURL(blob);
          }
        } catch {
          setMessage("Could not save that recording.");
        }
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        setRecordingKind(null);
      };
      recorder.start();
      setRecordingKind(kind);
      setMessage("");
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 20000);
    } catch {
      setMessage(kind === "video" ? "Camera or microphone unavailable." : "Microphone unavailable or permission denied.");
    }
  };

  return (
    <Modal onClose={close} width="max-w-4xl">
      <div className="flex max-h-[92vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
              <Edit className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-xl font-black leading-tight">{isNew ? "New entry" : "Edit entry"}</h2>
              <p className="text-xs text-muted">{formatMonthDay(form.date)}</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Date</span>
              <input type="date" className={INPUT_CLASS} value={form.date} onChange={event => setField("date", event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Time</span>
              <input type="time" className={INPUT_CLASS} value={form.time} onChange={event => setField("time", event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Tags</span>
              <input className={INPUT_CLASS} value={form.tags || ""} onChange={event => setField("tags", event.target.value)} placeholder="work, ideas" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Title</span>
            <input className={INPUT_CLASS} value={form.title || ""} onChange={event => setField("title", event.target.value)} placeholder="What was today about?" autoFocus />
          </label>

          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Mood</span>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(mood => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setField("mood", mood.value)}
                  aria-pressed={Number(form.mood) === mood.value}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${Number(form.mood) === mood.value ? "border-accent bg-accent/15 text-white" : "border-line text-muted hover:border-accent/40 hover:text-white"}`}
                >
                  <span className="text-base leading-none">{mood.emoji}</span>{mood.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleSpeech} aria-pressed={listening} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${listening ? "animate-pulse border-accent bg-accent/20 text-accent" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}>
              {listening && <span className="h-2 w-2 rounded-full bg-accent" />}
              {listening ? "Listening… tap to stop" : "Speak instead of typing"}
            </button>
            <button type="button" onClick={() => startRecording("audio")} aria-pressed={recordingKind === "audio"} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${recordingKind === "audio" ? "animate-pulse border-accent bg-accent/20 text-accent" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}>
              {recordingKind === "audio" ? "Stop recording" : "Voice note"}
            </button>
            <button type="button" onClick={() => startRecording("video")} aria-pressed={recordingKind === "video"} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${recordingKind === "video" ? "animate-pulse border-accent bg-accent/20 text-accent" : "border-line text-muted hover:border-accent/50 hover:text-white"}`}>
              {recordingKind === "video" ? "Stop video" : "Video"}
            </button>
            <button type="button" onClick={openCamera} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:border-accent/50 hover:text-white">
              Snapshot
            </button>
            <select
              aria-label="Mention a title"
              defaultValue=""
              onChange={event => {
                if (!event.target.value) return;
                setField("body", `${form.body ? `${form.body} ` : ""}@[${event.target.value}]`);
                event.target.value = "";
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:border-accent/50 hover:text-white"
            >
              <option value="">Mention a title…</option>
              {data.books.filter(book => book.title).map(book => <option key={book.id} value={book.title}>{book.title}</option>)}
            </select>
            <span className="text-[10px] text-muted">@ links a book or film</span>
          </div>

          {form.photo && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/40 p-2">
              <img src={form.photo} alt="Diary snapshot" loading="lazy" decoding="async" className="h-20 w-20 rounded-xl object-cover" />
              <button type="button" onClick={() => setField("photo", "")} className="text-[11px] font-semibold text-muted transition hover:text-accent">Remove snapshot</button>
            </div>
          )}
          {form.audio && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/40 p-2">
              <audio controls src={form.audio} className="min-w-0 flex-1" />
              <button type="button" onClick={() => setField("audio", "")} className="shrink-0 text-[11px] font-semibold text-muted transition hover:text-accent">Remove</button>
            </div>
          )}
          {form.video && (
            <div className="space-y-2 rounded-2xl border border-line bg-ink/40 p-2">
              <video controls src={form.video} className="w-full rounded-xl" />
              <button type="button" onClick={() => setField("video", "")} className="text-[11px] font-semibold text-muted transition hover:text-accent">Remove video</button>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Body</span>
            <textarea rows={12} className={`${INPUT_CLASS} min-h-[38vh] resize-y leading-relaxed`} value={form.body} onChange={event => setField("body", event.target.value)} placeholder="Let it out…" />
          </label>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{countWords(form.body)} words</span>
            {message ? <span className="text-accent">{message}</span> : savedAt ? <span className="text-accent">✓ Draft saved</span> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <div>
            {!isNew && (
              <button type="button" onClick={deleteEntry} className={`${BUTTON_SECONDARY} border-transparent text-muted hover:border-accent/40 hover:text-accent`}>
                <Trash className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className={BUTTON_SECONDARY} onClick={close}>Cancel</button>
            <button type="button" className={BUTTON_PRIMARY} onClick={save}>{isNew ? "Save entry" : "Save changes"}</button>
          </div>
        </div>

        {cameraOpen && (
          <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-black/90 p-6">
            <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full max-w-md rounded-2xl border border-line object-cover" />
            <div className="flex gap-2">
              <button type="button" onClick={takeSnapshot} className={BUTTON_PRIMARY}>Capture</button>
              <button type="button" onClick={closeCamera} className={BUTTON_SECONDARY}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
