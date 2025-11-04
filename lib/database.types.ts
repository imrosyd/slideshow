export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      image_durations: {
        Row: {
          id: number
          filename: string
          duration_ms: number
          caption: string | null
          created_at: string
        }
        Insert: {
          filename: string
          duration_ms: number | null
          caption?: string | null
        }
        Update: {
          filename?: string
          duration_ms?: number | null
          caption?: string | null
        }
        Relationships: []
      }
    },
    Views: {
      [_ in never]: never
    },
    Functions: {
      [_ in never]: never
    }
  }
}
