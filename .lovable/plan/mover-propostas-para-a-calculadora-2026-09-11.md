# Mover Propostas para a Calculadora

## Objetivo
Retirar a seção **Propostas** do Painel Administrativo e disponibilizá-la dentro da página **Calculadora**, sem alterar suas funções atuais.

## Alterações
- Extrair a listagem de propostas para um componente reutilizável.
- Criar, no topo da página Calculadora, as opções **Nova proposta** e **Propostas geradas**.
- Manter busca, filtros, visualização, edição, duplicação, cópia do link, criação de obra e arquivamento.
- Ao editar uma proposta, abrir automaticamente a opção **Nova proposta** com os dados carregados.
- Remover o botão **Propostas** e seu conteúdo do Painel Administrativo.
- Preservar a regra atual: vendedores visualizam apenas as próprias propostas.

## Verificação
- Conferir a troca entre as duas opções da Calculadora.
- Testar que a lista carrega e que as ações continuam disponíveis.
- Confirmar que **Propostas** não aparece mais no Admin.
