export class GDOMElement {
  private doc: GoogleAppsScript.Document.Document;
  private id: string;
  private namedRange: GoogleAppsScript.Document.NamedRange;

  constructor(doc: GoogleAppsScript.Document.Document, id: string, namedRange: GoogleAppsScript.Document.NamedRange) {
    this.doc = doc;
    this.id = id;
    this.namedRange = namedRange;
  }

  getId(): string {
    return this.id;
  }

  /**
   * Set text content of the element.
   * Clears existing content and sets new text.
   */
  setText(text: string): void {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();

    // Clear existing content
    elements.forEach((re) => {
      const el = re.getElement();
      if (el.getType() === DocumentApp.ElementType.TEXT) {
        el.asText().setText("");
      } else if (el.getType() === DocumentApp.ElementType.PARAGRAPH) {
        el.asParagraph().setText("");
      }
    });

    // Set new content
    if (elements.length > 0) {
      const first = elements[0].getElement();
      if (first.getType() === DocumentApp.ElementType.PARAGRAPH) {
        first.asParagraph().setText(text);
      } else if (first.getType() === DocumentApp.ElementType.TEXT) {
        first.asText().setText(text);
      }
    }
  }

  /**
   * Inject value into the document, preserving the original label.
   * If the element is in a table cell, tries to inject into the next cell.
   * Otherwise, appends to the current text.
   */
  injectValue(text: string): void {
    const range = this.namedRange.getRange();
    const rangeElements = range.getRangeElements();

    if (rangeElements.length === 0) return;

    // Use the first element as the anchor
    const firstRe = rangeElements[0];
    const element = firstRe.getElement();

    // Check if inside a table cell
    let parent = element.getParent();
    // Sometimes text is inside Equation or other wrapper, traverse up to find cell
    while (parent && parent.getType() !== DocumentApp.ElementType.BODY && parent.getType() !== DocumentApp.ElementType.TABLE_CELL) {
      parent = parent.getParent();
    }

    if (parent && parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
      const cell = parent.asTableCell();
      const row = cell.getParentRow();
      const cellIndex = row.getChildIndex(cell);
      
      // Try to get the next cell (usually the input field)
      if (cellIndex + 1 < row.getNumCells()) {
        const nextCell = row.getCell(cellIndex + 1);
        // Set text to the next cell (Overwrite content of the target cell)
        nextCell.setText(text);
        Logger.log(`Injected into next cell for ID: ${this.id}`);
        return;
      }
    }

    // Fallback: Append text to the current element (Preserve label)
    if (element.getType() === DocumentApp.ElementType.TEXT) {
      const textElement = element.asText();
      const currentText = textElement.getText();
      // Avoid duplicating if already present (simple check)
      if (!currentText.includes(text)) {
        textElement.setText(currentText + " " + text);
      }
    } else if (element.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const paraElement = element.asParagraph();
      const currentText = paraElement.getText();
       if (!currentText.includes(text)) {
        paraElement.setText(currentText + " " + text);
      }
    }
    Logger.log(`Appended to current element for ID: ${this.id}`);
  }

  /**
   * Set table data.
   * Appends rows/cells if data exceeds current table size.
   */
  setTableData(data: string[][]): void {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    
    // Find the table within the range
    let table: GoogleAppsScript.Document.Table | null = null;
    for (const re of elements) {
      const el = re.getElement();
      if (el.getType() === DocumentApp.ElementType.TABLE) {
        table = el.asTable();
        break;
      } else if (el.getParent().getType() === DocumentApp.ElementType.TABLE) {
        table = el.getParent().asTable();
        break;
      }
    }

    if (!table) {
      Logger.log(`Element ${this.id} is not a table.`);
      return;
    }

    // Update content
    for (let r = 0; r < data.length; r++) {
      // Add row if missing
      if (r >= table.getNumRows()) {
        table.appendTableRow();
      }
      
      const row = table.getRow(r);
      const rowData = data[r];
      
      for (let c = 0; c < rowData.length; c++) {
        // Add cell if missing
        if (c >= row.getNumCells()) {
          row.appendTableCell();
        }
        // Set text
        row.getCell(c).setText(String(rowData[c]));
      }
    }
  }

  /**
   * Set developer metadata on the element.
   */
  setMetadata(key: string, value: unknown): void {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    if (elements.length > 0) {
      const el = elements[0].getElement();
      el.addDeveloperMetadata(key, JSON.stringify(value));
    }
  }

  /**
   * Get developer metadata.
   */
  getMetadata(key: string): unknown | null {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    if (elements.length > 0) {
      const el = elements[0].getElement();
      const meta = el.getDeveloperMetadata();
      for (const m of meta) {
        if (m.getKey() === key) {
          try {
            return JSON.parse(m.getValue());
          } catch {
            return m.getValue();
          }
        }
      }
    }
    return null;
  }
}
