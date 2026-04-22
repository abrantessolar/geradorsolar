import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Download, X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFCanvasViewerProps {
  blob: Blob;
  onClose: () => void;
  onDownload: () => void;
}

export default function PDFCanvasViewer({ blob, onClose, onDownload }: PDFCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadedPdf: pdfjsLib.PDFDocumentProxy | null = null;
    (async () => {
      try {
        setLoading(true);
        const buffer = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        loadedPdf = doc;
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch (e) {
        console.error('Erro carregando PDF:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (loadedPdf) loadedPdf.destroy();
    };
  }, [blob]);

  useEffect(() => {
    if (!pdf || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    let cancelled = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    (async () => {
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: zoom * dpr });
        const cssViewport = page.getViewport({ scale: zoom });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;
        canvas.className = 'shadow-lg bg-white mb-4 mx-auto block';
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        page.cleanup();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, zoom]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col">
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">
          {numPages > 0 ? `${numPages} página${numPages > 1 ? 's' : ''}` : 'Carregando...'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4 text-foreground" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={onDownload}
            className="solar-btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Baixar
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Fechar">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/40 p-4">
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando PDF...
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
