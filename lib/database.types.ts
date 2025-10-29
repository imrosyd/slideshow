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
          created_at: string
        }
        Insert: {
          filename: string
          duration_ms: number
        }
        Update: {
          filename?: string
          duration_ms?: number
        }
      }
    }
  }
}
