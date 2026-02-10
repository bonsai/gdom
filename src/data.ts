// ==========================================
// DATA FILE TYPE DEFINITIONS
// ==========================================

export interface DetectedField {
  id: string;
  layer_1_physical: {
    page_index: number;
    bbox: number[];
    shape_type: string;
    anchor_text_near: string;
  };
  layer_2_semantic: {
    label: string;
    usr_key: string;
    data_type: string;
  };
}

export interface DetectedStructure {
  metadata: {
    file_name: string;
    total_pages: number;
  };
  layers: {
    physical: any[];
  };
  fields: DetectedField[];
}

export interface ContentData {
  document: {
    type: string;
    text: string;
  }[];
}
