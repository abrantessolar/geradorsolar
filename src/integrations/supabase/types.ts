export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cabos_obra: {
        Row: {
          id: string
          observacao: string | null
          projeto_id: string
          quantidade_metros: number
          tipo_cabo: string
        }
        Insert: {
          id?: string
          observacao?: string | null
          projeto_id: string
          quantidade_metros?: number
          tipo_cabo: string
        }
        Update: {
          id?: string
          observacao?: string | null
          projeto_id?: string
          quantidade_metros?: number
          tipo_cabo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabos_obra_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      cabos_padrao: {
        Row: {
          id: string
          observacao: string | null
          potencia: string
          tipo_cabo: string
        }
        Insert: {
          id?: string
          observacao?: string | null
          potencia: string
          tipo_cabo: string
        }
        Update: {
          id?: string
          observacao?: string | null
          potencia?: string
          tipo_cabo?: string
        }
        Relationships: []
      }
      cidades_irradiancia: {
        Row: {
          abr: number | null
          ago: number | null
          cidade: string
          dez: number | null
          fev: number | null
          id: string
          jan: number | null
          jul: number | null
          jun: number | null
          mai: number | null
          mar: number | null
          nov: number | null
          out_: number | null
          set_: number | null
          uf: string
        }
        Insert: {
          abr?: number | null
          ago?: number | null
          cidade: string
          dez?: number | null
          fev?: number | null
          id?: string
          jan?: number | null
          jul?: number | null
          jun?: number | null
          mai?: number | null
          mar?: number | null
          nov?: number | null
          out_?: number | null
          set_?: number | null
          uf: string
        }
        Update: {
          abr?: number | null
          ago?: number | null
          cidade?: string
          dez?: number | null
          fev?: number | null
          id?: string
          jan?: number | null
          jul?: number | null
          jun?: number | null
          mai?: number | null
          mar?: number | null
          nov?: number | null
          out_?: number | null
          set_?: number | null
          uf?: string
        }
        Relationships: []
      }
      clientes_base: {
        Row: {
          atualizado_em: string
          bairro: string | null
          cabo_usado: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          concessionaria: string | null
          cpf: string | null
          criado_em: string
          dados_inversor: string | null
          dados_paineis: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          instalado_em: string | null
          kwp: number | null
          logradouro: string | null
          marca_inversor: string | null
          marca_placa: string | null
          modelo_inversor: string | null
          modelo_placa: string | null
          nome_completo: string | null
          nome_planta: string | null
          numero: string | null
          observacoes: string | null
          observacoes_historico: Json | null
          origem: string
          outros_nomes: Json | null
          potencia_inversor: string | null
          potencia_placa: string | null
          projeto_aprovado: string | null
          projeto_enviado_em: string | null
          projeto_id: string | null
          proposta_id_ref: string | null
          qtd_inversores: number | null
          qtd_placas: number | null
          satisfacao: string | null
          sistema: string | null
          telefone: string | null
          telefone_2: string | null
          telefone_3: string | null
          tipo_inversor: string | null
          uc: string | null
          usuario_id: string | null
          valor: number | null
          vistoriado_em: string | null
          wifi_nome: string | null
          wifi_senha: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          cabo_usado?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          concessionaria?: string | null
          cpf?: string | null
          criado_em?: string
          dados_inversor?: string | null
          dados_paineis?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          instalado_em?: string | null
          kwp?: number | null
          logradouro?: string | null
          marca_inversor?: string | null
          marca_placa?: string | null
          modelo_inversor?: string | null
          modelo_placa?: string | null
          nome_completo?: string | null
          nome_planta?: string | null
          numero?: string | null
          observacoes?: string | null
          observacoes_historico?: Json | null
          origem?: string
          outros_nomes?: Json | null
          potencia_inversor?: string | null
          potencia_placa?: string | null
          projeto_aprovado?: string | null
          projeto_enviado_em?: string | null
          projeto_id?: string | null
          proposta_id_ref?: string | null
          qtd_inversores?: number | null
          qtd_placas?: number | null
          satisfacao?: string | null
          sistema?: string | null
          telefone?: string | null
          telefone_2?: string | null
          telefone_3?: string | null
          tipo_inversor?: string | null
          uc?: string | null
          usuario_id?: string | null
          valor?: number | null
          vistoriado_em?: string | null
          wifi_nome?: string | null
          wifi_senha?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          cabo_usado?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          concessionaria?: string | null
          cpf?: string | null
          criado_em?: string
          dados_inversor?: string | null
          dados_paineis?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          instalado_em?: string | null
          kwp?: number | null
          logradouro?: string | null
          marca_inversor?: string | null
          marca_placa?: string | null
          modelo_inversor?: string | null
          modelo_placa?: string | null
          nome_completo?: string | null
          nome_planta?: string | null
          numero?: string | null
          observacoes?: string | null
          observacoes_historico?: Json | null
          origem?: string
          outros_nomes?: Json | null
          potencia_inversor?: string | null
          potencia_placa?: string | null
          projeto_aprovado?: string | null
          projeto_enviado_em?: string | null
          projeto_id?: string | null
          proposta_id_ref?: string | null
          qtd_inversores?: number | null
          qtd_placas?: number | null
          satisfacao?: string | null
          sistema?: string | null
          telefone?: string | null
          telefone_2?: string | null
          telefone_3?: string | null
          tipo_inversor?: string | null
          uc?: string | null
          usuario_id?: string | null
          valor?: number | null
          vistoriado_em?: string | null
          wifi_nome?: string | null
          wifi_senha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_base_proposta_id_ref_fkey"
            columns: ["proposta_id_ref"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          valor: Json
        }
        Insert: {
          chave: string
          id?: string
          valor?: Json
        }
        Update: {
          chave?: string
          id?: string
          valor?: Json
        }
        Relationships: []
      }
      custos_obra: {
        Row: {
          atualizado_em: string
          criado_em: string
          custo_cabo_tronco: number | null
          custo_comissao: number | null
          custo_frete: number | null
          custo_homologacao: number | null
          custo_instalacao: number | null
          custo_kit: number | null
          custo_materiais: number | null
          custo_material_ca: number | null
          custo_outros: number | null
          custo_trt: number | null
          descricao_outros: string | null
          id: string
          observacoes: string | null
          preco_venda: number | null
          projeto_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          custo_cabo_tronco?: number | null
          custo_comissao?: number | null
          custo_frete?: number | null
          custo_homologacao?: number | null
          custo_instalacao?: number | null
          custo_kit?: number | null
          custo_materiais?: number | null
          custo_material_ca?: number | null
          custo_outros?: number | null
          custo_trt?: number | null
          descricao_outros?: string | null
          id?: string
          observacoes?: string | null
          preco_venda?: number | null
          projeto_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          custo_cabo_tronco?: number | null
          custo_comissao?: number | null
          custo_frete?: number | null
          custo_homologacao?: number | null
          custo_instalacao?: number | null
          custo_kit?: number | null
          custo_materiais?: number | null
          custo_material_ca?: number | null
          custo_outros?: number | null
          custo_trt?: number | null
          descricao_outros?: string | null
          id?: string
          observacoes?: string | null
          preco_venda?: number | null
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custos_obra_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: true
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuidoras: {
        Row: {
          id: string
          nome: string
          padrao: boolean
          valor_kwh: number
        }
        Insert: {
          id?: string
          nome: string
          padrao?: boolean
          valor_kwh?: number
        }
        Update: {
          id?: string
          nome?: string
          padrao?: boolean
          valor_kwh?: number
        }
        Relationships: []
      }
      energia_admins: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          senha_hash: string
          usuario: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          senha_hash: string
          usuario: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          senha_hash?: string
          usuario?: string
        }
        Relationships: []
      }
      energia_campanhas: {
        Row: {
          ativa: boolean
          fim: string
          id: string
          inicio: string
          multiplicador: number
          nome: string
        }
        Insert: {
          ativa?: boolean
          fim: string
          id?: string
          inicio: string
          multiplicador?: number
          nome: string
        }
        Update: {
          ativa?: boolean
          fim?: string
          id?: string
          inicio?: string
          multiplicador?: number
          nome?: string
        }
        Relationships: []
      }
      energia_config: {
        Row: {
          chave: string
          valor: Json
        }
        Insert: {
          chave: string
          valor?: Json
        }
        Update: {
          chave?: string
          valor?: Json
        }
        Relationships: []
      }
      energia_etapas: {
        Row: {
          icone: string | null
          id: string
          nome: string
          ordem: number
          pontos_minimos: number
          premio_id: string | null
        }
        Insert: {
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          pontos_minimos?: number
          premio_id?: string | null
        }
        Update: {
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          pontos_minimos?: number
          premio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_etapas_premio_id_fkey"
            columns: ["premio_id"]
            isOneToOne: false
            referencedRelation: "energia_premios"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_indicacoes: {
        Row: {
          cidade: string | null
          criado_em: string
          email_indicado: string | null
          fechada_em: string | null
          id: string
          indicador_id: string
          nome_indicado: string | null
          num_placas: number | null
          observacao: string | null
          observacao_indicador: string | null
          pontos_creditados: number
          status: string
          telefone_indicado: string | null
          valor_negocio: number | null
        }
        Insert: {
          cidade?: string | null
          criado_em?: string
          email_indicado?: string | null
          fechada_em?: string | null
          id?: string
          indicador_id: string
          nome_indicado?: string | null
          num_placas?: number | null
          observacao?: string | null
          observacao_indicador?: string | null
          pontos_creditados?: number
          status?: string
          telefone_indicado?: string | null
          valor_negocio?: number | null
        }
        Update: {
          cidade?: string | null
          criado_em?: string
          email_indicado?: string | null
          fechada_em?: string | null
          id?: string
          indicador_id?: string
          nome_indicado?: string | null
          num_placas?: number | null
          observacao?: string | null
          observacao_indicador?: string | null
          pontos_creditados?: number
          status?: string
          telefone_indicado?: string | null
          valor_negocio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_indicacoes_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "energia_indicadores"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_indicadores: {
        Row: {
          aparece_ranking: boolean
          cidade: string | null
          codigo_link: string
          cpf: string
          criado_em: string
          data_nascimento: string
          eh_cliente: boolean
          email: string | null
          etapa_atual: string | null
          id: string
          nome: string
          onboarding_visto: boolean
          pontos_acumulados: number
          telefone: string | null
          ultimo_acesso: string | null
        }
        Insert: {
          aparece_ranking?: boolean
          cidade?: string | null
          codigo_link?: string
          cpf: string
          criado_em?: string
          data_nascimento: string
          eh_cliente?: boolean
          email?: string | null
          etapa_atual?: string | null
          id?: string
          nome: string
          onboarding_visto?: boolean
          pontos_acumulados?: number
          telefone?: string | null
          ultimo_acesso?: string | null
        }
        Update: {
          aparece_ranking?: boolean
          cidade?: string | null
          codigo_link?: string
          cpf?: string
          criado_em?: string
          data_nascimento?: string
          eh_cliente?: boolean
          email?: string | null
          etapa_atual?: string | null
          id?: string
          nome?: string
          onboarding_visto?: boolean
          pontos_acumulados?: number
          telefone?: string | null
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      energia_pontos_log: {
        Row: {
          admin_id: string | null
          criado_em: string
          id: string
          indicador_id: string
          motivo: string | null
          pontos: number
        }
        Insert: {
          admin_id?: string | null
          criado_em?: string
          id?: string
          indicador_id: string
          motivo?: string | null
          pontos: number
        }
        Update: {
          admin_id?: string | null
          criado_em?: string
          id?: string
          indicador_id?: string
          motivo?: string | null
          pontos?: number
        }
        Relationships: [
          {
            foreignKeyName: "energia_pontos_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "energia_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energia_pontos_log_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "energia_indicadores"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_premios: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          pontos_necessarios: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          pontos_necessarios?: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          pontos_necessarios?: number
        }
        Relationships: []
      }
      energia_resgates: {
        Row: {
          entregue_em: string | null
          id: string
          indicador_id: string
          pontos_utilizados: number
          premio_id: string
          solicitado_em: string
          status: string
        }
        Insert: {
          entregue_em?: string | null
          id?: string
          indicador_id: string
          pontos_utilizados: number
          premio_id: string
          solicitado_em?: string
          status?: string
        }
        Update: {
          entregue_em?: string | null
          id?: string
          indicador_id?: string
          pontos_utilizados?: number
          premio_id?: string
          solicitado_em?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "energia_resgates_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "energia_indicadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energia_resgates_premio_id_fkey"
            columns: ["premio_id"]
            isOneToOne: false
            referencedRelation: "energia_premios"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos_calculadora: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          criado_em: string
          dias_mes_padrao: number
          fator_servico: number
          horas_dia_padrao: number | null
          id: string
          nome: string
          potencia_kw: number
          tipo_medicao: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria: string
          criado_em?: string
          dias_mes_padrao?: number
          fator_servico?: number
          horas_dia_padrao?: number | null
          id?: string
          nome: string
          potencia_kw: number
          tipo_medicao?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          dias_mes_padrao?: number
          fator_servico?: number
          horas_dia_padrao?: number | null
          id?: string
          nome?: string
          potencia_kw?: number
          tipo_medicao?: string
        }
        Relationships: []
      }
      equipamentos_inversores: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          marca: string
          modelo: string
          potencia_kw: number
          tipo: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          marca: string
          modelo: string
          potencia_kw: number
          tipo?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          marca?: string
          modelo?: string
          potencia_kw?: number
          tipo?: string
        }
        Relationships: []
      }
      equipamentos_kits: {
        Row: {
          ativo: boolean
          garantia: number | null
          id: string
          linha: string
          marca: string | null
          modelo: string | null
          potencia: number | null
          potencia_max: number | null
          potencia_min: number | null
          preco_custo: number | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          garantia?: number | null
          id?: string
          linha: string
          marca?: string | null
          modelo?: string | null
          potencia?: number | null
          potencia_max?: number | null
          potencia_min?: number | null
          preco_custo?: number | null
          tipo?: string
        }
        Update: {
          ativo?: boolean
          garantia?: number | null
          id?: string
          linha?: string
          marca?: string | null
          modelo?: string | null
          potencia?: number | null
          potencia_max?: number | null
          potencia_min?: number | null
          preco_custo?: number | null
          tipo?: string
        }
        Relationships: []
      }
      equipamentos_placas: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          marca: string
          modelo: string
          potencia_wp: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          marca: string
          modelo: string
          potencia_wp: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          marca?: string
          modelo?: string
          potencia_wp?: number
        }
        Relationships: []
      }
      estoque: {
        Row: {
          atualizado_em: string
          id: string
          material_id: string
          quantidade_atual: number
          quantidade_minima: number | null
        }
        Insert: {
          atualizado_em?: string
          id?: string
          material_id: string
          quantidade_atual?: number
          quantidade_minima?: number | null
        }
        Update: {
          atualizado_em?: string
          id?: string
          material_id?: string
          quantidade_atual?: number
          quantidade_minima?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_materiais: {
        Row: {
          ativo: boolean
          contato: string | null
          criado_em: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          criado_em?: string
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          criado_em?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      fotos_portfolio: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          id: string
          ordem: number
          url: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          ordem?: number
          url: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          ordem?: number
          url?: string
        }
        Relationships: []
      }
      historico_propostas: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json | null
          id: string
          proposta_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          proposta_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          proposta_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_propostas_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      instaladores: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          atribuido_para: string | null
          atualizado_em: string
          cidade: string
          consumo_kwh: number
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          resultado_placas: number
          resultado_potencia_kwp: number
          status: string
          telefone: string
          uf: string
        }
        Insert: {
          atribuido_para?: string | null
          atualizado_em?: string
          cidade: string
          consumo_kwh: number
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          resultado_placas: number
          resultado_potencia_kwp: number
          status?: string
          telefone: string
          uf?: string
        }
        Update: {
          atribuido_para?: string | null
          atualizado_em?: string
          cidade?: string
          consumo_kwh?: number
          criado_em?: string
          id?: string
          nome?: string
          observacoes?: string | null
          resultado_placas?: number
          resultado_potencia_kwp?: number
          status?: string
          telefone?: string
          uf?: string
        }
        Relationships: []
      }
      lista_materiais_obra: {
        Row: {
          id: string
          material_id: string
          projeto_id: string
          quantidade_necessaria: number
          quantidade_separada: number
          separado: boolean
        }
        Insert: {
          id?: string
          material_id: string
          projeto_id: string
          quantidade_necessaria?: number
          quantidade_separada?: number
          separado?: boolean
        }
        Update: {
          id?: string
          material_id?: string
          projeto_id?: string
          quantidade_necessaria?: number
          quantidade_separada?: number
          separado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lista_materiais_obra_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_materiais_obra_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      logos_parceiros: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          ordem: number
          url: string
          url_site: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          ordem?: number
          url: string
          url_site?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          ordem?: number
          url?: string
          url_site?: string | null
        }
        Relationships: []
      }
      materiais: {
        Row: {
          ativo: boolean
          categoria: string
          criado_em: string
          fornecedor_id: string | null
          id: string
          imagem_url: string | null
          nome: string
          preco_unitario: number | null
          unidade: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          criado_em?: string
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco_unitario?: number | null
          unidade?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          criado_em?: string
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_unitario?: number | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_quantidades_padrao: {
        Row: {
          id: string
          material_id: string
          potencia: string
          quantidade: number
        }
        Insert: {
          id?: string
          material_id: string
          potencia: string
          quantidade?: number
        }
        Update: {
          id?: string
          material_id?: string
          potencia?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "materiais_quantidades_padrao_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_documentos: {
        Row: {
          atualizado_em: string
          conteudo_html: string
          id: string
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          conteudo_html?: string
          id?: string
          tipo: string
        }
        Update: {
          atualizado_em?: string
          conteudo_html?: string
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          criado_em: string
          id: string
          material_id: string
          obra_id: string | null
          observacao: string | null
          quantidade: number
          tipo: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          material_id: string
          obra_id?: string | null
          observacao?: string | null
          quantidade: number
          tipo: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          material_id?: string
          obra_id?: string | null
          observacao?: string | null
          quantidade?: number
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          atualizado_em: string
          bairro: string | null
          cabo_usado: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          concessionaria: string
          congelado: boolean
          congelado_ate: string | null
          cpf: string | null
          cpf_representante: string | null
          criado_em: string
          data_fechamento: string | null
          data_instalacao: string | null
          data_nascimento: string | null
          distribuidor: string | null
          email: string | null
          endereco_completo: string | null
          estado: string | null
          estrutura: string | null
          forma_pagamento: string | null
          geracao_estimada_kwh: number | null
          id: string
          instalador: string | null
          inversor_id: string | null
          layout_url: string | null
          local_entrega: string | null
          logradouro: string | null
          marca_inversor: string | null
          marca_placa: string | null
          motivo_congelamento: string | null
          nome_completo: string | null
          nome_planta: string | null
          nome_representante: string | null
          objecoes: string | null
          observacoes_historico: Json | null
          outros_nomes: Json | null
          pagamento_status: string | null
          placa_id: string | null
          potencia_inversor: string | null
          potencia_placa: string | null
          preco_venda: number | null
          projeto_aprovado: string | null
          projeto_enviado_em: string | null
          proposta_id: string | null
          qtd_inversores: number | null
          qtd_placas: number | null
          razao_social: string | null
          satisfacao: number | null
          sheets_synced_at: string | null
          sistema: string | null
          status: string
          telefone: string | null
          tipo_pessoa: string
          unidade_beneficiaria1_cep: string | null
          unidade_beneficiaria1_codigo_uc: string | null
          unidade_beneficiaria1_endereco: string | null
          unidade_beneficiaria1_percentual: number | null
          unidade_beneficiaria2_cep: string | null
          unidade_beneficiaria2_codigo_uc: string | null
          unidade_beneficiaria2_endereco: string | null
          unidade_beneficiaria2_percentual: number | null
          unidade_geradora_cep: string | null
          unidade_geradora_codigo_uc: string | null
          unidade_geradora_endereco: string | null
          unidade_geradora_padrao: string | null
          usuario_id: string
          vistoriado_em: string | null
          wifi_nome: string | null
          wifi_senha: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          cabo_usado?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          concessionaria?: string
          congelado?: boolean
          congelado_ate?: string | null
          cpf?: string | null
          cpf_representante?: string | null
          criado_em?: string
          data_fechamento?: string | null
          data_instalacao?: string | null
          data_nascimento?: string | null
          distribuidor?: string | null
          email?: string | null
          endereco_completo?: string | null
          estado?: string | null
          estrutura?: string | null
          forma_pagamento?: string | null
          geracao_estimada_kwh?: number | null
          id?: string
          instalador?: string | null
          inversor_id?: string | null
          layout_url?: string | null
          local_entrega?: string | null
          logradouro?: string | null
          marca_inversor?: string | null
          marca_placa?: string | null
          motivo_congelamento?: string | null
          nome_completo?: string | null
          nome_planta?: string | null
          nome_representante?: string | null
          objecoes?: string | null
          observacoes_historico?: Json | null
          outros_nomes?: Json | null
          pagamento_status?: string | null
          placa_id?: string | null
          potencia_inversor?: string | null
          potencia_placa?: string | null
          preco_venda?: number | null
          projeto_aprovado?: string | null
          projeto_enviado_em?: string | null
          proposta_id?: string | null
          qtd_inversores?: number | null
          qtd_placas?: number | null
          razao_social?: string | null
          satisfacao?: number | null
          sheets_synced_at?: string | null
          sistema?: string | null
          status?: string
          telefone?: string | null
          tipo_pessoa?: string
          unidade_beneficiaria1_cep?: string | null
          unidade_beneficiaria1_codigo_uc?: string | null
          unidade_beneficiaria1_endereco?: string | null
          unidade_beneficiaria1_percentual?: number | null
          unidade_beneficiaria2_cep?: string | null
          unidade_beneficiaria2_codigo_uc?: string | null
          unidade_beneficiaria2_endereco?: string | null
          unidade_beneficiaria2_percentual?: number | null
          unidade_geradora_cep?: string | null
          unidade_geradora_codigo_uc?: string | null
          unidade_geradora_endereco?: string | null
          unidade_geradora_padrao?: string | null
          usuario_id: string
          vistoriado_em?: string | null
          wifi_nome?: string | null
          wifi_senha?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          cabo_usado?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          concessionaria?: string
          congelado?: boolean
          congelado_ate?: string | null
          cpf?: string | null
          cpf_representante?: string | null
          criado_em?: string
          data_fechamento?: string | null
          data_instalacao?: string | null
          data_nascimento?: string | null
          distribuidor?: string | null
          email?: string | null
          endereco_completo?: string | null
          estado?: string | null
          estrutura?: string | null
          forma_pagamento?: string | null
          geracao_estimada_kwh?: number | null
          id?: string
          instalador?: string | null
          inversor_id?: string | null
          layout_url?: string | null
          local_entrega?: string | null
          logradouro?: string | null
          marca_inversor?: string | null
          marca_placa?: string | null
          motivo_congelamento?: string | null
          nome_completo?: string | null
          nome_planta?: string | null
          nome_representante?: string | null
          objecoes?: string | null
          observacoes_historico?: Json | null
          outros_nomes?: Json | null
          pagamento_status?: string | null
          placa_id?: string | null
          potencia_inversor?: string | null
          potencia_placa?: string | null
          preco_venda?: number | null
          projeto_aprovado?: string | null
          projeto_enviado_em?: string | null
          proposta_id?: string | null
          qtd_inversores?: number | null
          qtd_placas?: number | null
          razao_social?: string | null
          satisfacao?: number | null
          sheets_synced_at?: string | null
          sistema?: string | null
          status?: string
          telefone?: string | null
          tipo_pessoa?: string
          unidade_beneficiaria1_cep?: string | null
          unidade_beneficiaria1_codigo_uc?: string | null
          unidade_beneficiaria1_endereco?: string | null
          unidade_beneficiaria1_percentual?: number | null
          unidade_beneficiaria2_cep?: string | null
          unidade_beneficiaria2_codigo_uc?: string | null
          unidade_beneficiaria2_endereco?: string | null
          unidade_beneficiaria2_percentual?: number | null
          unidade_geradora_cep?: string | null
          unidade_geradora_codigo_uc?: string | null
          unidade_geradora_endereco?: string | null
          unidade_geradora_padrao?: string | null
          usuario_id?: string
          vistoriado_em?: string | null
          wifi_nome?: string | null
          wifi_senha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_inversor_id_fkey"
            columns: ["inversor_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_inversores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_placas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          atualizado_em: string
          cet: number | null
          cidade: string | null
          cliente: string
          consumo_mensal: number | null
          criado_em: string
          criador_user_id: string | null
          dados_completos: Json | null
          id: string
          linha: string | null
          num_placas: number | null
          numero_proposta: string | null
          potencia_kwp: number | null
          status: string
          uf: string | null
          valor_total: number | null
          vendedor_id: string | null
          visualizado_em: string | null
        }
        Insert: {
          atualizado_em?: string
          cet?: number | null
          cidade?: string | null
          cliente: string
          consumo_mensal?: number | null
          criado_em?: string
          criador_user_id?: string | null
          dados_completos?: Json | null
          id?: string
          linha?: string | null
          num_placas?: number | null
          numero_proposta?: string | null
          potencia_kwp?: number | null
          status?: string
          uf?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
          visualizado_em?: string | null
        }
        Update: {
          atualizado_em?: string
          cet?: number | null
          cidade?: string | null
          cliente?: string
          consumo_mensal?: number | null
          criado_em?: string
          criador_user_id?: string | null
          dados_completos?: Json | null
          id?: string
          linha?: string | null
          num_placas?: number | null
          numero_proposta?: string | null
          potencia_kwp?: number | null
          status?: string
          uf?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_consumidoras: {
        Row: {
          cep: string | null
          codigo_uc: string | null
          concessionaria: string | null
          criado_em: string
          endereco: string | null
          id: string
          modo_distribuicao: string
          nome_titular: string | null
          padrao_entrada: string | null
          percentual: number | null
          prioridade: number | null
          projeto_id: string
          relacao_titular: string | null
          tipo: string
        }
        Insert: {
          cep?: string | null
          codigo_uc?: string | null
          concessionaria?: string | null
          criado_em?: string
          endereco?: string | null
          id?: string
          modo_distribuicao?: string
          nome_titular?: string | null
          padrao_entrada?: string | null
          percentual?: number | null
          prioridade?: number | null
          projeto_id: string
          relacao_titular?: string | null
          tipo?: string
        }
        Update: {
          cep?: string | null
          codigo_uc?: string | null
          concessionaria?: string | null
          criado_em?: string
          endereco?: string | null
          id?: string
          modo_distribuicao?: string
          nome_titular?: string | null
          padrao_entrada?: string | null
          percentual?: number | null
          prioridade?: number | null
          projeto_id?: string
          relacao_titular?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_consumidoras_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          admin: boolean
          calculadora: boolean
          estoque: boolean
          gestor_clientes: boolean
          gestor_custos: boolean
          gestor_equipamentos: boolean
          gestor_materiais: boolean
          gestor_obras: boolean
          id: string
          importar_dados: boolean
          sincronizar_sheets: boolean
          user_id: string
          zerar_base: boolean
        }
        Insert: {
          admin?: boolean
          calculadora?: boolean
          estoque?: boolean
          gestor_clientes?: boolean
          gestor_custos?: boolean
          gestor_equipamentos?: boolean
          gestor_materiais?: boolean
          gestor_obras?: boolean
          id?: string
          importar_dados?: boolean
          sincronizar_sheets?: boolean
          user_id: string
          zerar_base?: boolean
        }
        Update: {
          admin?: boolean
          calculadora?: boolean
          estoque?: boolean
          gestor_clientes?: boolean
          gestor_custos?: boolean
          gestor_equipamentos?: boolean
          gestor_materiais?: boolean
          gestor_obras?: boolean
          id?: string
          importar_dados?: boolean
          sincronizar_sheets?: boolean
          user_id?: string
          zerar_base?: boolean
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          acesso_painel_gestor: boolean
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          role: string
          telefone: string | null
          ultimo_acesso: string | null
          user_id: string
        }
        Insert: {
          acesso_painel_gestor?: boolean
          ativo?: boolean
          criado_em?: string
          email: string
          id?: string
          nome: string
          role?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          user_id: string
        }
        Update: {
          acesso_painel_gestor?: boolean
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          role?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_orcamentista: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
