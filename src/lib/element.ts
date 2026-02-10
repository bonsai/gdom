/**
 * GDOMElement: Wrapper for Google Doc Elements with DOM-like API
 */
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
   * innerText equivalent
   */
  setText(text: string) {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();

    // Clear existing content roughly
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
   * HTML Table update equivalent
   */
  setTableData(data: string[][]) {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    
    let table: GoogleAppsScript.Document.Table | null = null;
    for (const re of elements) {
      if (re.getElement().getType() === DocumentApp.ElementType.TABLE) {
        table = re.getElement().asTable();
        break;
      }
    }

    if (!table) return;

    // Reset rows (keep header? No, full reset for now)
    while (table.getNumRows() > 0) {
      table.removeRow(0);
    }

    data.forEach(rowData => {
      const tr = table!.appendTableRow();
      rowData.forEach(cellData => {
        tr.appendTableCell(cellData || "");
      });
    });
  }
  
  /**
   * Returns the underlying GAS object (escape hatch)
   */
  getNativeRange(): GoogleAppsScript.Document.NamedRange {
    return this.namedRange;
  }

  // --- Metadata (dataset) ---

  private getFirstElement(): GoogleAppsScript.Document.Element | null {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    if (elements.length === 0) return null;
    return elements[0].getElement();
  }

  /**
   * Sets a key-value pair in Developer Metadata (invisible).
   * Overwrites existing key if present.
   */
  setMetadata(key: string, value: any) {
    const el = this.getFirstElement();
    if (!el) return;

    // Remove existing with same key to avoid duplicates
    const existing = el.getDeveloperMetadata();
    existing.forEach(m => {
      if (m.getKey() === key) m.remove();
    });

    el.addDeveloperMetadata(key, JSON.stringify(value));
  }

  /**
   * Gets a value from Developer Metadata.
   */
  getMetadata(key: string): any | null {
    const el = this.getFirstElement();
    if (!el) return null;
    const meta = el.getDeveloperMetadata().find(m => m.getKey() === key);
    return meta ? JSON.parse(meta.getValue()) : null;
  }
}
