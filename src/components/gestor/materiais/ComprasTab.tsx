import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, FileDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import type { Material, Fornecedor } from './types';

type ObraPendente = {
  id: string;
  nome_completo: string | null;
  potencia_inversor: string | null;
};

type NecessidadeItem = {
  material_id: string;
  nome: string;
  categoria: string;
  fornecedor_nome: string;
  fornecedor_id: string | null;
  estoque_atual: number;
  necessario: number;
  a_comprar: number;
  preco_unitario: number | null;
  valor_total: number | null;
  unidade: string;
};

export default function ComprasTab() {
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<ObraPendente[]>([]);
  const [itens, setItens] = useState<NecessidadeItem[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filtroFornecedores, setFiltroFornecedores] = useState<string[]>([]);
  const [showFornFilter, setShowFornFilter] = useState(false);

  useEffect(() => { calcular(); }, []);

  const calcular = async () => {
    setLoading(true);
    try {
      // 1. Buscar obras pendentes (não instaladas e não congeladas)
      const { data: obrasData } = await supabase
        .from('projetos')
        .select('id, nome_completo, potencia_inversor')
        .eq('congelado', false)
        .is('data_instalacao', null)
        .not('status', 'eq', 'Concluído');

      const obrasPendentes = (obrasData || []) as ObraPendente[];
      setObras(obrasPendentes);

      // 2. Buscar materiais, quantidades padrão, estoque e fornecedores
      const [{ data: mats }, { data: qtdPadrao }, { data: estoque }, { data: forns }] = await Promise.all([
        supabase.from('materiais').select('*').eq('ativo', true),
        supabase.from('materiais_quantidades_padrao').select('*'),
        supabase.from('estoque').select('*'),
        supabase.from('fornecedores_materiais').select('*').eq('ativo', true).order('nome'),
      ]);

      setFornecedores((forns || []) as Fornecedor[]);

      // Maps
      const estoqueMap: Record<string, number> = {};
      (estoque || []).forEach((e: any) => { estoqueMap[e.material_id] = e.quantidade_atual || 0; });

      const qtdMap: Record<string, Record<string, number>> = {};
      (qtdPadrao || []).forEach((q: any) => {
        if (!qtdMap[q.material_id]) qtdMap[q.material_id] = {};
        qtdMap[q.material_id][q.potencia] = q.quantidade;
      });

      const fornMap: Record<string, string> = {};
      (forns || []).forEach((f: any) => { fornMap[f.id] = f.nome; });

      // 3. Para cada obra, identificar potência e somar quantidades
      const necessidadeTotal: Record<string, number> = {};
      
      obrasPendentes.forEach(obra => {
        const pot = obra.potencia_inversor?.trim();
        if (!pot) return;
        
        // Mapear potência do inversor para chave da tabela padrão
        const potKey = mapPotencia(pot);
        if (!potKey) return;

        (mats || []).forEach((mat: any) => {
          const qtd = qtdMap[mat.id]?.[potKey] || 0;
          if (qtd > 0) {
            necessidadeTotal[mat.id] = (necessidadeTotal[mat.id] || 0) + qtd;
          }
        });
      });

      // 4. Montar lista de itens
      const resultado: NecessidadeItem[] = (mats || [])
        .filter((mat: any) => necessidadeTotal[mat.id] > 0)
        .map((mat: any) => {
          const necessario = necessidadeTotal[mat.id] || 0;
          const estoqueAtual = estoqueMap[mat.id] || 0;
          const aComprar = Math.max(0, necessario - estoqueAtual);
          return {
            material_id: mat.id,
            nome: mat.nome,
            categoria: mat.categoria,
            fornecedor_nome: mat.fornecedor_id ? (fornMap[mat.fornecedor_id] || 'Sem fornecedor') : 'Sem fornecedor',
            fornecedor_id: mat.fornecedor_id,
            estoque_atual: estoqueAtual,
            necessario,
            a_comprar: aComprar,
            preco_unitario: mat.preco_unitario ? Number(mat.preco_unitario) : null,
            valor_total: aComprar > 0 && mat.preco_unitario ? aComprar * Number(mat.preco_unitario) : null,
            unidade: mat.unidade,
          };
        })
        .sort((a, b) => b.a_comprar - a.a_comprar);

      setItens(resultado);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao calcular necessidades');
    }
    setLoading(false);
  };

  // Mapeia potência do inversor do projeto para chave da tabela padrão
  const mapPotencia = (pot: string): string | null => {
    const p = pot.trim().toUpperCase();
    // Micro inversores
    if (p.includes('MICRO')) {
      const num = p.replace(/[^0-9]/g, '');
      return num ? `${num} MICRO` : '1 MICRO';
    }
    // Extrair número
    const match = p.match(/[\d.]+/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    // kW values
    if (num <= 3) return '3';
    if (num <= 4) return '4';
    if (num <= 5) return '5';
    if (num <= 6) return '6';
    if (num <= 7.5) return '7.5';
    if (num <= 8) return '8';
    if (num <= 10) return '10';
    return '10';
  };

  const itensFiltrados = useMemo(() => {
    if (filtroFornecedores.length === 0) return itens;
    return itens.filter(i => filtroFornecedores.includes(i.fornecedor_id || '__sem'));
  }, [itens, filtroFornecedores]);

  const totalComprar = itensFiltrados.filter(i => i.a_comprar > 0).length;
  const valorEstimado = itensFiltrados.reduce((sum, i) => sum + (i.valor_total || 0), 0);

  const toggleFornecedor = (id: string) => {
    setFiltroFornecedores(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const getCorLinha = (item: NecessidadeItem) => {
    if (item.a_comprar === 0) return 'bg-green-500/10';
    if (item.a_comprar < item.necessario * 0.2) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  const gerarPDF = async () => {
    const itensCompra = itensFiltrados.filter(i => i.a_comprar > 0);
    if (itensCompra.length === 0) {
      toast.info('Nenhum item precisa ser comprado');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;

      // Cabeçalho
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TRÊS LAGOAS SOLAR', pw / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(14);
      doc.text('Lista de Compras', pw / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pw / 2, y, { align: 'center' });
      y += 6;
      doc.text(`Baseado em ${obras.length} obras pendentes`, pw / 2, y, { align: 'center' });
      y += 6;
      if (filtroFornecedores.length > 0) {
        const nomes = filtroFornecedores.map(id => {
          if (id === '__sem') return 'Sem fornecedor';
          return fornecedores.find(f => f.id === id)?.nome || id;
        }).join(', ');
        doc.text(`Filtro: ${nomes}`, pw / 2, y, { align: 'center' });
        y += 6;
      }
      y += 4;

      // Agrupar por fornecedor
      const agrupado: Record<string, NecessidadeItem[]> = {};
      itensCompra.forEach(item => {
        const key = item.fornecedor_nome;
        if (!agrupado[key]) agrupado[key] = [];
        agrupado[key].push(item);
      });

      let totalGeral = 0;
      const colX = [14, 110, 140, 170];

      for (const [fornecedor, items] of Object.entries(agrupado)) {
        if (y > 260) { doc.addPage(); y = 20; }

        // Título fornecedor
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 4, pw - 20, 7, 'F');
        doc.text(fornecedor, 14, y);
        y += 10;

        // Cabeçalho tabela
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Material', colX[0], y);
        doc.text('Qtd', colX[1], y);
        doc.text('Preço Unit.', colX[2], y);
        doc.text('Valor Total', colX[3], y);
        y += 2;
        doc.line(10, y, pw - 10, y);
        y += 5;

        // Itens
        doc.setFont('helvetica', 'normal');
        let subtotal = 0;
        items.forEach(item => {
          if (y > 275) { doc.addPage(); y = 20; }
          const nome = item.nome.length > 50 ? item.nome.substring(0, 47) + '...' : item.nome;
          doc.text(nome, colX[0], y);
          doc.text(`${item.a_comprar} ${item.unidade}`, colX[1], y);
          doc.text(item.preco_unitario ? `R$ ${item.preco_unitario.toFixed(2)}` : '-', colX[2], y);
          const vt = item.valor_total || 0;
          doc.text(vt > 0 ? `R$ ${vt.toFixed(2)}` : '-', colX[3], y);
          subtotal += vt;
          y += 6;
        });

        // Subtotal
        doc.setFont('helvetica', 'bold');
        y += 2;
        doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, colX[3] - 20, y);
        totalGeral += subtotal;
        y += 10;
      }

      // Total geral
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.line(10, y, pw - 10, y);
      y += 8;
      doc.text(`TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`, pw - 14, y, { align: 'right' });
      y += 12;

      // Rodapé
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);
      doc.text('Três Lagoas Solar — (67) 99290-9078', pw - 14, 285, { align: 'right' });

      doc.save(`compras_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Calculando necessidades...</div>;

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{obras.length}</p>
            <p className="text-sm text-muted-foreground">Obras pendentes</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <div>
            <p className="text-2xl font-bold">{totalComprar}</p>
            <p className="text-sm text-muted-foreground">Itens a comprar</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">R$ {valorEstimado.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Valor estimado</p>
          </div>
        </div>
      </div>

      {/* Filtros e ações */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowFornFilter(!showFornFilter)}
            className="px-4 py-2 rounded-lg text-sm border bg-card hover:bg-muted/50 flex items-center gap-2"
          >
            🏭 Fornecedor {filtroFornecedores.length > 0 && `(${filtroFornecedores.length})`}
          </button>
          {showFornFilter && (
            <div className="absolute z-50 top-full mt-1 left-0 bg-card border rounded-lg shadow-lg p-2 min-w-[220px] max-h-60 overflow-y-auto">
              <button
                onClick={() => setFiltroFornecedores([])}
                className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted/50 font-medium"
              >
                ✅ Todos
              </button>
              <button
                onClick={() => toggleFornecedor('__sem')}
                className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted/50 ${filtroFornecedores.includes('__sem') ? 'bg-primary/10 font-medium' : ''}`}
              >
                Sem fornecedor
              </button>
              {fornecedores.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleFornecedor(f.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted/50 ${filtroFornecedores.includes(f.id) ? 'bg-primary/10 font-medium' : ''}`}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={calcular}
            className="px-4 py-2 rounded-lg text-sm bg-muted hover:bg-muted/70 flex items-center gap-2"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={gerarPDF}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> Gerar PDF de Compras
          </button>
        </div>
      </div>

      {/* Tabela */}
      {itensFiltrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-lg font-medium">Estoque suficiente!</p>
          <p className="text-sm">Nenhum material precisa ser comprado no momento.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">Necessário</TableHead>
                <TableHead className="text-center">A Comprar</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensFiltrados.map(item => (
                <TableRow key={item.material_id} className={getCorLinha(item)}>
                  <TableCell className="font-medium text-sm">{item.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.fornecedor_nome}</TableCell>
                  <TableCell className="text-center">{item.estoque_atual}</TableCell>
                  <TableCell className="text-center">{item.necessario}</TableCell>
                  <TableCell className="text-center font-bold">
                    {item.a_comprar === 0 ? (
                      <span className="text-green-600">✓ OK</span>
                    ) : (
                      <span className="text-red-600">{item.a_comprar}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.preco_unitario ? `R$ ${item.preco_unitario.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {item.valor_total ? `R$ ${item.valor_total.toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
