# Nova página final no PDF da proposta — Galeria de Instalações

Adicionar uma 5ª página ao PDF gerado pela calculadora (botão PDF na proposta), no mesmo padrão visual das outras páginas.

## O que a página terá

- Header verde com o número da proposta (igual às demais páginas)
- Selo/rótulo "Nossas Instalações" + título "Qualidade em cada detalhe"
- Linha de apoio curta: instalações reais executadas pela equipe Três Lagoas Solar
- A imagem enviada (mosaico de inversores instalados) ocupando o corpo da página, com cantos arredondados e borda suave, mantendo proporção sem distorção
- Rodapé padrão da proposta (endereço, telefone, e-mail, site)

## Como será feito

- Adicionar a imagem enviada em `src/assets/proposta-template/` e importá-la no template
- Em `src/components/PropostaTemplatePages.tsx`, acrescentar um novo `<Page>` após a página 4 (Investimento), usando `Header`, `SectionLabel` e `Footer` já existentes e a mesma paleta (verde #4A5A2A, amarelo #E8B84B) e estilos inline exigidos pelo html2canvas
- A geração do PDF em `src/lib/generatePropostaPDF.ts` percorre automaticamente todas as páginas filhas, então o PDF passa a ter 5 páginas sem outras mudanças
- A imagem será dimensionada para caber na área útil (1241×1755 px por página) preservando o aspecto original

## Verificação

Gerar o PDF de uma proposta e conferir visualmente a página nova: sem corte de imagem, sem sobreposição com header/rodapé e sem estouro para uma 6ª página.
