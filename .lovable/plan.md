

# Clarear background da capa da proposta

## Mudança
Reduzir o overlay escuro sobre a foto da fachada na capa da proposta (`/proposta/:id`) para deixar a imagem ~30% mais clara.

## Detalhe técnico
Em `src/pages/ProposalPage.tsx`, linha 507, ajustar o gradient do `backgroundImage`:

- **Antes**: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.78))` (overlay 55%→78%)
- **Depois**: `linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.50))` (overlay 30%→50%)

Isso clareia a imagem em ~30% mantendo legibilidade do texto branco (logo, título, dados do cliente). Caso o contraste fique ruim, adicionamos `text-shadow` mais forte como ajuste fino — mas as classes `drop-shadow-lg`/`drop-shadow-2xl` já presentes devem segurar bem.

## Arquivo
- **Editado**: `src/pages/ProposalPage.tsx` (apenas linha 507)

## Dica (Visual Edits)
Para ajustes visuais rápidos como este, você pode usar o **Visual Edits** (botão no canto inferior esquerdo do chat) — selecionar o elemento e mudar cores/opacidades direto, sem gastar créditos.

