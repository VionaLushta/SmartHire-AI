import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4">
      <div className="w-full max-w-lg rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.08)] px-6 py-4">
          <h2 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
