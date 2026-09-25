import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { ArrowLeft, CreditCard, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings } from '@/data/store';
import { calcCardInstallments } from '@/data/calculations';
import logoColor from '@/assets/proposta-template/logo-tls-color.png';

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SimuladorCartaoPage() {
  const [valor, setValor] = useState('');
  const [gerando, setGerando] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const settings = getSettings();
  const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
  const parcelas = valorNum > 0
    ? calcCardInstallments(valorNum, settings.creditCardRates)
    : null;
  const opcoes = parcelas
    ? Object.entries(parcelas)
        .map(([n, v]) => ({ n: Number(n), ...v }))
        .sort((a, b) => a.n - b.n)
    : [];

  const baixarImagem = async () => {
    if (!previewRef.current || valorNum <= 0) return;
    setGerando(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `simulacao-cartao-${formatCurrency(valorNum).replace(/\D/g, '')}.png`;
      a.click();
    } catch (e: any) {
      toast.error('Erro ao gerar imagem: ' + (e?.message || e));
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/ferramentas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Ferramentas
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Simulador de Cartão</h1>
          <p className="text-sm text-muted-foreground">Simula o parcelamento e gera uma imagem pra enviar ao cliente</p>
        </div>
      </div>

      <div className="solar-card p-5 mb-6">
        <label className="block text-sm font-medium mb-1.5">Valor a parcelar (R$)</label>
        <input
          type="text" inputMode="decimal" className="solar-input text-lg"
          value={valor} onChange={e => setValor(e.target.value)}
          placeholder="Ex: 25000"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Taxas de Visa/Master cadastradas em Admin → Precificação. Elo e outras bandeiras não são simuladas aqui.
        </p>
      </div>

      {valorNum > 0 && opcoes.length > 0 && (
        <>
          <div className="rounded-xl overflow-hidden border border-border shadow-sm mb-4">
            <div ref={previewRef} style={{ background: '#fff', padding: '28px', fontFamily: 'Inter, Arial, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #C79A3B', paddingBottom: '14px', marginBottom: '18px' }}>
                <img src={logoColor} style={{ height: '38px' }} />
                <span style={{ fontSize: '11px', color: '#6B7264', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulação · Visa/Master</span>
              </div>

              <p style={{ fontSize: '12px', color: '#6B7264', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Valor a parcelar</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#2F3B1E', marginBottom: '18px' }}>{formatCurrency(valorNum)}</p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #E4E1D6', textAlign: 'left' }}>
                    <th style={{ padding: '6px 4px', color: '#6B7264', fontWeight: 600 }}>Parcelas</th>
                    <th style={{ padding: '6px 4px', color: '#6B7264', fontWeight: 600, textAlign: 'right' }}>Valor da parcela</th>
                    <th style={{ padding: '6px 4px', color: '#6B7264', fontWeight: 600, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {opcoes.map(o => (
                    <tr key={o.n} style={{ borderBottom: '1px solid #F0EEE5' }}>
                      <td style={{ padding: '7px 4px', fontWeight: 700, color: '#2F3B1E' }}>{o.n}×</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(o.perMonth)}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', color: '#6B7264' }}>{formatCurrency(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ fontSize: '10.5px', color: '#6B7264', marginTop: '16px', textAlign: 'center' }}>
                Três Lagoas Solar — valores válidos pra cartão Visa/Mastercard. Outras bandeiras podem ter acréscimo.
              </p>
            </div>
          </div>

          <button onClick={baixarImagem} disabled={gerando} className="solar-btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold">
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {gerando ? 'Gerando...' : 'Baixar imagem (PNG)'}
          </button>
        </>
      )}
    </div>
  );
}
