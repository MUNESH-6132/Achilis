const OPEN_LIBRARY = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org/b";
const GOOGLE_BOOKS = "https://www.googleapis.com/books/v1/volumes";

// Dual-layer cache to prevent hammering Open Library API and avoid 429 rate limits
const openLibraryCache = new Map(); // in-memory Map
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheLookup(url) {
  // Check in-memory first
  const memEntry = openLibraryCache.get(url);
  if (memEntry) {
    if (Date.now() - memEntry.timestamp < CACHE_TTL) {
      return memEntry.data;
    } else {
      openLibraryCache.delete(url);
    }
  }
  // Check sessionStorage as secondary cache
  try {
    const se = sessionStorage.getItem(`ol_cache_${url}`);
    if (se) {
      const entry = JSON.parse(se);
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        openLibraryCache.set(url, { data: entry.data, timestamp: entry.timestamp });
        return entry.data;
      } else {
        sessionStorage.removeItem(`ol_cache_${url}`);
      }
    }
  } catch {}
  return null;
}

function cacheStore(url, data) {
  const entry = { data, timestamp: Date.now() };
  openLibraryCache.set(url, entry);
  try {
    sessionStorage.setItem(`ol_cache_${url}`, JSON.stringify(entry));
  } catch {}
}

// --- BOOKS (Open Library) ---
export async function searchOpenLibrary(query) {
  const url = `${OPEN_LIBRARY}/search.json?limit=6&fields=title,author_name,first_publish_year,cover_i&q=${encodeURIComponent(query)}`;
  
  // Check cache first
  const cached = cacheLookup(url);
  if (cached !== null) return cached;
  
  const data = await fetchJson(url);
  const docs = Array.isArray(data.docs) ? data.docs : [];
  
  // Cache the result
  cacheStore(url, docs);
  
  return docs;
}
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim() || "";

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}): ${text.slice(0, 120)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}


export async function fetchCover(book) {
  const title = String(book.englishTitle || book.title || "").split(":")[0].trim();
  if (!title) throw new Error("A title is needed first.");
  const params = new URLSearchParams({ limit: "3", title });
  const author = String(book.englishAuthor || book.author || "").split(/,| and /)[0].trim();
  if (author) params.set("author", author);
  
  try {
    const data = await fetchJson(`${OPEN_LIBRARY}/search.json?fields=cover_i&${params.toString()}`);
    const doc = (data.docs || []).find(d => d.cover_i);
    if (doc && doc.cover_i) return `${COVERS}/id/${doc.cover_i}-L.jpg`;
  } catch {}

  const googleRes = await fetchJson(`${GOOGLE_BOOKS}?q=${encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ""}`)}&maxResults=1&printType=books`);
  const img = googleRes.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || googleRes.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;
  if (img) return img.replace("http://", "https://");
  throw new Error("No cover found.");
}

export async function fetchDetails(book) {
  const title = String(book.englishTitle || book.title || "").trim();
  if (!title) throw new Error("A title is needed first.");
  const author = String(book.englishAuthor || book.author || "").split(/,| and /)[0].trim();
  const query = `intitle:${title}${author ? ` inauthor:${author}` : ""}`;

  try {
    const data = await fetchJson(`${GOOGLE_BOOKS}?q=${encodeURIComponent(query)}&maxResults=1&printType=books`);
    const info = data.items?.[0]?.volumeInfo;
    if (info) {
      return {
        source: "Google Books",
        pages: Number(info.pageCount) || 0,
        publisher: String(info.publisher || ""),
        published: String(info.publishedDate || "").slice(0, 4),
        description: String(info.description || ""),
        cover: String(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "").replace("http://", "https://"),
        tags: Array.isArray(info.categories) ? info.categories : []
      };
    }
  } catch {}

  const data = await fetchJson(`${OPEN_LIBRARY}/search.json?limit=1&fields=title,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median&q=${encodeURIComponent(`${title} ${author}`)}`);
  const doc = (data.docs || [])[0];
  if (!doc) throw new Error("No details found.");
  return {
    source: "Open Library",
    pages: Number(doc.number_of_pages_median) || 0,
    publisher: (Array.isArray(doc.publisher) ? doc.publisher : [])[0] || "",
    published: doc.first_publish_year ? String(doc.first_publish_year) : "",
    description: "",
    cover: doc.cover_i ? `${COVERS}/id/${doc.cover_i}-L.jpg` : "",
    tags: (doc.subject || []).filter(s => !s.includes(":")).slice(0, 3)
  };
}

export async function fetchChapters(book) {
  throw new Error("TOC fetching is disabled in this version.");
}

// --- MOVIES & TV (TMDB) ---
export async function tmdbSuggest(query) {
  if (!TMDB_API_KEY) {
    console.warn("TMDB search unavailable: VITE_TMDB_API_KEY is not configured.");
    return [];
  }
  
  const url = `https://api.themoviedb.org/3/search/multi?include_adult=false&query=${encodeURIComponent(query)}&api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  try {
    const res = await fetchJson(url);
    return (res.results || [])
      .filter(x => x.media_type === "movie" || x.media_type === "tv")
      .slice(0, 6)
      .map(x => ({
        tid: x.id,
        mt: x.media_type,
        id: "t" + x.id,
        l: x.title || x.name,
        y: (x.release_date || x.first_air_date || "").slice(0, 4),
        qid: x.media_type === "tv" ? "tvSeries" : "movie",
        s: "",
        i: x.poster_path ? { imageUrl: "https://image.tmdb.org/t/p/w500" + x.poster_path } : null
      }));
  } catch (e) {
    console.warn("TMDB search failed", e);
    return [];
  }
}

