import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import MoneyInput from '@/components/ui/money-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, PackageCheck } from 'lucide-react';

type Props = {
  projetoId: string;
  nomeCliente: string;
  onClose: () => void;
  onSaved?: () => void;
};

/**
 * Pedido do preço do kit ao marcar "Equipamento pago" (Acompanhamento).
 * Faz upsert em custos_obra.custo_kit para o projeto, alimentando o módulo de Custos.
 */
export default function KitPrecoModal({ projetoId, nomeCliente, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [valor, setValor] = useState(0);
  const [sugestao, setSugestao] = useState<{ valor: number; linha: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Custo já existente
      const { data: custo } = await supabase
        .from('custos_obra' as any)
        .select('id, custo_kit')
        .eq('projeto_id', projetoId)
        .maybeSingle();

      // Sugestão a partir da tabela de preços (linha da proposta + qtd de placas)
      const { data: proj } = await supabase
        .from('projetos' as any)
        .select('qtd_placas, propostas:proposta_id(linha, dados_completos)')
        .eq('id', projetoId)
        .maybeSingle();

      const { data: cfg } = await supabase
        .from('configuracoes' as any)
        .select('valor')
        .eq('chave', 'price_table')
        .maybeSingle();

      const linha = (proj as any)?.propostas?.linha || (proj as any)?.propostas?.dados_completos?.selectedLine;
      const qtd = (proj as any)?.qtd_placas;
      const priceTable: any[] = ((cfg as any)?.valor as any[]) || [];
      let sug = 0;
      if (linha && qtd && priceTable.length) {
        const entry = priceTable.find((e: any) => e.panels === qtd);
        if (entry && typeof entry[linha] === 'number') sug = entry[linha];
      }
      if (sug > 0) setSugestao({ valor: sug, linha });

      const existente = (custo as any)?.custo_kit || 0;
      setExistingId((custo as any)?.id || null);
      setValor(existente > 0 ? existente : sug);
      setLoading(false);
    })();
  }, [projetoId]);

  const handleSave = async () => {
    setSaving(true);
    let error;
    if (existingId) {
      ({ error } = await supabase.from('custos_obra' as any).update({ custo_kit: valor }).eq('id', existingId));
    } else {
      ({ error } = await supabase.from('custos_obra' as any).insert({ projeto_id: projetoId, custo_kit: valor }));
    }
    if (error) {
      toast.error('Erro ao salvar custo do kit: ' + error.message);
      setSaving(false);
      return;
    }
    toast.success('Custo do kit enviado para o módulo de Custos!');
    onSaved?.();
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="w-5 h-5 text-primary" /> Custo do kit — {nomeCliente}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Equipamento pago. Informe o valor pago no kit — ele será registrado em <strong>Custos</strong> deste projeto.
            </p>
            {sugestao && (
              <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/20 rounded-md p-2">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div>
                  Sugestão da Tabela de Preços (linha <strong>{sugestao.linha}</strong>):{' '}
                  <strong>R$ {sugestao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. Edite se necessário.
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Custo do Kit (R$)</Label>
              <MoneyInput
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={valor}
                onChange={setValor}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>Pular</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar em Custos'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
