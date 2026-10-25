
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "app": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": number,"deletion_requested_at": number | null,"last_visit_at": number,"seeded_at": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at": number,"deletion_requested_at"?: number | null,"last_visit_at": number,"seeded_at"?: number | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: number,"deletion_requested_at"?: number | null,"last_visit_at"?: number,"seeded_at"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bits": {
                  Row: {
                    "archived_at": number | null,"created_at": number,"deadline": number | null,"deadline_all_day": boolean,"deleted_at": number | null,"description": string,"icon": string,"id": string,"mtime": number,"parent_id": string,"past_deadline_dismissed": boolean,"priority": string | null,"status": string,"title": string,"user_id": string,"version": number,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: number | null,"created_at": number,"deadline"?: number | null,"deadline_all_day"?: boolean,"deleted_at"?: number | null,"description"?: string,"icon": string,"id": string,"mtime": number,"parent_id": string,"past_deadline_dismissed"?: boolean,"priority"?: string | null,"status"?: string,"title": string,"user_id": string,"version"?: number,"x": number,"y": number
                  }
                  Update: {
                    "archived_at"?: number | null,"created_at"?: number,"deadline"?: number | null,"deadline_all_day"?: boolean,"deleted_at"?: number | null,"description"?: string,"icon"?: string,"id"?: string,"mtime"?: number,"parent_id"?: string,"past_deadline_dismissed"?: boolean,"priority"?: string | null,"status"?: string,"title"?: string,"user_id"?: string,"version"?: number,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bits_user_id_parent_id_fkey"
      columns: ["user_id","parent_id"]
isOneToOne: false
      referencedRelation: "nodes"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"chunks": {
                  Row: {
                    "description": string,"id": string,"order": number,"parent_id": string,"status": string,"time": number | null,"time_all_day": boolean,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"id": string,"order": number,"parent_id": string,"status"?: string,"time"?: number | null,"time_all_day"?: boolean,"title": string,"user_id": string
                  }
                  Update: {
                    "description"?: string,"id"?: string,"order"?: number,"parent_id"?: string,"status"?: string,"time"?: number | null,"time_all_day"?: boolean,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chunks_user_id_parent_id_fkey"
      columns: ["user_id","parent_id"]
isOneToOne: false
      referencedRelation: "bits"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"nodes": {
                  Row: {
                    "archived_at": number | null,"color": string,"created_at": number,"deadline": number | null,"deadline_all_day": boolean,"deleted_at": number | null,"hidden_from_grid": boolean,"icon": string,"id": string,"level": number,"mtime": number,"parent_id": string | null,"past_deadline_dismissed": boolean,"system_role": string | null,"title": string,"user_id": string,"version": number,"x": number,"y": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: number | null,"color": string,"created_at": number,"deadline"?: number | null,"deadline_all_day"?: boolean,"deleted_at"?: number | null,"hidden_from_grid"?: boolean,"icon": string,"id": string,"level": number,"mtime": number,"parent_id"?: string | null,"past_deadline_dismissed"?: boolean,"system_role"?: string | null,"title": string,"user_id": string,"version"?: number,"x": number,"y": number
                  }
                  Update: {
                    "archived_at"?: number | null,"color"?: string,"created_at"?: number,"deadline"?: number | null,"deadline_all_day"?: boolean,"deleted_at"?: number | null,"hidden_from_grid"?: boolean,"icon"?: string,"id"?: string,"level"?: number,"mtime"?: number,"parent_id"?: string | null,"past_deadline_dismissed"?: boolean,"system_role"?: string | null,"title"?: string,"user_id"?: string,"version"?: number,"x"?: number,"y"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "nodes_user_id_parent_id_fkey"
      columns: ["user_id","parent_id"]
isOneToOne: false
      referencedRelation: "nodes"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"scratch_breakdowns": {
                  Row: {
                    "consumed_at": number | null,"content": string,"created_at": number,"id": string,"order": number,"scratch_bit_id": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_at"?: number | null,"content": string,"created_at": number,"id": string,"order": number,"scratch_bit_id": string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "consumed_at"?: number | null,"content"?: string,"created_at"?: number,"id"?: string,"order"?: number,"scratch_bit_id"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "scratch_breakdowns_user_id_scratch_bit_id_fkey"
      columns: ["user_id","scratch_bit_id"]
isOneToOne: false
      referencedRelation: "bits"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"staged_candidates": {
                  Row: {
                    "created_at": number,"id": string,"lifecycle": string,"result_type": string,"scratch_bit_id": string,"source_breakdown_id": string,"updated_at": number,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at": number,"id": string,"lifecycle"?: string,"result_type": string,"scratch_bit_id": string,"source_breakdown_id": string,"updated_at": number,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: number,"id"?: string,"lifecycle"?: string,"result_type"?: string,"scratch_bit_id"?: string,"source_breakdown_id"?: string,"updated_at"?: number,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staged_candidates_user_id_scratch_bit_id_fkey"
      columns: ["user_id","scratch_bit_id"]
isOneToOne: false
      referencedRelation: "bits"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "staged_candidates_user_id_scratch_bit_id_source_breakdown__fkey"
      columns: ["user_id","scratch_bit_id","source_breakdown_id"]
isOneToOne: false
      referencedRelation: "scratch_breakdowns"
      referencedColumns: ["user_id","scratch_bit_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_bit":
{ Args: { "p_id": string,"p_values": Json }; Returns: Json
                           },
"create_node":
{ Args: { "p_id": string,"p_values": Json }; Returns: Json
                           },
"ensure_account":
{ Args: { "p_reserved_cells"?: Json }; Returns: Json
                           },
"get_snapshot":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"update_bit":
{ Args: { "p_changes": Json,"p_extend_parent"?: boolean,"p_id": string }; Returns: Json
                           },
"update_node":
{ Args: { "p_changes": Json,"p_id": string,"p_reserved_cells"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "app": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
