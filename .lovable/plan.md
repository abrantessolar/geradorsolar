## Objetivo

Fazer o modal **"Ver dados"** (em Clientes → Projetos) exibir **todos os campos do cadastro de Novo Projeto**, incluindo o Dia de leitura. É só ajuste de exibição — os dados já estão salvos no banco; nada de migração.

## Causa

Dois pontos limitam o que aparece:

1. `mapProjetoToDados` (em `ProjetosUnificados.tsx`) converte o projeto para o formato do modal, mas deixa de fora vários campos (`email` vira `null`, e não passa `dia_leitura`, `wifi_*`, `distribuidor`, `pagamento_status`, `estrutura`, `geracao_estimada_kwh`, dados de PJ).
2. `ClienteDadosModal.tsx` não tem linhas para esses campos, então mesmo quando existem não são mostrados.

## Mudanças

### 1. `ProjetosUnificados.tsx` — `mapProjetoToDados`
Passar todos os campos do projeto para o objeto do modal:
- `email: p.email`
- `dia_leitura: p.dia_leitura`
- `wifi_nome: p.wifi_nome`, `wifi_senha: p.wifi_senha`
- `distribuidor: p.distribuidor`
- `pagamento_status: p.pagamento_status`
- `estrutura: p.estrutura`
- `geracao_estimada_kwh: p.geracao_estimada_kwh`
- Dados de PJ quando houver: `tipo_pessoa`, `razao_social`, `cnpj`, `nome_representante`, `cpf_representante`

### 2. `ClienteDadosModal.tsx` — exibir os novos campos
- **Identificação**: quando PJ, mostrar Razão Social, CNPJ, Representante e CPF do representante.
- **Dados da Instalação**: adicionar `📅 Dia de leitura da conta`, `WiFi — Rede`, `WiFi — Senha`, `Estrutura`.
- **Equipamentos**: adicionar `Geração estimada (kWh)`.
- **Financeiro**: adicionar `Distribuidor` e `Status de pagamento`.
- Incluir os mesmos campos no "Copiar tudo" (`buildCopyAll`).
- Campos vazios continuam exibindo "—" (comportamento atual do `FieldRow`).

## Observações

- Para clientes vindos de `clientes_base` (não promovidos de obra), alguns desses campos podem não existir e aparecerão como "—" — comportamento esperado.
- Nenhuma alteração de banco de dados ou lógica de negócio.

## Arquivos
- `src/components/gestor/ProjetosUnificados.tsx`
- `src/components/gestor/ClienteDadosModal.tsx`
