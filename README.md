# SITE E Calculadora Tres Lagoas Solar

Crie uma plataforma web para a empresa "Três Lagoas Solar - Energia Limpa"
com 4 módulos: Calculadora Solar, Gerador de Propostas, Precificação e Painel Admin.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 IDENTIDADE VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cores:
- Verde escuro: #4A5A2A
- Amarelo dourado: #E8B84B
- Branco: #FFFFFF
- Cinza claro: #F5F5F5

Elementos decorativos: símbolo "+" espalhado, círculo amarelo de fundo,
ícone de raio. Tipografia bold nos títulos, clean no corpo. Responsivo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULO 1 — CALCULADORA SOLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DADOS DO CLIENTE:
- Nome completo
- Cidade
- Tipo de rede: Monofásica / Bifásica / Trifásica
- Tipo de telhado: Cerâmica / Metálico / Fibrocimento / Laje / Solo
- Valor do kWh (R$) — editável, padrão R$ 0,85
- Vendedor responsável

ENTRADA DE CONSUMO (toggle entre 2 modos):

Modo A — Média mensal:
- Campo numérico único (kWh/mês)
- Suporta até 4 unidades consumidoras com campos separados que somam

Modo B — Mês a mês:
- 12 campos (Jan a Dez)
- Se algum mês estiver vazio → botão "Estimar consumo completo"
- Estimativa usa fatores sazonais:
  Jan:1.15, Fev:1.16, Mar:1.06, Abr:0.94, Mai:0.80, Jun:0.74,
  Jul:0.78, Ago:0.96, Set:0.96, Out:1.09, Nov:1.17, Dez:1.24

EQUIPAMENTOS ADICIONAIS (seção expansível):
Para cada item, usuário configura dias/mês e horas/dia.
Consumo calculado automaticamente em kWh/mês.

Aparelhos disponíveis:
- Ar-condicionado split até 10.000 BTU: 4,74 kWh/dia
- Ar-condicionado split 10.001–15.000 BTU: 6,46 kWh/dia
- Ar-condicionado split 15.001–20.000 BTU: 9,79 kWh/dia
- Ar-condicionado split 20.001–30.000 BTU: 14,64 kWh/dia
- Ar-condicionado split acima 30.000 BTU: 22,64 kWh/dia
- Freezer pequeno: 1,17 kWh/dia
- Freezer médio: 1,67 kWh/dia
- Freezer grande: 2,33 kWh/dia
- Veículo elétrico: 0,20 kWh/km (usuário informa km/mês)
- Geladeira 2 portas: 0,53 kWh/dia
- Lavadora de roupas: 0,60 kWh/uso
- Chuveiro elétrico: 5,40 kWh/dia
- Bomba d'água 1/2 cv: 0,48 kWh/uso
- Notebook: 0,06 kWh/dia

Cada equipamento adicionado aparece como barra empilhada separada
no gráfico mensal.

DIMENSIONAMENTO:
- Perda sistêmica padrão: 21% (configurável por admin por estado)
- Irradiação solar padrão: 5,0 kWh/m².dia (configurável por cidade)
- Consumo médio mensal = média dos 12 meses + equipamentos adicionais
- Consumo médio diário = consumo mensal / 30
- Potência calculada (kWp) = consumo diário / (irradiação × (1 - 0,21))
- Número de placas = arredondar para cima (Potência_kWp / 0,570)
- Geração mensal = Potência_kWp × irradiação × 30 × (1 - 0,21)
- Excedente = geração - consumo

Taxa de disponibilidade mínima (sempre fica na conta):
- Monofásica: 30 kWh/mês
- Bifásica: 50 kWh/mês
- Trifásica: 100 kWh/mês

VIABILIDADE FINANCEIRA:
- Economia mensal = (consumo - taxa disponibilidade) × valor kWh
- Payback (anos) = investimento / (economia mensal × 12)
- Inflação de energia: 10% a.a.
- Retorno 10 anos = soma economias anuais corrigidas - investimento
- Retorno 15 anos = idem
- Retorno 25 anos = idem

GRÁFICO MENSAL (12 meses):
- Barra verde escuro: geração estimada (com fatores sazonais)
- Barra amarela: consumo base
- Barras empilhadas coloridas: cada equipamento adicional separado

3 CARDS DE SISTEMA (lado a lado):
- ACESSO — equipamentos nacionais/básicos
- EXCELLENCE — importados intermediários
- PREMIUM — top de linha

Cada card exibe:
- Inversor e placas sugeridos (do banco de dados admin)
- Potência total (kWp)
- Preço total calculado
- Parcelas: 72x / 60x / 48x / 36x / 24x
- Botão "Ajustar sistema": slider +/- placas e troca de inversor,
  valores atualizam em tempo real

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULO 2 — PRECIFICAÇÃO (lógica interna)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTO DOS EQUIPAMENTOS:
Puxado do banco de dados admin por linha (Acesso/Excellence/Premium).

INSTALAÇÃO:
R$ 100,00 por placa — fixo, independente da quantidade.

