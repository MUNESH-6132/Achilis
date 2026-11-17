import React, { useState } from 'react';
export function Cover({ book, className = "" }) {
  const [failedCover, setFailedCover] = useState(null);
  const showImage = !!book.cover && failedCover !== book.cover;

  return (
    <div 
      className={`relative h-full w-full overflow-hidden bg-surface2 ${className}`}
    >
      {showImage ? (
        <img 
          decoding="async" 
          src={book.cover} 
          alt={book.title ? `Cover of ${book.title}` : "Book cover"} 
          loading="lazy" 
          onError={() => setFailedCover(book.cover)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3">
          <div className="h-px w-7 bg-white/30" />
          <div>
            <p className="line-clamp-4 font-display text-[13px] font-black leading-tight text-white/90">{book.title || "Untitled"}</p>
            {book.author ? <p className="mt-1 line-clamp-2 text-[10px] uppercase tracking-wider text-white/45">{book.author}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
