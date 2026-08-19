import { Download, RefreshCcw, FileText, Eye } from 'lucide-react';
import Button from '../ui/Button';

export default function ResumePreview({ resume, previewUrl, onReplace, onDownload }) {
  const fileName = resume?.file_path?.split(/[\\/]/).pop() || 'Resume preview';

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Document preview</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">{fileName}</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onReplace}>
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Replace
          </Button>
          <Button type="button" variant="primary" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
        {previewUrl ? (
          <iframe title="Resume preview" src={previewUrl} className="h-[520px] w-full bg-white" />
        ) : (
          <div className="flex h-[520px] flex-col items-center justify-center gap-4 text-center text-slate-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">Preview not available</p>
              <p className="mt-2 text-sm">Upload a resume document to preview it here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
