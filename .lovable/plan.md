## Objetivo

Garantir que cada dado armazenado apareça onde deveria, eliminar pontos onde a informação se perde entre módulos, e fazer venda → projeto → acompanhamento → pós-venda → custos funcionarem como um fluxo único. Inclui o pedido do preço do kit na etapa "Equipamento pago", indo direto para Custos.

---

## 1. "Ver dados" do cliente — mostrar TUDO que é salvo

`ClienteDadosModal.tsx` hoje esconde vários campos já gravados no banco. Adicionar blocos/linhas para:

- **Datas de workflow**: `projeto_enviado_em`, `projeto_aprovado`, `data_fechamento`.
- **Equipamento detalhado**: `modelo_placa`, `modelo_inversor`, `tipo_inversor` (String/Micro), `cabo_usado`.
- **Status e operação**: `status` do projeto, congelamento (`congelado`, `congelado_ate`, `motivo_congelamento`), `satisfacao` (estrelas), `geracao_estimada_kwh`, `estrutura`.
- **Logística**: `codigo_rastreamento` (com link para `/acompanhar/:codigo`), `layout_url` (link para o arquivo), `local_entrega`.
- **Legado**: `dados_paineis`, `dados_inversor` (exibir só quando preenchidos).
- **Avaliação do cliente** (ver seção 5).

Campos exibidos só quando têm valor, para não poluir.

## 2. Corrigir mapeamentos quebrados (clientes instalados via projeto)

Em `ClientesPage.tsx`, a função que converte projetos `Instalado/Homologado` em `ClienteBase` (`fromProjetos`, linhas ~68–114) descarta campos que o `projetos` possui. Incluir no mapeamento:

- `email`, `estrutura`, `geracao_estimada_kwh`, `tipo_inversor`, `satisfacao`, `status`, `congelado*`, `codigo_rastreamento`, `layout_url`, `local_entrega`, `data_fechamento`.

Alinhar `mapProjetoToDados` em `ProjetosUnificados.tsx` com os mesmos campos (já mapeia parte). Resultado: badge MICRO, e-mail, estrutura e geração deixam de sumir para clientes instalados-via-obra.

Atualizar a interface `ClienteBase` (`ClientesList.tsx`) com os campos novos.

## 3. Pedido do preço do kit em "Equipamento pago" → Custos

No Acompanhamento (`ListaAcompanhamento.tsx`), ao marcar **Fluxo 2 / Etapa 2 ("Equipamento pago")** como concluída:

- Abrir um modal pedindo o **valor do kit** (usar `MoneyInput`, BRL).
- Fazer **upsert em `custos_obra`** daquele `projeto_id` preenchendo `custo_kit` (cria o registro se não existir; atualiza se já existir).
- Pré-preencher o campo com o `custo_kit` já existente, se houver, ou com a sugestão da tabela de preços (mesma lógica do `CustoModal`).
- Após salvar, toast confirmando que o valor foi enviado para Custos.

Assim o custo do kit nasce no momento da compra e aparece automaticamente no módulo de Custos, sem redigitação.

## 4. Unificar conclusão de obra e pós-venda

- **`ObraConcluidaModal.tsx`**: ao confirmar, além de `status='Instalado'`, `data_instalacao`, `instalador`, `objecoes`, passar a:
  - chamar `gerarTarefasPosVenda` (ativa pós-venda automaticamente, sem duplicar se já existir);
  - gravar `dia_leitura` de volta em `clientes_base` quando houver registro correspondente.
- **`handlePromoverParaObra`** (`ClientesPage.tsx`): incluir `dia_leitura` no projeto criado (hoje é descartado).
- Remover o código morto `ativarPosVendaProjeto` OU usá-lo como base da função unificada (consolidar em uma só rota de ativação para evitar redundância).
- Proteção contra duplicidade: antes de gerar tarefas, checar se já existem tarefas para aquele projeto/cliente.

## 5. Avaliações dos clientes visíveis para a equipe (dois lugares)

`avaliacoes_clientes` é preenchida pelos clientes mas nunca exibida. Adicionar leitura em:

- **Agenda de Pós-venda** (`PosVendaAgenda.tsx`): mostrar nota (estrelas) + comentário do cliente junto de cada obra/cliente.
- **Ver dados** (`ClienteDadosModal.tsx`): bloco "Avaliação do cliente" com estrelas e comentário.

Buscar por `projeto_id`. Incluir `email` (e telefones secundários quando existirem) nas consultas de pós-venda/acompanhamento, que hoje só trazem `telefone`.

## 6. Consistência de contato e revisão final

- Trazer `email` nas joins de `PosVendaAgenda.tsx` e `ListaAcompanhamento.tsx` e exibi-lo nos cartões.
- Conferir que `ClienteEditModal` (caminho `proj-*`) não "engole" silenciosamente campos: para campos que `projetos` não possui (telefone_2/3, numero, modelo_*), ocultar ou desabilitar o input nesse modo, evitando a impressão de que foram salvos.

---

## Notas técnicas

- **Banco**: nenhuma mudança de schema é estritamente necessária — todas as colunas já existem (`custo_kit`, `dia_leitura`, `avaliacoes_clientes`, etc.). A escrita em `custos_obra` segue o padrão de upsert por `projeto_id` (relação 1:1 já existente).
- **RLS**: `tarefas_posvenda`, `rastreamento_obras`, `custos_obra` e `avaliacoes_clientes` já têm políticas para equipe/admin; as novas leituras/escritas usam o mesmo cliente autenticado.
- **Padrões**: valores monetários sempre via `MoneyInput` e formato BRL; canais realtime com `crypto.randomUUID()`; manter tema verde/amarelo.
- **Sem regressão**: exibições novas são condicionais (só quando há valor) e a geração de pós-venda é idempotente (não duplica tarefas existentes).

## Fora do escopo (sinalizado, não incluído)

- Assistente "Criar projeto a partir da proposta" (G1) — hoje o projeto é criado manualmente; posso fazer numa etapa seguinte se quiser.
- Vincular indicações do `/energia` ao projeto de origem (G10).
