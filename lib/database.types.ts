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
        Insert: {
          filename: string
          duration_ms: number
        }
      }
    }
  }
}
