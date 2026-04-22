import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustoObra, calcCustoTotal, calcLucroBruto, calcMargem, margemBgColor, fmt } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import MoneyInput from '@/components/ui/money-input';
import { Sparkles } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  projetoId: string;
  nomeCliente: string;
  qtdPlacas: number;
  precoVenda: number;
  onSaved: () => void;
};

export default function CustoModal({ open, onClose, projetoId, nomeCliente, qtdPlacas, precoVenda, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [materiaisDetalhe, setMateriaisDetalhe] = useState<{ nome: string; qtd: number; preco: number }[]>([]);
  const [showMateriais, setShowMateriais] = useState(false);
  const [autoFilled, setAutoFilled] = useState<{ kit?: number; ca?: number; tronco?: number; linha?: string }>({});

  const [form, setForm] = useState({
    custo_kit: 0,
    custo_instalacao: qtdPlacas * 100,
    custo_trt: 69,
    custo_materiais: 0,
    custo_material_ca: 0,
    custo_cabo_tronco: 0,
    custo_frete: 0,
    custo_homologacao: 0,
    custo_comissao: 0,
    custo_outros: 0,
    descricao_outros: '',
    observacoes: '',
  });

  useEffect(() => {
    if (!open) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projetoId]);

  const loadData = async () => {
    setLoading(true);

    // Carregar configurações para tabela CA + cabo tronco + instalação
    const { data: cfgRows } = await supabase
      .from('configuracoes' as any)
      .select('chave, valor')
      .in('chave', ['admin_settings', 'price_table']);

    let caTable: { maxKw: number; cost: number }[] = [];
    let installPrice = 100;
    let trunkPrice = 300;
    let priceTable: any[] = [];
    for (const row of (cfgRows || []) as any[]) {
      if (row.chave === 'admin_settings') {
        caTable = row.valor?.caMaterialTable || [];
        installPrice = row.valor?.installationPricePerPanel ?? 100;
        trunkPrice = row.valor?.trunkCablePrice ?? 300;
      }
      if (row.chave === 'price_table') {
        priceTable = row.valor || [];
      }
    }

    // Buscar projeto + proposta vinculada para descobrir linha
    const { data: proj } = await supabase
      .from('projetos' as any)
      .select('id, qtd_placas, qtd_inversores, potencia_inversor, marca_inversor, proposta_id, propostas:proposta_id(linha, dados_completos)')
      .eq('id', projetoId)
      .maybeSingle();

    const propostaLinha = (proj as any)?.propostas?.linha as string | undefined;
    const dadosCompletos = (proj as any)?.propostas?.dados_completos as any;
    const linha = propostaLinha || dadosCompletos?.selectedLine;
    const isPremium = linha === 'premium';

    // Custo do KIT a partir da price_table (linha + qtd_placas)
    let custoKitAuto = 0;
    if (linha && priceTable.length > 0) {
      const entry = priceTable.find((e: any) => e.panels === qtdPlacas);
      if (entry && typeof entry[linha] === 'number') {
        custoKitAuto = entry[linha];
      }
    }

    // Material CA a partir da potência REAL do inversor
    let custoCaAuto = 0;
    const potRaw = parseFloat(String((proj as any)?.potencia_inversor || '0').replace(',', '.'));
    const potKw = potRaw > 100 ? potRaw / 1000 : potRaw;
    const totalKwInv = isPremium
      ? potKw * ((proj as any)?.qtd_inversores || Math.ceil(qtdPlacas / 4))
      : potKw || 5;
    const caEntry = caTable.find(e => totalKwInv <= e.maxKw);
    custoCaAuto = caEntry?.cost || caTable[caTable.length - 1]?.cost || 0;

    // Cabo tronco (apenas micro/Premium)
    let custoTroncoAuto = 0;
    if (isPremium) {
      const microCount = (proj as any)?.qtd_inversores || Math.ceil(qtdPlacas / 4);
      custoTroncoAuto = Math.max(0, microCount - 1) * trunkPrice;
    }

    setAutoFilled({ kit: custoKitAuto, ca: custoCaAuto, tronco: custoTroncoAuto, linha });

    // Load existing cost record
    const { data: custo } = await supabase
      .from('custos_obra' as any)
      .select('*')
      .eq('projeto_id', projetoId)
      .maybeSingle();

    // Calculate materials cost from stock movements
    const { data: movs } = await supabase
      .from('movimentacoes_estoque' as any)
      .select('quantidade, material_id')
      .eq('obra_id', projetoId)
      .eq('tipo', 'saida');

    let custoMateriais = 0;
    const detalhes: { nome: string; qtd: number; preco: number }[] = [];

    if (movs && (movs as any[]).length > 0) {
      const matIds = [...new Set((movs as any[]).map((m: any) => m.material_id))];
      const { data: mats } = await supabase
        .from('materiais' as any)
        .select('id, nome, preco_unitario')
        .in('id', matIds);

      const matMap = new Map((mats || []).map((m: any) => [m.id, m]));
      const aggMap = new Map<string, number>();
      for (const m of movs as any[]) {
        aggMap.set(m.material_id, (aggMap.get(m.material_id) || 0) + m.quantidade);
      }
      for (const [matId, qtd] of aggMap) {
        const mat = matMap.get(matId);
        if (mat) {
          const preco = (mat.preco_unitario || 0) * qtd;
          custoMateriais += preco;
          detalhes.push({ nome: mat.nome, qtd, preco });
        }
      }
    }

    setMateriaisDetalhe(detalhes);

    if (custo) {
      const c = custo as any;
      setExistingId(c.id);
      setForm({
        custo_kit: c.custo_kit || custoKitAuto,
        custo_instalacao: c.custo_instalacao || qtdPlacas * installPrice,
        custo_trt: c.custo_trt ?? 69,
        custo_materiais: custoMateriais,
        custo_material_ca: c.custo_material_ca ?? custoCaAuto,
        custo_cabo_tronco: c.custo_cabo_tronco ?? custoTroncoAuto,
        custo_frete: c.custo_frete || 0,
        custo_homologacao: c.custo_homologacao || 0,
        custo_comissao: c.custo_comissao || 0,
        custo_outros: c.custo_outros || 0,
        descricao_outros: c.descricao_outros || '',
        observacoes: c.observacoes || '',
      });
    } else {
      setExistingId(null);
      setForm({
        custo_kit: custoKitAuto,
        custo_instalacao: qtdPlacas * installPrice,
        custo_trt: 69,
        custo_materiais: custoMateriais,
        custo_material_ca: custoCaAuto,
        custo_cabo_tronco: custoTroncoAuto,
        custo_frete: 0,
        custo_homologacao: 0,
        custo_comissao: 0,
        custo_outros: 0,
        descricao_outros: '',
        observacoes: '',
      });
    }
    setLoading(false);
  };

  const custoObj: Partial<CustoObra> = { ...form, preco_venda: precoVenda };
  const total = calcCustoTotal(custoObj);
  const lucro = calcLucroBruto(custoObj);
  const margem = calcMargem(custoObj);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      projeto_id: projetoId,
      custo_kit: form.custo_kit,
      custo_instalacao: form.custo_instalacao,
      custo_trt: form.custo_trt,
      custo_materiais: form.custo_materiais,
      custo_material_ca: form.custo_material_ca || 0,
      custo_cabo_tronco: form.custo_cabo_tronco || 0,
      custo_frete: form.custo_frete || null,
      custo_homologacao: form.custo_homologacao || null,
      custo_comissao: form.custo_comissao || null,
      custo_outros: form.custo_outros || null,
      descricao_outros: form.descricao_outros || null,
      preco_venda: precoVenda,
      observacoes: form.observacoes || null,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from('custos_obra' as any).update(payload).eq('id', existingId));
    } else {
      ({ error } = await supabase.from('custos_obra' as any).insert(payload));
    }

    if (error) {
      toast.error('Erro ao salvar custos: ' + error.message);
    } else {
      toast.success('Custos salvos com sucesso!');
      onSaved();
      onClose();
    }
    setSaving(false);
  };

  const setField = (k: string, v: number | string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-base">💰 Custos — {nomeCliente}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] px-4 pb-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-4">
              {autoFilled.linha && (autoFilled.kit || autoFilled.ca || autoFilled.tronco) ? (
                <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/20 rounded-md p-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <div>
                    Valores pré-preenchidos a partir da Tabela de Preços (linha <strong>{autoFilled.linha}</strong>).
                    Edite se necessário.
                  </div>
                </div>
              ) : null}

              {/* Kit */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">💼 Kit (Placas + Inversor)</h4>
                <div>
                  <Label className="text-xs">Custo do Kit (R$)</Label>
                  <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_kit} onChange={v => setField('custo_kit', v)} />
                </div>
              </div>

              {/* Instalação */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">🔧 Instalação</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Valor/placa</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_instalacao / (qtdPlacas || 1)} onChange={v => setField('custo_instalacao', v * (qtdPlacas || 1))} />
                  </div>
                  <div>
                    <Label className="text-xs">Placas</Label>
                    <Input value={qtdPlacas} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label className="text-xs">Total</Label>
                    <Input value={fmt(form.custo_instalacao)} readOnly className="bg-muted" />
                  </div>
                </div>
              </div>

              {/* TRT */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">📋 TRT</h4>
                <div>
                  <Label className="text-xs">Valor TRT (R$)</Label>
                  <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_trt} onChange={v => setField('custo_trt', v)} />
                </div>
              </div>

              {/* Material CA + Cabo Tronco */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">⚡ Material Elétrico</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Material CA (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_material_ca} onChange={v => setField('custo_material_ca', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Cabo Tronco (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_cabo_tronco} onChange={v => setField('custo_cabo_tronco', v)} />
                  </div>
                </div>
              </div>

              {/* Materiais retirados */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">📦 Materiais (Estoque)</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total materiais retirados: <strong>{fmt(form.custo_materiais)}</strong></span>
                  {materiaisDetalhe.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowMateriais(!showMateriais)}>
                      {showMateriais ? 'Ocultar' : 'Ver detalhes'}
                    </Button>
                  )}
                </div>
                {showMateriais && materiaisDetalhe.length > 0 && (
                  <div className="text-xs space-y-1 border-t pt-2 mt-1">
                    {materiaisDetalhe.map((m, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{m.nome} × {m.qtd}</span>
                        <span>{fmt(m.preco)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extras */}
              <div className="space-y-2 border rounded-lg p-3">
                <h4 className="font-semibold text-sm">📎 Custos Extras</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Frete (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_frete} onChange={v => setField('custo_frete', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Homologação (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_homologacao} onChange={v => setField('custo_homologacao', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Comissão (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_comissao} onChange={v => setField('custo_comissao', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Outros (R$)</Label>
                    <MoneyInput className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.custo_outros} onChange={v => setField('custo_outros', v)} />
                  </div>
                </div>
                {(form.custo_outros || 0) > 0 && (
                  <div>
                    <Label className="text-xs">Descrição outros</Label>
                    <Input value={form.descricao_outros} onChange={e => setField('descricao_outros', e.target.value)} />
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)} rows={2} />
              </div>

              {/* Resumo */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preço de Venda</span>
                  <strong>{fmt(precoVenda)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Custo Total</span>
                  <strong className="text-destructive">{fmt(total)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Lucro Bruto</span>
                  <strong className={lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(lucro)}</strong>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Margem</span>
                  <strong className={margem > 20 ? 'text-green-600' : margem >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                    {margem.toFixed(1)}%
                  </strong>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${margemBgColor(margem)}`} style={{ width: `${Math.min(Math.max(margem, 0), 100)}%` }} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Salvando...' : existingId ? 'Atualizar Custos' : 'Salvar Custos'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
