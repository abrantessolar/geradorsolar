
# Visualizar e editar o gerador de PDF da proposta

## Problema
Hoje o PDF da proposta é gerado programaticamente (via `html2pdf.js` / `jsPDF` em `src/lib/generatePDF.ts`), mas não existe uma forma de **pré-visualizar** o resultado dentro do app antes de baixar — então fica difícil iterar no layout junto.

## Objetivo
Criar uma tela de pré-visualização do PDF da proposta, embutida no app, para que possamos ajustar o layout visualmente em tempo real.

## O que vamos fazer

### 1. Botão "Visualizar PDF" na proposta
Na página `/proposta/:id` (`src/pages/ProposalPage.tsx`), adicionar ao lado do botão "Baixar PDF" um botão **"Visualizar PDF"** que abre um modal em tela cheia com o PDF renderizado dentro de um `<iframe>`.

### 2. Modal de pré-visualização
Novo componente `src/components/PDFPreviewModal.tsx`:
- Gera o PDF em memória (sem disparar download)
- Cria uma `Blob URL` e mostra dentro de um `<iframe>` ocupando ~90% da tela
- Botões no topo: **Baixar**, **Recarregar** (regenera após mudanças), **Fechar**
- Indicador de loading enquanto gera

### 3. Refatorar `generatePDF.ts` para suportar preview
Atualmente o `generatePDF` força o download. Vamos:
- Adicionar parâmetro `mode: 'download' | 'blob'`
- Quando `'blob'`, retorna o `Blob` em vez de salvar
- O modal usa `'blob'`, o botão antigo continua usando `'download'`

### 4. Modo "edição assistida"
Para facilitar nossa colaboração, no modo preview vamos:
- Mostrar **réguas de página** (A4: 210×297mm) no iframe wrapper
- Listar no painel lateral as **seções renderizadas** (Capa, Resumo, Equipamentos, Fluxo de caixa, Portfolio, Diferenciais, Rodapé) com toggles para ligar/desligar cada uma — assim você me diz exatamente o que quer mudar em cada bloco

### 5. Acesso rápido em outros lugares
Adicionar o mesmo botão "Visualizar PDF" também em:
- `ProjetosUnificados` / `ProjetosList` — ação na linha do projeto
- Lista de propostas no painel admin

## Diagrama do fluxo

```text
[Proposta /proposta/:id]
   │
   ├── Botão "Baixar PDF"     → generatePDF(mode:'download')  → arquivo .pdf
   │
   └── Botão "Visualizar PDF" → generatePDF(mode:'blob')
                                   │
                                   ▼
                          [PDFPreviewModal]
                          ┌──────────────────────────┐
                          │ Toolbar: Baixar | Recarregar | Fechar
                          ├──────────────┬───────────┤
                          │   <iframe>   │  Seções   │
                          │   PDF blob   │  toggles  │
                          └──────────────┴───────────┘
```

## Detalhes técnicos
- Arquivos novos: `src/components/PDFPreviewModal.tsx`
- Arquivos editados: `src/lib/generatePDF.ts`, `src/pages/ProposalPage.tsx`, `src/components/gestor/ProjetosUnificados.tsx`
- `iframe` recebe `URL.createObjectURL(blob)` e revoga ao fechar
- Sem novas dependências — `html2pdf.js`/`jsPDF` já estão no projeto
- Sem mudanças no banco de dados

## Fora do escopo (nesta etapa)
- Edição WYSIWYG do PDF (arrastar elementos). O foco aqui é **ver e iterar via chat** — você visualiza, me diz o que mudar, eu ajusto o código e você recarrega.
