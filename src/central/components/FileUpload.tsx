import { useRef, useState } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { track } from '../lib/analytics';

/**
 * Upload opcional de foto/print/PDF (seções 8, 18, 20 da spec). Importante:
 * a Central não tem um backend de arquivos hoje, e o WhatsApp Web/app não
 * permite anexar um arquivo via link wa.me — então este componente apenas
 * confirma a intenção do usuário ("vou enviar isso") e isso entra na
 * mensagem como um aviso; o arquivo em si é enviado por ele mesmo, depois,
 * dentro da própria conversa do WhatsApp.
 */
export default function FileUpload({ prompt, onDone, onSkip }: { prompt: string; onDone: (fileName: string) => void; onSkip: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    track('file_upload_started');
    setFileName(file.name);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#6B7585' }}>{prompt}</p>

      {!fileName ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed transition-colors"
          style={{ borderColor: '#E3E8EF', color: '#8891A0' }}
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm font-medium">Toque para escolher um arquivo</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#DCFCE7' }}>
          <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#15803D' }} />
          <span className="text-sm font-medium flex-1 truncate" style={{ color: '#1A2233' }}>{fileName}</span>
          <button onClick={() => setFileName(null)} aria-label="Remover"><X className="w-4 h-4" style={{ color: '#6B7585' }} /></button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} />

      <div className="flex gap-3">
        <button
          onClick={() => {
            if (fileName) { track('file_upload_completed'); onDone(fileName); } else { onSkip(); }
          }}
          className="flex-1 h-12 rounded-xl font-bold"
          style={{ background: fileName ? '#F5A623' : '#F5F7FA', color: fileName ? '#1A2233' : '#8891A0' }}
        >
          {fileName ? 'Enviar e continuar' : 'Continuar sem arquivo'}
        </button>
      </div>
    </div>
  );
}
