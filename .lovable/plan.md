

# PDF da proposta a partir do template DOCX (Opção A)

## Objetivo
Substituir o PDF "print da tela" por um PDF gerado a partir do **mesmo template `.docx`** já usado no botão DOCX, garantindo layout idêntico ao Word e tamanho final ≤ 2 MB.

## Fluxo
```text
Cliente clica "Baixar PDF"
   ↓
Front-end monta as variáveis da proposta (mesmo objeto do DOCX)
   ↓
Edge function `proposta-pdf` recebe o JSON
   ↓
   1. Baixa template do Storage (templates/proposta_template.docx)
   2. Faz find & replace no XML (mesma lógica de generatePropostaDOCX.ts)
   3. Converte DOCX → PDF via LibreOffice headless
   4. Comprime/otimiza o PDF (Ghostscript /ebook) até ficar ≤ 2 MB
   ↓
Retorna o PDF (base64 ou stream) → download no browser
```

## 1. Edge function `supabase/functions/proposta-pdf/index.ts` (nova)
- Recebe `POST` com o mesmo payload do DOCX (`PropostaDocxData`)
- Reaproveita a lógica de `normalizePlaceholders` + `replaceAll` (porta para Deno)
- Usa **LibreOffice headless** (`soffice --headless --convert-to pdf`) para converter
- Pipeline de compressão (em ordem, para até passar de 2 MB):
  1. LibreOffice já exporta com `ReduceImageResolution=true, MaxImageResolution=150`
  2. Se > 2 MB → reprocessa com Ghostscript `-dPDFSETTINGS=/ebook` (150 dpi)
  3. Se ainda > 2 MB → `/screen` (72 dpi)
- Retorna `application/pdf` com `Content-Disposition: attachment`
- Validação de input com Zod, CORS habilitado, sem auth obrigatória (proposta é pública)

## 2. Front-end `src/lib/generatePropostaPDF.ts` (novo)
- Função `gerarPropostaPDF(data: PropostaDocxData)` que:
  - Chama a edge function via `supabase.functions.invoke('proposta-pdf', { body: data })`
  - Recebe o blob, dispara `saveAs(blob, 'Proposta_TLS-XXXX_Cliente.pdf')`
  - Loading toast: "Gerando PDF..." → sucesso/erro

## 3. `src/pages/ProposalPage.tsx`
- `handleDownloadPDF` e `handleVisualizarPDF` passam a chamar `gerarPropostaPDF` em vez de `generatePDFFromPage`
- "Visualizar PDF" abre o blob em nova aba (`URL.createObjectURL`)
- Mantém botão DOCX como está
- **Remove** `generatePDFFromPage.ts` e o fluxo de marcadores `data-pdf-section` (não serão mais usados)

## 4. Garantia ≤ 2 MB
- Template hoje é leve (sem fotos embutidas) → PDF base deve sair em ~200–400 KB
- Pipeline de compressão Ghostscript serve como rede de segurança caso futuras versões do template incluam imagens grandes
- Logs da edge function registram o tamanho final para monitoramento

## Arquivos
- **Novo**: `supabase/functions/proposta-pdf/index.ts`
- **Novo**: `src/lib/generatePropostaPDF.ts`
- **Editado**: `src/pages/ProposalPage.tsx` (troca da fonte do PDF, remove imports antigos)
- **Removido**: `src/lib/generatePDFFromPage.ts`
- **Editado**: `supabase/config.toml` (registra função sem JWT)

## Detalhes técnicos
- LibreOffice e Ghostscript já estão disponíveis no runtime das edge functions Supabase via container customizado padrão; caso indisponível, fallback para serviço externo (CloudConvert) — checaremos no primeiro deploy e ajustamos se necessário
- Sem mudanças no banco de dados
- Sem novas dependências no front-end (usa `supabase.functions.invoke` + `file-saver` já instalado)

## Fora do escopo
- Editar o conteúdo/layout do template `.docx` (continua sendo o arquivo já no Storage)
- Cache do PDF no Storage (gerado on-demand a cada clique)

