import React, { useState, useRef, useEffect } from 'react';
import { useAchilles } from '../context/AchillesContext';
import { Plus } from './Icons';

const COVER_PALETTE = [
  '#B49B70',
  '#8B0000',
  '#228B22',
  '#708090',
  '#36454F',
];

function hashTitleToPaletteIndex(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COVER_PALETTE.length;
}

export function BookCover({ title, author, cover, onAddCover }) {
  const { update } = useAchilles();

  const [showFileInput, setShowFileInput] = useState(false);
  const [dataURL, setDataURL] = useState(null);
  const paletteIndex = useRef(hashTitleToPaletteIndex(title || 'Book')).current;
  const bgColor = COVER_PALETTE[paletteIndex];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      setDataURL(url);
      if (update) {
        update(state => ({
          ...state,
          books: state.books.map(b => b.title === title ? { ...b, cover: url } : b)
        }));
      }
      setShowFileInput(false);
      setTimeout(() => setDataURL(null), 300);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target && !e.target.closest('.book-cover-wrapper')) {
        setShowFileInput(false);
        setDataURL(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!title && !author && !cover) return null;

  if (cover && cover.trim()) {
    return (
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg)] transition-colors" style={{ backgroundColor: bgColor }}>
        <img decoding="eager" src={cover} alt={title ? `Cover of ${title}` : "Book cover"} className="absolute inset-0 w-full h-full object-cover" />
        {showFileInput && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Plus className="text-white text-2xl" />
            <span className="text-white/90 text-[10px] absolute bottom-2">Add cover</span>
          </div>
        )}
        {!showFileInput && (
          <div className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-50">
            <Plus className="text-white text-2xl opacity-75 hover:opacity-100" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg)] transition-colors" style={{ backgroundColor: bgColor }}>
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <div className="text-center">
          <p className="font-display text-[12px] font-bold text-white/90 line-clamp-2">{title || 'Untitled'}</p>
          {author && <p className="mt-1 text-[10px] text-white/55 uppercase tracking-wider">{author}</p>}
        </div>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity cursor-pointer" onClick={() => setShowFileInput(true)}>
        <Plus className="text-white text-2xl" />
      </div>
    </div>
  );
}
