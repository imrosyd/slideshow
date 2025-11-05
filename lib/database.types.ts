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
          order_index: number
          hidden: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          filename: string
          duration_ms: number
          caption?: string | null
          order_index?: number
          hidden?: boolean
        }
        Update: {
          filename?: string
          duration_ms?: number
          caption?: string | null
          order_index?: number
          hidden?: boolean
        }
        Relationships: []
      }
      slideshow_settings: {
        Row: {
          id: number
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
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
