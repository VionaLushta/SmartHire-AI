import { CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function ApplyModal({ open, job, onClose, onConfirm, submitting = false }) {
  return (
    <Modal open={open} title="Apply for this opportunity" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Role</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{job?.title || 'Job opportunity'}</h3>
          <p className="mt-1 text-sm text-slate-600">{job?.company_name || 'Hiring team'}</p>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          You are about to submit an application for this role. This will use the existing application flow already wired into the backend.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm application'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
