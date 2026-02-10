/**
 * Common Type Definitions for GDOM
 */

export interface EmbedMetadata {
  fields: Array<{
    id: string;
    type: 'text' | 'table';
    meta?: Record<string, unknown>;
  }>;
}

export interface InjectContent {
  [key: string]: string | number | boolean | string[][];
}
