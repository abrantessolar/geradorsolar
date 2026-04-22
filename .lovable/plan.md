
# Corrigir bloqueio do visualizador de PDF no preview

## Problema
O modal atual usa `<object>` + `<iframe>` com `Blob URL`, que depende do plugin de PDF nativo do navegador. Dentro do iframe sandboxed do preview do Lovable, esse plugin é bloqueado — resultado: tela em branco/bloqueio.

## Solução
Trocar a renderização nativa por **PDF.js** (renderiza cada página em `<canvas>`), que funciona em qualquer contexto, inclusive dentro do iframe do preview.

## Mudanças

### 1. Adicionar dependência
- `pdfjs-dist` (mantenedor oficial do PDF.js)

### 2. Novo componente `src/components/PDFCanvasViewer.tsx`
- Recebe um `Blob` (ou `ArrayBuffer`) do PDF
- Usa `pdfjsLib.getDocument()` para abrir
- Renderiza cada página em um `<canvas>` empilhado verticalmente, scroll vertical
- Toolbar simples: **Zoom +/−**, **Página atual / total**, **Baixar**, **Fechar**
- Loading state enquanto renderiza
- Worker do pdfjs configurado via import dinâmico do Vite

### 3. Atualizar `src/pages/ProposalPage.tsx`
- Remover `<object>`/`<iframe>` (linhas 905-907)
- Substituir pelo novo `<PDFCanvasViewer blob={pdfBlob} onClose={...} onDownload={...} />`
- Guardar o `Blob` em estado em vez de só a URL

## Detalhes técnicos
- `pdfjs-dist` worker: `import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` e `GlobalWorkerOptions.workerSrc = pdfjsWorker`
- Renderização em DPR 2x para nitidez em telas Retina
- Não muda nada em `generatePDF.ts` nem no fluxo de download — só a visualização

## Fora do escopo
- Edição inline do PDF
- Mudanças visuais no conteúdo da proposta
