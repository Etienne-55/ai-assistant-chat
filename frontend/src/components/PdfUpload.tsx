import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface PdfUploadProps {
  onPdfSelect: (file: File | null) => void;
  currentFile: File | null;
}

export function PdfUpload({ onPdfSelect, currentFile }: PdfUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      onPdfSelect(file);
    }
  }, [onPdfSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="mb-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-tokyo-cyan bg-tokyo-bgHighlight scale-[1.02]' 
            : 'border-tokyo-terminal hover:border-tokyo-blue hover:bg-tokyo-bgHighlight/50'
          }`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-2">
          {currentFile ? (
            <>
              <svg className="w-5 h-5 text-tokyo-green" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <span className="text-tokyo-green text-sm">
                📄 {currentFile.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPdfSelect(null);
                }}
                className="ml-2 text-tokyo-red hover:text-tokyo-orange transition-colors text-lg leading-none"
                aria-label="Remove PDF"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-tokyo-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-tokyo-fgDark text-sm">
                {isDragActive ? 'Drop PDF here...' : 'Drop PDF or click to upload'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
