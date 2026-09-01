import { useRef, useState } from 'react';
import { FileText, FileUp, RefreshCcw, Trash2, UploadCloud } from 'lucide-react';
import Button from '../ui/Button';
import UploadProgress from './UploadProgress';

function formatFileSize(size = 0) {
  if (!size) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function ResumeUploader({
  onUpload,
  isUploading,
  progress,
  status,
  existingResume,
  onReplace,
  onDelete,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  function handleFile(file) {
    if (!file) return;
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (file && !allowedTypes.includes(file.type) && !file.name?.match(/\.(pdf|png|jpe?g)$/i)) {
      return;
    }

    setSelectedFile(file);
    onUpload(file);
  }

  function handleInputChange(event) {
    const nextFile = event.target.files?.[0];
    handleFile(nextFile);
    event.target.value = '';
  }

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div
        className={`rounded-[16px] border-2 border-dashed p-6 transition duration-150 ease-out ${dragging ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-slate-50/80'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          handleFile(file);
        }}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <UploadCloud className="h-8 w-8" aria-hidden="true" />
          </div>

          <div>
            <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-950">Upload your resume</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              PDF, PNG, JPG, and JPEG formats supported.
            </p>
          </div>

          <Button type="button" variant="primary" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
            {isUploading ? 'Uploading...' : 'Choose file'}
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,image/jpg"
            className="hidden"
            aria-label="Upload resume"
            onChange={handleInputChange}
          />
        </div>
      </div>

      {selectedFile || existingResume ? (
        <div className="mt-5 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedFile?.name || existingResume?.file_path?.split(/[\\/]/).pop() || 'Resume file'}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile?.size || 0)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {existingResume ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={onReplace}>
                    <RefreshCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {isUploading ? (
            <div className="mt-4">
              <UploadProgress progress={progress} status={status} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