HOMOLOGAÇÃO:
R$ 70,00 — fixo.

MATERIAL DE INSTALAÇÃO CA:
Baseado na potência do INVERSOR escolhido (em kW):

- Inversor de 3 kW: R$ 700
- Inversor de 4 kW: R$ 700
- Inversor de 5 kW: R$ 900
- Inversor de 6 kW: R$ 900
- Inversor de 7 kW: R$ 1.150
- Inversor de 8 kW: R$ 1.150
- Inversor de 10 kW: R$ 1.500
- Inversor de 15 kW: R$ 2.000
- Inversor de 25 kW: R$ 2.700
- Inversor de 30 a 38 kW: R$ 4.500
- Inversor de 38 a 50 kW: R$ 6.000
- Inversor de 50 a 75 kW: R$ 10.000

Lógica: buscar a faixa correspondente à potência do inversor selecionado.
Se a potência não se encaixar exatamente, usar a faixa imediatamente superior.

COMPOSIÇÃO DO PREÇO FINAL:
Custo total = equipamentos + instalação + homologação + material CA
Preço de venda = custo total ÷ (1 - margem%)
Margem % configurada pelo admin, única para todas as linhas.

PARCELAMENTOS:
- Valor inicial = preço de venda ÷ número de parcelas (sem juros, estimado)
- Após aprovação: admin insere CET real → parcela recalculada com
  juros compostos e proposta atualizada em tempo real

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULO 3 — GERADOR DE PROPOSTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rota: /proposta/:id — página HTML completa, imprimível e compartilhável.

SEÇÃO 1 — CAPA:
- Logo Três Lagoas Solar
- Título: "meu projeto de Energia Solar Fotovoltaica"
- Nome do cliente + kWh/mês
- Representante + contato

SEÇÃO 2 — ESPECIFICAÇÕES:
- Equipamentos: inversor, placas, estrutura, material de instalação,
  análise de sombreamento 3D com drone, homologação
- Rendimentos: geração/mês, consumo, excedente
- Gráfico de barras 12 meses

SEÇÃO 3 — INVESTIMENTO:
- 5 cards de parcelamento: 72x / 60x / 48x / 36x / 24x
- Valor total em destaque
- Nota: "Valores sujeitos à aprovação de crédito"

SEÇÃO 4 — RETORNO FINANCEIRO:
- Payback à vista
- Economia mensal
- Retorno em 10, 15 e 25 anos
- Documentos necessários
- Prazos: instalação até 30 dias / homologação +10 dias
- Pagamento: à vista / cartão 12x taxa 1,1% a.m.

SEÇÃO 5 — PROVAS SOCIAIS (carrossel):
- Aba 1: vídeos YouTube — thumbnail clicável que abre em modal
- Aba 2: fotos de obras — grid clicável com lightbox
- Máximo 3 visíveis, navegação por setas
- Conteúdo gerenciado pelo admin

BOTÕES (visíveis só ao vendedor):
- Imprimir / Salvar PDF
- Compartilhar link
- Editar CET — modal para inserir taxa real e atualizar parcelas
- Editar proposta — volta à calculadora com dados preenchidos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULO 4 — PAINEL ADMIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acesso por login simples (usuário + senha).

BANCO DE DADOS DE KITS:
Tabela com campos:
- Linha: Acesso / Excellence / Premium
- Tipo: Inversor / Placa / Estrutura / Cabo / String Box
- Marca, Modelo
- Potência (Wp ou kW)
- Garantia (anos)
- Preço de custo (R$)
- Potência compatível: kW mínimo – kW máximo
- Ativo: sim/não

O sistema cruza linha + potência calculada para sugerir o kit
adequado automaticamente em cada uma das 3 linhas.

CONFIGURAÇÕES DE PRECIFICAÇÃO:
- Margem de lucro %
- CET estimada padrão % a.m.

CONFIGURAÇÕES GERAIS:
- Tarifa padrão kWh por estado
- Irradiação solar por cidade (kWh/m².dia)
- Validade da proposta (dias)
- Prazo de instalação (dias)
- Dados da empresa: nome, CNPJ, telefone, e-mail, site, redes sociais
- Cadastro de representantes/vendedores

PROVAS SOCIAIS:
- Cadastrar URL YouTube + título
- Upload ou URL de foto + descrição da obra
- Reordenar e ativar/desativar

PROPOSTAS GERADAS:
- Lista com: cliente, vendedor, data, valor, status
- Status: Enviada / Visualizada / Aprovada / Financiamento / Fechada
- Botão "Atualizar CET" por proposta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECNOLOGIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- React com Tailwind CSS
- Recharts para gráficos
- LocalStorage para persistência (sem backend por enquanto)
- Toda lógica de cálculo no frontend
- Rota /proposta/:id renderizável e imprimível
- CSS @media print: ocultar botões, mostrar só conteúdo da proposta

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://geradorsolar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/85bc5a16-748c-44d3-a8f4-afdafa07ef76).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
