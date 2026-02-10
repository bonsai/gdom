/**
 * Smart Fill Module
 * Automatically fills document fields using semantic similarity matching
 */

import { similarity } from "../semantic";

/**
 * Schema field definition
 */
interface SchemaField {
  label: string;
  table: number;
  row: number;
  col: number;
}

/**
 * Fill document tables using smart semantic matching
 * 
 * @param docId - Google Doc ID to fill
 * @param schema - Array of field definitions with positions
 * @param data - User data to fill into the document
 * 
 * @example
 * smartFill(docId, [
 *   { label: "氏名", table: 0, row: 1, col: 0 }
 * ], {
 *   "name": "山田太郎"
 * });
 */
export function smartFill(
  docId: string, 
  schema: SchemaField[], 
  data: Record<string, string>
): void {
  try {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const tables = body.getTables();

    let fillCount = 0;

    schema.forEach(field => {
      let bestKey = "";
      let bestScore = 0;

      // Find best matching key in data using similarity
      for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
        
        const score = similarity(field.label, key);
        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
        }
      }

      // Only fill if similarity is above threshold
      if (bestScore < 0.3) {
        Logger.log(`No match found for field: ${field.label} (best score: ${bestScore})`);
        return;
      }

      const value = data[bestKey];

      // Validate table and row indices
      if (field.table >= tables.length) {
        Logger.log(`Table index ${field.table} out of range`);
        return;
      }

      const table = tables[field.table];
      if (field.row >= table.getNumRows()) {
        Logger.log(`Row index ${field.row} out of range in table ${field.table}`);
        return;
      }

      const row = table.getRow(field.row);
      
      // Fill next column (col + 1) if it exists and is empty
      if (field.col + 1 < row.getNumCells()) {
        const cell = row.getCell(field.col + 1);
        const currentText = cell.getText().trim();
        
        // Only fill if cell is mostly empty (less than 10 characters)
        if (currentText.length < 10) {
          cell.setText(value);
          fillCount++;
          Logger.log(`Filled "${field.label}" with "${value}" (similarity: ${bestScore.toFixed(2)})`);
        } else {
          Logger.log(`Skipped "${field.label}" - cell already has content: "${currentText}"`);
        }
      } else {
        Logger.log(`Column index ${field.col + 1} out of range in table ${field.table}, row ${field.row}`);
      }
    });

    doc.saveAndClose();
    Logger.log(`Smart fill complete. Filled ${fillCount} fields.`);
  } catch (error) {
    Logger.log(`Error in smartFill: ${error}`);
    throw error;
  }
}
