import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Download, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getPropostaPlacaByCodigoDB, marcarPropostaPlacaVisualizadaDB, updatePropostaPlacaDB,
} from '@/data/supabasePropostaPlaca';
import type { PropostaPlaca } from '@/data/propostaPlacaTypes';
import PropostaPlacaTemplate from '@/components/PropostaPlacaTemplate';
import { gerarPropostaPlacaPDF, downloadPropostaPlacaPDF } from '@/lib/generatePropostaPlacaPDF';
import PDFCanvasViewer from '@/components/PDFCanvasViewer';

export default function ProposalPlacaPage() {
  const { codigo } = useParams();
  const { isAuthenticated } = useAuth();
  const [proposta, setProposta] = useState<PropostaPlaca | null>(null);
  const [fotosPortfolio, setFotosPortfolio] = useState<string[]>([]);
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
      if (!codigo) { setNotFound(true); setLoading(false); return; }
      try {
        const p = await getPropostaPlacaByCodigoDB(codigo);
        if (!p) { setNotFound(true); setLoading(false); return; }
        setProposta(p);
        setPrecoForm(String(p.precoAvista));
        setObsForm(p.observacoes || '');
        const { data: fotos } = await supabase.from('fotos_portfolio' as any).select('url').eq('ativo', true).order('ordem').limit(35);
        setFotosPortfolio(((fotos || []) as any[]).map(f => f.url));
        if (!isAuthenticated) marcarPropostaPlacaVisualizadaDB(codigo).catch(() => {});
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [codigo, isAuthenticated]);

  const gerarPDF = async () => {
    if (!templateRef.current || !proposta) return;
    setGerando(true);
    try {
      const blob = await gerarPropostaPlacaPDF(templateRef.current, proposta.clienteNome, proposta.numeroProposta);
      setPdfBlob(blob);
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || e));
    } finally {
      setGerando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!proposta) return;
    setSalvando(true);
    try {
      const preco = parseFloat(precoForm.replace(',', '.')) || proposta.precoAvista;
      await updatePropostaPlacaDB(proposta.id, { precoAvista: preco, observacoes: obsForm.trim() || null });
      setProposta({ ...proposta, precoAvista: preco, observacoes: obsForm.trim() || null });
      toast.success('Alterações salvas!');
      setEditando(false);
      setPdfBlob(null);
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
    <div className="max-w-4xl mx-auto p-4 space-y-4">
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
            <label className="block text-xs font-medium mb-1">Preço à vista (R$)</label>
            <input type="text" inputMode="decimal" className="solar-input" value={precoForm} onChange={e => setPrecoForm(e.target.value)} />
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
        <PDFCanvasViewer blob={pdfBlob} inline onDownload={() => downloadPropostaPlacaPDF(pdfBlob, proposta.clienteNome)} />
      ) : (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm mx-auto" style={{ width: 'fit-content' }}>
          <div ref={templateRef}>
            <PropostaPlacaTemplate data={proposta} fotosPortfolio={fotosPortfolio} />
          </div>
        </div>
      )}
    </div>
  );
}
