

# PDF da proposta — HTML estilizado (4 páginas)

## Estrutura
1. **Capa** — `image3.jpg` com overlay verde + "Proposta Comercial" + cliente + nº TLS-XXXX + data
2. **Dados + Investimento** — Equipamentos, Especificações, Investimento (à vista + 5 parcelas), Economia mensal, Payback, Geração×Consumo
3. **Fluxo de caixa + Diferenciais** — Tabela 5/10/15/20/25 anos + 8 cards de diferenciais
4. **Portfólio** — Grade 4×4 (até 16 fotos da tabela `fotos_portfolio`, fallback para `FALLBACK_PHOTOS`)

Cabeçalho (logo + nº proposta) e rodapé (CNPJ + contato + site) em todas as páginas internas (2, 3, 4).

## Estilo
- Fonte Arial, cores TLS (verde `#4A5A2A`, amarelo `#E8B84B`)
- Replicar visual da proposta online: cards com sombra leve, badges, gradientes sutis
- Sem posicionamento absoluto — layout fluido com flex/grid

## Cálculos (validar mecanismo do fluxo de caixa)
Reusar exatamente as fórmulas já presentes em `ProposalPage.tsx` / `calculations.ts`:
- Geração mensal (kWh) = `kWp × irradiância × 30 × 0.80`
- Economia mensal = `geração × tarifa`
- Payback = `investimento / economia_anual`
- Fluxo 5–25 anos com inflação tarifária e degradação do painel — copiar a função usada no card expansível
- Parcelas: multiplicadores fixos (24x 1.4496, 36x 1.6008, 48x 1.7600, 60x 1.9264, 72x 2.0800)

## Arquivos
- **Reescrever** `src/components/PropostaTemplatePages.tsx` → layout fluido inspirado na proposta online
- **Editar** `src/lib/generatePropostaPDF.ts` → `scale: 1.5`, JPEG q70, otimizar fotos do portfólio (max 800px lado, q60) para alvo ~600 KB–1 MB
- **Editar** `src/pages/ProposalPage.tsx` → passar dados completos (fluxo de caixa + portfólio + diferenciais) para o componente
- **Manter** `src/assets/proposta-template/image3.jpg` (capa); descartar uso de image1/2/4 com posicionamento absoluto
- Buscar fotos do portfólio via `supabase.from('fotos_portfolio')` no momento da geração

## Garantia ≤ 2 MB (foco em leveza)
- `html2canvas` scale 1.5 (em vez de 2)
- JPEG qualidade 0.70
- Fotos do portfólio pré-redimensionadas para 400×400 px, qualidade 0.55, antes de entrar no DOM
- Estimativa: 4 páginas × ~150 KB + 16 thumbs × ~25 KB ≈ 1 MB

## Fora do escopo
- Mudar o template DOCX (continua intacto)
- Cache do PDF no Storage

