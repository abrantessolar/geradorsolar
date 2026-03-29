import { useState, useEffect } from 'react';
import { Save, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getConfigDB, saveConfigDB } from '@/data/supabaseStore';
import type { PdfTemplateSettings } from '@/data/pdfTemplateTypes';
import { DEFAULT_PDF_TEMPLATE } from '@/data/pdfTemplateTypes';

export default function PdfTemplateEditor() {
  const [settings, setSettings] = useState<PdfTemplateSettings>(DEFAULT_PDF_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getConfigDB('pdf_template');
      if (saved) setSettings({ ...DEFAULT_PDF_TEMPLATE, ...saved });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    await saveConfigDB('pdf_template', settings);
    setSaving(false);
    toast.success('Modelo de PDF salvo!');
  };

  const restore = () => {
    setSettings(DEFAULT_PDF_TEMPLATE);
    toast.info('Modelo restaurado ao padrão (salve para confirmar)');
  };

  const update = <K extends keyof PdfTemplateSettings>(
    section: K,
    field: string,
    value: any,
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const updateNested = (section: keyof PdfTemplateSettings, parent: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: { ...(prev[section] as any)[parent], [field]: value },
      },
    }));
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Editor de Modelo de Proposta PDF</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={restore} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <RotateCcw className="w-4 h-4" /> Restaurar padrão
          </button>
          <button onClick={save} disabled={saving} className="solar-btn-primary text-sm py-2 px-3 flex items-center gap-1">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar modelo'}
          </button>
        </div>
      </div>

      {/* CAPA */}
      <Section title="Página 1 — Capa">
        <ToggleRow label="Mostrar cidade na barra" checked={settings.cover.showCity} onChange={v => update('cover', 'showCity', v)} />
        <ToggleRow label="Mostrar número da proposta" checked={settings.cover.showProposalNumber} onChange={v => update('cover', 'showProposalNumber', v)} />
        <div className="space-y-1">
          <Label className="text-sm">Posição do logo</Label>
          <Select value={settings.cover.logoPosition} onValueChange={v => update('cover', 'logoPosition', v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Texto acima do nome do cliente (opcional)</Label>
          <Input value={settings.cover.headerText} onChange={e => update('cover', 'headerText', e.target.value)} placeholder="Ex: Proposta personalizada para" />
        </div>
      </Section>

      {/* PORTFÓLIO */}
      <Section title="Página 2 — Portfólio">
        <ToggleRow label="Usar fotos cadastradas no admin (em vez de imagem fixa)" checked={settings.portfolio.useDbPhotos} onChange={v => update('portfolio', 'useDbPhotos', v)} />
        {settings.portfolio.useDbPhotos && (
          <>
            <div className="space-y-1">
              <Label className="text-sm">Quantidade de fotos</Label>
              <Select value={String(settings.portfolio.photoCount)} onValueChange={v => update('portfolio', 'photoCount', Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 fotos</SelectItem>
                  <SelectItem value="9">9 fotos</SelectItem>
                  <SelectItem value="12">12 fotos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Layout da grade</Label>
              <Select value={settings.portfolio.layout} onValueChange={v => update('portfolio', 'layout', v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2x3">2×3</SelectItem>
                  <SelectItem value="3x3">3×3</SelectItem>
                  <SelectItem value="3x4">3×4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </Section>

      {/* ESPECIFICAÇÕES */}
      <Section title="Página 3 — Especificações e Investimento">
        <p className="text-xs text-muted-foreground mb-2">Itens inclusos na proposta:</p>
        <ToggleRow label="Material de instalação" checked={settings.specs.showMaterial} onChange={v => update('specs', 'showMaterial', v)} />
        <ToggleRow label="Análise de sombreamento 3D com drone" checked={settings.specs.showShadowAnalysis} onChange={v => update('specs', 'showShadowAnalysis', v)} />
        <ToggleRow label="Homologação do projeto" checked={settings.specs.showHomologation} onChange={v => update('specs', 'showHomologation', v)} />
        <ToggleRow label="Monitoramento" checked={settings.specs.showMonitoring} onChange={v => update('specs', 'showMonitoring', v)} />
        <ToggleRow label="Garantia" checked={settings.specs.showWarranty} onChange={v => update('specs', 'showWarranty', v)} />
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2">Parcelamentos exibidos no financiamento:</p>
          <ToggleRow label="72×" checked={settings.specs.installments.show72x} onChange={v => updateNested('specs', 'installments', 'show72x', v)} />
          <ToggleRow label="60×" checked={settings.specs.installments.show60x} onChange={v => updateNested('specs', 'installments', 'show60x', v)} />
          <ToggleRow label="48×" checked={settings.specs.installments.show48x} onChange={v => updateNested('specs', 'installments', 'show48x', v)} />
          <ToggleRow label="36×" checked={settings.specs.installments.show36x} onChange={v => updateNested('specs', 'installments', 'show36x', v)} />
          <ToggleRow label="24×" checked={settings.specs.installments.show24x} onChange={v => updateNested('specs', 'installments', 'show24x', v)} />
        </div>
      </Section>

      {/* RETORNO FINANCEIRO */}
      <Section title="Página 4 — Retorno Financeiro">
        <ToggleRow label="Payback (à vista)" checked={settings.financial.showPayback} onChange={v => update('financial', 'showPayback', v)} />
        <ToggleRow label="Perda mensal" checked={settings.financial.showMonthlyLoss} onChange={v => update('financial', 'showMonthlyLoss', v)} />
        <ToggleRow label="Economia em 5 anos" checked={settings.financial.showReturn5} onChange={v => update('financial', 'showReturn5', v)} />
        <ToggleRow label="Economia em 10 anos" checked={settings.financial.showReturn10} onChange={v => update('financial', 'showReturn10', v)} />
        <ToggleRow label="Economia em 15 anos" checked={settings.financial.showReturn15} onChange={v => update('financial', 'showReturn15', v)} />
        <ToggleRow label="Retorno em 25 anos" checked={settings.financial.showReturn25} onChange={v => update('financial', 'showReturn25', v)} />
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2">Custo sem energia solar:</p>
          <ToggleRow label="Sem solar em 5 anos" checked={settings.financial.showWithout5} onChange={v => update('financial', 'showWithout5', v)} />
          <ToggleRow label="Sem solar em 10 anos" checked={settings.financial.showWithout10} onChange={v => update('financial', 'showWithout10', v)} />
        </div>
        <div className="space-y-1 mt-3">
          <Label className="text-sm">Texto de rodapé personalizado (opcional)</Label>
          <Textarea value={settings.financial.footerText} onChange={e => update('financial', 'footerText', e.target.value)} placeholder="Texto adicional no rodapé da página de retorno financeiro" rows={2} />
        </div>
      </Section>

      {/* RODAPÉ */}
      <Section title="Rodapé (todas as páginas)">
        <p className="text-xs text-muted-foreground mb-2">Itens visíveis no rodapé:</p>
        <ToggleRow label="Telefone" checked={settings.footer.showPhone} onChange={v => update('footer', 'showPhone', v)} />
        {settings.footer.showPhone && (
          <Input className="ml-8 w-64" value={settings.footer.customPhone} onChange={e => update('footer', 'customPhone', e.target.value)} placeholder="Usar padrão das configurações" />
        )}
        <ToggleRow label="E-mail" checked={settings.footer.showEmail} onChange={v => update('footer', 'showEmail', v)} />
        {settings.footer.showEmail && (
          <Input className="ml-8 w-64" value={settings.footer.customEmail} onChange={e => update('footer', 'customEmail', e.target.value)} placeholder="Usar padrão das configurações" />
        )}
        <ToggleRow label="CNPJ" checked={settings.footer.showCnpj} onChange={v => update('footer', 'showCnpj', v)} />
        {settings.footer.showCnpj && (
          <Input className="ml-8 w-64" value={settings.footer.customCnpj} onChange={e => update('footer', 'customCnpj', e.target.value)} placeholder="Usar padrão das configurações" />
        )}
        <ToggleRow label="Site" checked={settings.footer.showSite} onChange={v => update('footer', 'showSite', v)} />
        {settings.footer.showSite && (
          <Input className="ml-8 w-64" value={settings.footer.customSite} onChange={e => update('footer', 'customSite', e.target.value)} placeholder="Usar padrão das configurações" />
        )}
        <ToggleRow label="Redes sociais" checked={settings.footer.showSocial} onChange={v => update('footer', 'showSocial', v)} />
        {settings.footer.showSocial && (
          <Input className="ml-8 w-64" value={settings.footer.customSocial} onChange={e => update('footer', 'customSocial', e.target.value)} placeholder="Usar padrão das configurações" />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="solar-card p-5 space-y-3">
      <h3 className="font-bold text-sm text-primary border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm font-normal cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
