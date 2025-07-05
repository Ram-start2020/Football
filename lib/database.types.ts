import { PlayerPosition } from '../types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          rating: number;
          positions: PlayerPosition[];
          wins: number;
          losses: number;
          goals: number;
          assists: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          rating: number;
          positions: PlayerPosition[];
          wins?: number;
          losses?: number;
          goals?: number;
          assists?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          rating?: number;
          positions?: PlayerPosition[];
          wins?: number;
          losses?: number;
          goals?: number;
          assists?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
