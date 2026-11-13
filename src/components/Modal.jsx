import React, { useEffect, useRef } from 'react';

export function Modal({ onClose, children, width = "max-w-2xl" }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div 
      className="fade-in fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/75 p-4 sm:items-center sm:p-6" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} 
      role="dialog" 
      aria-modal="true"
    >
      <div className={`pop-in my-auto w-full ${width} rounded-[28px] border border-line bg-surface shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]`}>
        {children}
      </div>
    </div>
  );
}

