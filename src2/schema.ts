/**
 * Schema Detection Module
 * Automatically detects form fields from document structure
 */

/**
 * Detected field information
 */
export interface DetectedField {
  table: number;
  row: number;
  col: number;
  label: string;
}

/**
 * Detect schema from a Google Doc by analyzing table structure
 * Identifies potential form fields based on cell content
 * 
 * @param docId - Google Doc ID to analyze
 * @returns Array of detected fields with their positions
 * 
 * @example
 * const schema = detectSchema(docId);
 * // Returns: [
 * //   { table: 0, row: 1, col: 0, label: "氏名" },
 * //   { table: 0, row: 2, col: 0, label: "住所" }
 * // ]
 */
export function detectSchema(docId: string): DetectedField[] {
  try {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const tables = body.getTables();
    const fields: DetectedField[] = [];

    tables.forEach((table, tableIndex) => {
      for (let rowIndex = 0; rowIndex < table.getNumRows(); rowIndex++) {
        const row = table.getRow(rowIndex);
        
        for (let colIndex = 0; colIndex < row.getNumCells(); colIndex++) {
          const cell = row.getCell(colIndex);
          const text = cell.getText().trim();
          
          // Identify potential field labels
          // Criteria: non-empty, reasonably short text (likely a label, not content)
          if (text && text.length > 0 && text.length < 60) {
            fields.push({
              table: tableIndex,
              row: rowIndex,
              col: colIndex,
              label: text
            });
          }
        }
      }
    });

    Logger.log(`Detected ${fields.length} potential fields`);
    return fields;
  } catch (error) {
    Logger.log(`Error in detectSchema: ${error}`);
    throw error;
  }
}

/**
 * Detect schema with additional filtering
 * Filters out common non-field content like instructions or long text
 * 
 * @param docId - Google Doc ID to analyze
 * @param options - Detection options
 * @returns Filtered array of detected fields
 */
export function detectSchemaAdvanced(
  docId: string,
  options: {
    maxLabelLength?: number;
    minLabelLength?: number;
    excludePatterns?: RegExp[];
  } = {}
): DetectedField[] {
  const {
    maxLabelLength = 60,
    minLabelLength = 2,
    excludePatterns = []
  } = options;

  const allFields = detectSchema(docId);
  
  return allFields.filter(field => {
    const label = field.label;
    
    // Length check
    if (label.length < minLabelLength || label.length > maxLabelLength) {
      return false;
    }
    
    // Pattern exclusion
    for (const pattern of excludePatterns) {
      if (pattern.test(label)) {
        return false;
      }
    }
    
    return true;
  });
}
