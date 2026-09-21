import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Download, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPropostaHibridaByIdDB, marcarVisualizadaHibridaDB, updatePropostaHibridaDB } from '@/data/supabasePropostaHibrida';
import type { PropostaHibrida } from '@/data/propostaHibridaTypes';
import PropostaHibridaTemplatePage from '@/components/PropostaHibridaTemplatePage';
import { gerarPropostaHibridaPDF, downloadPropostaHibridaPDF } from '@/lib/generatePropostaHibridaPDF';
import PDFCanvasViewer from '@/components/PDFCanvasViewer';

export default function ProposalHibridaPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [proposta, setProposta] = useState<PropostaHibrida | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [gerando, setGerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [precoForm, setPrecoForm] = useState('');
  const [obsForm, setObsForm] = useState('');
  const [salvando, setSalvando] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      try {
        const p = await getPropostaHibridaByIdDB(id);
        if (!p) { setNotFound(true); setLoading(false); return; }
        setProposta(p);
        setPrecoForm(p.precoTotal != null ? String(p.precoTotal) : '');
        setObsForm(p.observacoes || '');
        if (!isAuthenticated) marcarVisualizadaHibridaDB(id).catch(() => {});
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAuthenticated]);

  const gerarPDF = async () => {
    if (!templateRef.current || !proposta) return;
    setGerando(true);
    try {
      const blob = await gerarPropostaHibridaPDF(templateRef.current, proposta.clienteNome, proposta.numeroProposta);
      setPdfBlob(blob);
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || e));
    } finally {
      setGerando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!proposta || !id) return;
    setSalvando(true);
    try {
      const preco = precoForm.trim() ? parseFloat(precoForm.replace(',', '.')) : null;
      await updatePropostaHibridaDB(id, { precoTotal: preco, observacoes: obsForm.trim() || null });
      setProposta({ ...proposta, precoTotal: preco, observacoes: obsForm.trim() || null });
      toast.success('Alterações salvas!');
      setEditando(false);
      setPdfBlob(null); // preço/obs mudaram, PDF antigo fica desatualizado
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (notFound || !proposta) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Proposta não encontrada.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {isAuthenticated && (
        <div className="solar-card p-4 flex flex-wrap items-center gap-3">
          <button onClick={gerarPDF} disabled={gerando} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {gerando ? 'Gerando...' : 'Gerar / baixar PDF'}
          </button>
          <button onClick={() => setEditando(v => !v)} className="solar-btn-outline text-sm py-2 px-4">
            {editando ? 'Cancelar edição' : 'Editar preço/observações'}
          </button>
        </div>
      )}

      {editando && (
        <div className="solar-card p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Preço total (R$)</label>
            <input type="text" inputMode="decimal" className="solar-input" value={precoForm} onChange={e => setPrecoForm(e.target.value)} placeholder="Deixe em branco para 'Sob consulta'" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Observações</label>
            <textarea className="solar-input min-h-[80px]" value={obsForm} onChange={e => setObsForm(e.target.value)} />
          </div>
          <button onClick={salvarEdicao} disabled={salvando} className="solar-btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
            <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}

      {pdfBlob ? (
        <PDFCanvasViewer blob={pdfBlob} inline onDownload={() => downloadPropostaHibridaPDF(pdfBlob, proposta.clienteNome)} />
      ) : (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm mx-auto" style={{ width: 'fit-content' }}>
          <div ref={templateRef}>
            <PropostaHibridaTemplatePage data={proposta} />
          </div>
        </div>
      )}
    </div>
  );
}
