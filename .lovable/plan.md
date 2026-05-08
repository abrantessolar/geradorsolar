## Problema

No `/clientes → Projetos → Instalados`, a coluna **Cliente** aparece em branco para algumas obras concluídas — não há fallback quando `nome_completo` está vazio (PJ sem nome, registro vindo de `clientes_base` com nome ausente, etc.).

A consulta no banco confirma que vários projetos `Instalado/Homologado` têm `razao_social` vazio E `nome_completo` populado, mas o pipeline frontend não usa `razao_social` como fallback de forma consistente, e o tipo `ClienteBase` nem sequer carrega `razao_social`. Quando uma obra acaba de ser concluída e é mapeada via `fromProjetos`, o mapeamento usa `p.nome_completo || p.razao_social` — mas se ambos estiverem vazios (caso real para algumas obras antigas e PJ mal preenchidas) o resultado é `null` e a célula mostra apenas `—`.

## Correção

1. **`src/pages/ClientesPage.tsx` — `loadClientes`**
   - Adicionar `razao_social: p.razao_social || null` ao objeto retornado em `fromProjetos`.
   - Garantir que o `nome_completo` da fileira combine `nome_completo`, `razao_social`, ou primeiro item de `outros_nomes` antes de cair para `null`.

2. **`src/components/gestor/ClientesList.tsx`**
   - Estender o tipo `ClienteBase` com `razao_social?: string | null`.

3. **`src/components/gestor/ProjetosUnificados.tsx`**
   - Criar helper `displayClienteName(c)` que retorna a primeira opção não-vazia entre: `nome_completo`, `razao_social`, primeiro `outros_nomes[].nome`, e por último `CPF: ***.xxx`.
   - Usar esse helper:
     - Na coluna `cliente` da tabela desktop de Instalados.
     - No card mobile de Instalados (linha `{c.nome_completo || '—'}`).
     - No `DeleteConfirmModal` de cliente (`nome={...}`).

## Verificação

- Após a mudança, a obra concluída deve aparecer em "Instalados" com nome visível usando a melhor fonte disponível.
- Casos com PJ (apenas razão social) e registros de `clientes_base` parcialmente preenchidos passam a exibir um identificador legível.
- Nenhuma alteração no backend, RLS ou fluxo de "Concluir obra".
