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
    <div className="ca-actions">
      <p className="ca-sub" style={{ margin: 0 }}>{prompt}</p>

      {!fileName ? (
        <button onClick={() => inputRef.current?.click()} className="ca-drop">
          <Upload className="w-6 h-6" />
          <strong>Toque para escolher um arquivo</strong>
        </button>
      ) : (
        <div className="ca-preview">
          <Check className="w-5 h-5" style={{ color: 'var(--gold-ink)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          <button onClick={() => setFileName(null)} aria-label="Remover"><X className="w-4 h-4" style={{ color: 'var(--muted)' }} /></button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} />

      <button
        onClick={() => {
          if (fileName) { track('file_upload_completed'); onDone(fileName); } else { onSkip(); }
        }}
        className={`ca-btn ${fileName ? 'ca-btn-primary' : 'ca-btn-secondary'}`}
      >
        {fileName ? 'Enviar e continuar' : 'Continuar sem arquivo'}
      </button>
    </div>
  );
}
