
import React from 'react';

interface FileViewerProps {
  url: string;
  onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ url, onClose }) => {
  const isPdf = url.startsWith('data:application/pdf') || url.toLowerCase().includes('.pdf');
  const isBase64 = url.startsWith('data:');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col p-4 animate-fadeIn">
      <header className="flex justify-between items-center mb-4">
        <h3 className="text-white font-black text-sm uppercase tracking-widest">File Preview</h3>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>

      <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center">
        {isPdf ? (
          <iframe 
            src={url} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        ) : (
          <img 
            src={url} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain"
          />
        )}
        
        {!isBase64 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 flex items-center gap-2"
            >
              Open in Drive
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
