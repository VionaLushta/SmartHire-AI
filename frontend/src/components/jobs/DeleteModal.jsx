import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function DeleteModal({ open, job, onClose, onConfirm, submitting = false }) {
  return (
    <Modal open={open} title="Delete job" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <AlertTriangle className="mt-0.5 h-5 w-5" aria-hidden="true" />
          <p className="text-sm leading-6">
            This action permanently removes <span className="font-semibold">{job?.title || 'this job'}</span> from the platform.
          </p>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          This action cannot be undone. Continue only if you are sure this role should be removed.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep job
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={submitting} className="bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600">
            {submitting ? 'Deleting...' : 'Delete job'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
