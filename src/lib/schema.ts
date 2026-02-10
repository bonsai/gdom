export function detectSchema(docId: string) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const fields: any[] = [];

  body.getTables().forEach((table, ti) => {
    for (let r = 0; r < table.getNumRows(); r++) {
      const row = table.getRow(r);
      for (let c = 0; c < row.getNumCells(); c++) {
        const text = row.getCell(c).getText().trim();
        if (text && text.length < 60) {
          fields.push({ table: ti, row: r, col: c, label: text });
        }
      }
    }
  });

  return fields;
}