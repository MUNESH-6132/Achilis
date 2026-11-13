const OPEN_LIBRARY = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org/b";
const GOOGLE_BOOKS = "https://www.googleapis.com/books/v1/volumes";

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// --- BOOKS (Open Library) ---
export async function searchOpenLibrary(query) {
  const url = `${OPEN_LIBRARY}/search.json?limit=6&fields=title,subtitle,author_name,first_publish_year,cover_i,subject,publisher,number_of_pages_median&q=${encodeURIComponent(query)}`;
  const data = await fetchJson(url);
  return Array.isArray(data.docs) ? data.docs : [];
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
function getTmdbKey() {
  try {
    const k = String(localStorage.getItem("achilles:tmdbKey") || "").trim();
    return (!k || k.length < 20 || /\s/.test(k) || /^eyJ/i.test(k)) ? "" : k;
  } catch { return ""; }
}

export async function tmdbSuggest(query) {
  const key = getTmdbKey();
  if (!key) return []; // Silently return empty if no key
  
  const url = `https://api.themoviedb.org/3/search/multi?include_adult=false&query=${encodeURIComponent(query)}&api_key=${key}`;
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
  const key = getTmdbKey();
  if (!key) throw new Error("TMDB: no valid key");
  const url = `https://api.themoviedb.org/3/${mt}/${id}?append_to_response=credits,watch/providers&api_key=${key}`;
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
