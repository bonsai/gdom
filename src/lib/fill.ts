import { similarity } from "../semantic";

export function smartFill(docId: string, schema: any[], data: any) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const tables = body.getTables();

  schema.forEach(f => {
    let best = "";
    let score = 0;

    for (const k in data) {
      const s = similarity(f.label, k);
      if (s > score) { score = s; best = k; }
    }

    if (score < 0.3) return;
    const value = data[best];

    const row = tables[f.table].getRow(f.row);
    if (f.col + 1 < row.getNumCells()) {
      const cell = row.getCell(f.col + 1);
      if (cell.getText().trim().length < 10) {
        cell.setText(value);
      }
    }
  });

  doc.saveAndClose();
}