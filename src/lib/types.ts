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
      areas_produccion: {
        Row: {
          activa: boolean
          encargadas: string
          es_decoracion: boolean
          id: number
          nombre: string
          orden: number
          trabajo_en_equipo: boolean
        }
        Insert: {
          activa?: boolean
          encargadas: string
          es_decoracion?: boolean
          id?: never
          nombre: string
          orden: number
          trabajo_en_equipo?: boolean
        }
        Update: {
          activa?: boolean
          encargadas?: string
          es_decoracion?: boolean
          id?: never
          nombre?: string
          orden?: number
          trabajo_en_equipo?: boolean
        }
        Relationships: []
      }
      asignaciones: {
        Row: {
          cantidad: number
          cantidad_hecha: number
          estado: string
          fecha: string
          id: number
          pastelera_id: number | null
          producto_id: number
          tanda: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantidad: number
          cantidad_hecha?: number
          estado?: string
          fecha: string
          id?: never
          pastelera_id?: number | null
          producto_id: number
          tanda?: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_hecha?: number
          estado?: string
          fecha?: string
          id?: never
          pastelera_id?: number | null
          producto_id?: number
          tanda?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_pastelera_id_fkey"
            columns: ["pastelera_id"]
            isOneToOne: false
            referencedRelation: "pasteleras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
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
          cambio: number
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
          cambio?: number
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
          cambio?: number
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
      pasteleras: {
        Row: {
          activa: boolean
          area_id: number
          id: number
          nombre: string
          orden: number
          porcentaje: number
          requiere_pin: boolean
        }
        Insert: {
          activa?: boolean
          area_id: number
          id?: never
          nombre: string
          orden?: number
          porcentaje?: number
          requiere_pin?: boolean
        }
        Update: {
          activa?: boolean
          area_id?: number
          id?: never
          nombre?: string
          orden?: number
          porcentaje?: number
          requiere_pin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pasteleras_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_dia: {
        Row: {
          estado: string
          fecha: string
          generado_at: string | null
          publicado_at: string | null
          updated_by: string | null
        }
        Insert: {
          estado?: string
          fecha: string
          generado_at?: string | null
          publicado_at?: string | null
          updated_by?: string | null
        }
        Update: {
          estado?: string
          fecha?: string
          generado_at?: string | null
          publicado_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
          area_id: number | null
          categoria: string | null
          departamento_id: number | null
          id: number
          lleva_decoracion: boolean
          nombre: string
          orden: number | null
          orden_area: number | null
          tamano: string | null
          temporada: boolean
        }
        Insert: {
          activo?: boolean
          area_id?: number | null
          categoria?: string | null
          departamento_id?: number | null
          id?: never
          lleva_decoracion?: boolean
          nombre: string
          orden?: number | null
          orden_area?: number | null
          tamano?: string | null
          temporada?: boolean
        }
        Update: {
          activo?: boolean
          area_id?: number | null
          categoria?: string | null
          departamento_id?: number | null
          id?: never
          lleva_decoracion?: boolean
          nombre?: string
          orden?: number | null
          orden_area?: number | null
          tamano?: string | null
          temporada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "productos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas_produccion"
            referencedColumns: ["id"]
          },
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
      admin_usuarios: {
        Args: never
        Returns: {
          creado: string
          email: string
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_usuario"] | null
          sucursal_id: number | null
          ultimo_ingreso: string | null
          user_id: string
        }[]
      }
      es_admin: { Args: never; Returns: boolean }
      fijar_pin_pastelera: {
        Args: { p_pastelera: number; p_pin: string }
        Returns: undefined
      }
      reemplazar_asignaciones: {
        Args: { p_fecha: string; p_filas: Json }
        Returns: number
      }
      registrar_avance: {
        Args: {
          p_asignacion: number
          p_estado?: string
          p_hecha: number
          p_pastelera?: number
          p_pin: string
        }
        Returns: Database["public"]["Tables"]["asignaciones"]["Row"]
      }
      verificar_pin_pastelera: {
        Args: { p_pastelera: number; p_pin: string }
        Returns: boolean
      }
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
