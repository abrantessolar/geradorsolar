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
      user_profiles: {
        Row: {
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
