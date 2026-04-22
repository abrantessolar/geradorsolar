

# Proposta comercial: validade, expiração, PDF fiel, WhatsApp e capa com foto

## Objetivo
Consolidar 5 melhorias na proposta `/proposta/:id`:
1. PDF gerado a partir da própria página (fiel ao que o cliente vê)
2. Validade de 10 dias com badge
3. Expiração total do link após 30 dias
4. Botões "Tirar dúvida no WhatsApp" com o consultor
5. Foto da fachada da empresa como background na capa

## 1. PDF fiel à página (`src/lib/generatePDFFromPage.ts` — novo)
- Captura as seções já renderizadas com `html2canvas` (escala 2x)
- Monta páginas A4 no `jsPDF`, quebrando seções longas automaticamente
- Antes de capturar: expande blocos colapsados (fluxo de caixa) e esconde elementos com classe `.no-print`
- "Baixar PDF" e "Visualizar PDF" passam a usar essa função

## 2. Validade + 3. Expiração (em `ProposalPage.tsx`)
Constantes no topo: `VALIDITY_DAYS = 10`, `EXPIRY_DAYS = 30`.

Cálculo a partir de `proposta.criado_em`:

```text
≤ 10 dias → VÁLIDA   → badge verde "✓ Válida até DD/MM/AAAA"
11–30 dias → VENCIDA → badge vermelho "⚠ Orçamento fora de validade desde DD/MM/AAAA"
> 30 dias → EXPIRADA → tela bloqueada substitui todo o conteúdo
```

Tela de expiração:
- Logo TLS centralizada
- "Este orçamento expirou em DD/MM/AAAA"
- Botão "Falar no WhatsApp" (telefone do vendedor ou padrão da empresa)

## 4. Botões "Tirar dúvida no WhatsApp"
Usando o helper já existente `formatWhatsAppUrl` de `src/components/gestor/WhatsAppLink.tsx`:
- Botão flutuante no canto inferior direito (ícone WhatsApp + "Tire suas dúvidas") — visível em toda a proposta, com `.no-print`
- Botão inline no rodapé da proposta: "Falar com [nome do consultor] no WhatsApp"
- Mensagem pré-preenchida: `?text=Olá ${vendedor}, tenho dúvidas sobre a proposta TLS-XXXX`
- Telefone vem de `proposta.vendedor.telefone`; fallback para número fixo da empresa

## 5. Foto da fachada como background da capa
- Identificar a foto da fachada usada na home (`LandingPage.tsx` / hero) — provavelmente em `src/assets/`
- Aplicar como `background-image` na seção de capa da proposta com:
  - `background-size: cover`
  - Overlay escuro (gradient `rgba(0,0,0,0.55)` → `rgba(0,0,0,0.75)`) para legibilidade do texto branco
  - Mantém logo, número da proposta, nome do cliente e badge de validade por cima
- Funciona tanto na tela quanto no PDF (já que captura o HTML)

## Arquivos
- **Novo**: `src/lib/generatePDFFromPage.ts`
- **Editado**: `src/pages/ProposalPage.tsx` — refs/markers de seções, badge validade, tela expiração, botões WhatsApp, capa com background
- **Editado**: `src/index.css` — classe `.no-print`

## Detalhes técnicos
- Sem novas dependências (`html2canvas`, `jsPDF`, ícones lucide já existem)
- Sem mudanças de banco de dados — tudo derivado de `criado_em`
- O `PDFCanvasViewer` continua igual; só muda a fonte do blob

## Fora do escopo
- Notificações automáticas de "sua proposta vai vencer"
- Renovação com novos preços
- Reescrever o layout HTML da proposta (vamos capturar o atual)

