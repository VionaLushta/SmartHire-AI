import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({ open, title, children, onClose }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      >
        <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.08)] px-6 py-4">
          <h2 id={titleId} className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
