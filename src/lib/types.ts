// Tipos generados desde Supabase (supabase gen types typescript).
// No editar a mano: regenerar tras cada migración.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cierres_dia: {
        Row: {
          cerrado_at: string | null
          cerrado_by: string | null
          estado: Database["public"]["Enums"]["estado_dia"]
          fecha: string
          sucursal_id: number
        }
        Insert: {
          cerrado_at?: string | null
          cerrado_by?: string | null
          estado?: Database["public"]["Enums"]["estado_dia"]
          fecha: string
          sucursal_id: number
        }
        Update: {
          cerrado_at?: string | null
          cerrado_by?: string | null
          estado?: Database["public"]["Enums"]["estado_dia"]
          fecha?: string
          sucursal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cierres_dia_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          activo: boolean
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: never
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      movimientos_diarios: {
        Row: {
          decorado: number
          devolucion: number
          fecha: string
          id: number
          ingreso: number
          pedido: number
          producto_id: number
          saldo_final: number | null
          saldo_inicial: number
          sin_decorar: number
          sucursal_id: number
          sugerido_override: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          decorado?: number
          devolucion?: number
          fecha: string
          id?: never
          ingreso?: number
          pedido?: number
          producto_id: number
          saldo_final?: number | null
          saldo_inicial?: number
          sin_decorar?: number
          sucursal_id: number
          sugerido_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          decorado?: number
          devolucion?: number
          fecha?: string
          id?: never
          ingreso?: number
          pedido?: number
          producto_id?: number
          saldo_final?: number | null
          saldo_inicial?: number
          sin_decorar?: number
          sucursal_id?: number
          sugerido_override?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_diarios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_diarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id: number | null
          user_id: string
        }
        Insert: {
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id?: number | null
          user_id: string
        }
        Update: {
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria: string | null
          departamento_id: number | null
          id: number
          lleva_decoracion: boolean
          nombre: string
          tamano: string | null
        }
        Insert: {
          activo?: boolean
          categoria?: string | null
          departamento_id?: number | null
          id?: never
          lleva_decoracion?: boolean
          nombre: string
          tamano?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string | null
          departamento_id?: number | null
          id?: never
          lleva_decoracion?: boolean
          nombre?: string
          tamano?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      reglas_sugerido: {
        Row: {
          dia_semana: number | null
          id: number
          objetivo: number
          producto_id: number
          sucursal_id: number
        }
        Insert: {
          dia_semana?: number | null
          id?: never
          objetivo: number
          producto_id: number
          sucursal_id: number
        }
        Update: {
          dia_semana?: number | null
          id?: never
          objetivo?: number
          producto_id?: number
          sucursal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reglas_sugerido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reglas_sugerido_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activa: boolean
          es_principal: boolean
          id: number
          nombre: string
        }
        Insert: {
          activa?: boolean
          es_principal?: boolean
          id?: never
          nombre: string
        }
        Update: {
          activa?: boolean
          es_principal?: boolean
          id?: never
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_movimientos: {
        Row: {
          decorado: number | null
          devolucion: number | null
          fecha: string | null
          id: number | null
          ingreso: number | null
          pedido: number | null
          producto_id: number | null
          saldo_final: number | null
          saldo_inicial: number | null
          sin_decorar: number | null
          sucursal_id: number | null
          sugerido_override: number | null
          updated_at: string | null
          updated_by: string | null
          vendido: number | null
        }
        Insert: {
          decorado?: number | null
          devolucion?: number | null
          fecha?: string | null
          id?: number | null
          ingreso?: number | null
          pedido?: number | null
          producto_id?: number | null
          saldo_final?: number | null
          saldo_inicial?: number | null
          sin_decorar?: number | null
          sucursal_id?: number | null
          sugerido_override?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendido?: never
        }
        Update: {
          decorado?: number | null
          devolucion?: number | null
          fecha?: string | null
          id?: number | null
          ingreso?: number | null
          pedido?: number | null
          producto_id?: number | null
          saldo_final?: number | null
          saldo_inicial?: number | null
          sin_decorar?: number | null
          sucursal_id?: number | null
          sugerido_override?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendido?: never
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_diarios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_diarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sugeridos: {
        Row: {
          es_override: boolean | null
          fecha: string | null
          objetivo: number | null
          producto_id: number | null
          saldo: number | null
          sucursal_id: number | null
          sugerido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_diarios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_diarios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      es_admin: { Args: never; Returns: boolean }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      sucursal_actual: { Args: never; Returns: number }
    }
    Enums: {
      estado_dia: "sin_iniciar" | "en_captura" | "cerrado"
      rol_usuario: "tienda" | "principal" | "admin"
      tipo_decoracion: "decorado" | "sin_decorar" | "na"
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
    Enums: {
      estado_dia: ["sin_iniciar", "en_captura", "cerrado"],
      rol_usuario: ["tienda", "principal", "admin"],
      tipo_decoracion: ["decorado", "sin_decorar", "na"],
    },
  },
} as const
