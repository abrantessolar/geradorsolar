## Ajustes na Proposta em PDF

Todas as alterações em `src/components/PropostaTemplatePages.tsx`.

### 1. Payback — descer 2mm
- Linha 654: trocar `transform: 'translateY(-30px)'` por `transform: 'translateY(-22px)'` (~2mm a menos de offset para cima → o "1,8" desce 2mm).

### 2. Subtítulo da seção "Nossos Projetos" (última página)
- Linha 859: substituir
  - de: `Quase uma década entregando energia limpa em Três Lagoas e região`
  - para: `Projetos entregues com excelência técnica, como você merece`

### 3. Telefone do representante na CTA final (última página)
- Bloco linhas 921–928: a CTA atualmente já mostra `data.responsavel_telefone || '(67) 99644-8995'` mas o `data.responsavel_email` não aparece em lugar nenhum nesta página. Verificar o caso reportado: garantir que **quando `responsavel_telefone` está vazio**, ele caia no fallback `(67) 99644-8995` (já está). Acrescentar abaixo do nome do representante uma linha com o e-mail dele:
```tsx
{data.responsavel_email && (
  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, fontFamily: 'Arial, sans-serif' }}>
    {data.responsavel_email}
  </div>
)}
```

### 4. Reordenação das páginas (1-2-3-4 → 1-4-2-3)
Hoje o JSX renderiza nesta ordem:
- P1 (425–485): Capa
- P2 (491–624): Especificações + Gráfico + Diferenciais
- P3 (630–843): Investimento + Fluxo de Caixa
- P4 (849–932): Portfólio + CTA

Nova ordem desejada:
- 1ª: Capa (atual P1)
- 2ª: Portfólio + CTA (atual P4)
- 3ª: Especificações + Gráfico + Diferenciais (atual P2)
- 4ª: Investimento + Fluxo de Caixa (atual P3)

Implementação: **mover o bloco JSX da P4 (linhas 847–932) para logo após o fechamento da P1 (linha 485)**, mantendo os comentários de cabeçalho atualizados:
- `PÁGINA 2 — PORTFÓLIO`
- `PÁGINA 3 — ESPECIFICAÇÕES + GRÁFICO + DIFERENCIAIS`
- `PÁGINA 4 — INVESTIMENTO + FLUXO DE CAIXA`

Como `generatePropostaPDF.ts` itera sobre `pagesContainer.children` na ordem do DOM, basta a reordenação do JSX — nada mais precisa mudar.

### 5. Auditoria de contraste (legibilidade quando impresso)
A paleta atual usa dois cinzas para textos pequenos:
- `GRAY = '#7a7a7a'` — usado em legendas, descrições de diferenciais (12–14px)
- `GRAY_LIGHT = '#a8a8a8'` — usado em rótulos uppercase, "*valores aproximados", "de" (10–11px)

Esses tons ficam fracos em impressão, especialmente em fontes ≤12px. Proposta:
- `GRAY` → `#4a4a4a` (cinza escuro, ainda não preto)
- `GRAY_LIGHT` → `#6a6a6a` (cinza médio para rótulos secundários)

Aplicar substituindo apenas as duas constantes nas linhas 74–75. Como todos os usos passam pelas constantes, o ajuste se propaga automaticamente para:
- Rótulos uppercase ("ESPECIFICAÇÕES TÉCNICAS", etc.)
- Legendas dos eixos do gráfico mensal
- "Geração" / "Consumo" da legenda do gráfico
- Textos dos cards de diferenciais
- "*valores aproximados" e linhas "de" das parcelas
- Subtítulo da seção de portfólio
- Subtexto da CTA final (mantém-se com `opacity` sobre branco — não afetado)

### Resumo dos arquivos alterados
- `src/components/PropostaTemplatePages.tsx` (todas as mudanças acima)