export const padZero = (num) => String(num).padStart(2, "0");

export const getTodayDateString = (date = new Date()) => {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

export const getToday = () => getTodayDateString();

export const getCurrentTime = () => {
  const d = new Date();
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
};

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${padZero(Math.floor(s / 60))}:${padZero(s % 60)}`;
};

export const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const parseTags = (str) => String(str || "").split(",").map(t => t.trim()).filter(Boolean).slice(0, 12);

export const getHue = (str) => [...String(str || "x")].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

export const formatMonthYear = (dateStr) => {
  const [y, m] = String(dateStr).split("-").map(Number);
  if (!y || !m) return String(dateStr);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
};

export const formatMonthDay = (dateStr) => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return String(dateStr);
  return new Date(y, m - 1, d).toLocaleString("en-US", { month: "long", day: "numeric" });
};

export const formatWeekday = (dateStr) => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleString("en-US", { weekday: "short" });
};

export const getDayFromDate = (dateStr) => String(dateStr || "").slice(8, 10);

export const countWords = (str) => String(str || "").trim().split(/\s+/).filter(Boolean).length;

export const timeAgo = (timestamp) => {
  const t = Number(timestamp) || Date.now();
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

// PIN Hashing & Verification
export const hashPin = async (pin, salt) => {
  const str = `${salt}:${pin}`;
  if (globalThis.crypto?.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      return `sha256:${hashHex}`;
    } catch {}
  }
  return `fallback:${str}`;
};

export const verifyPin = (pin, hashedPin) => {
  const a = String(pin || "");
  const b = String(hashedPin || "");
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};