export async function tmdbDetails(mt, id) {
  if (!TMDB_API_KEY) {
    console.warn("TMDB details unavailable: VITE_TMDB_API_KEY is not configured.");
    throw new Error("TMDB is not configured. Please try again later.");
  }
  const url = `https://api.themoviedb.org/3/${mt}/${id}?append_to_response=credits,watch/providers&api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  const r = await fetchJson(url);
  
  const dir = mt === "movie" 
    ? ((r.credits?.crew || []).filter(c => c.job === "Director").map(c => c.name).slice(0, 2).join(", "))
    : (r.created_by || []).map(c => c.name).slice(0, 2).join(", ");
    
  const wp = r["watch/providers"]?.results || {};
  const rg = wp.PK || wp.US || {};
  const pv = (rg.flatrate || rg.rent || rg.buy || []).map(q => q?.provider_name).filter(Boolean).slice(0, 3).join(", ");
  
  const runtime = mt === "movie" ? (r.runtime || 0) : (r.episode_run_time?.[0] || r.last_episode_to_air?.runtime || 0);
  const tags = (r.genres || []).map(q => q?.name).filter(Boolean).join(", ");
  const seasons = mt === "tv" ? (r.seasons || []).filter(q => q.season_number > 0 && q.episode_count > 0) : [];
  
  return { creator: dir, runtime, tags, where: pv, seasons };
}

export async function imdbSuggest(query) {
  const r = await tmdbSuggest(query);
  if (r.length) return r;
  
  // Fallback to standard IMDb suggestion API
  const c = String(query).trim().toLowerCase();
  const k = /[a-z0-9]/.test(c[0] || "") ? c[0] : "x";
  try {
    const data = await fetchJson(`https://v2.sg.media-imdb.com/suggestion/${k}/${encodeURIComponent(c)}.json`);
    return (data.d || [])
      .filter(x => x.l && /movie|tvSeries|tvMiniSeries|tvMovie|tvSpecial|video/i.test(x.qid || ""))
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function fetchPoster(query) {
  const r = await imdbSuggest(String(query).trim());
  const p = r.find(x => x.i && x.i.imageUrl);
  return p ? p.i.imageUrl : "";
}
