import { GDOMElement } from './element';

/**
 * GDOM: Google Doc Object Model
 * Main entry point for DOM-like manipulation.
 */
export class GDOM {
  private doc: GoogleAppsScript.Document.Document;

  constructor(doc: GoogleAppsScript.Document.Document) {
    this.doc = doc;
  }

  /**
   * document.getElementById(id)
   */
  getElementById(id: string): GDOMElement | null {
    const ranges = this.doc.getNamedRanges(id);
    if (ranges.length === 0) return null;
    return new GDOMElement(this.doc, id, ranges[0]);
  }

  /**
   * document.createElement(tagName) -> append to body -> return Element
   * Note: In GAS, we must append to Doc to exist.
   * This implementation immediately appends to BODY and assigns an ID.
   */
  createElement(tagName: 'PARAGRAPH' | 'TABLE', id: string): GDOMElement {
    const body = this.doc.getBody();
    let element: GoogleAppsScript.Document.Element;

    if (tagName === 'TABLE') {
      element = body.appendTable();
    } else {
      element = body.appendParagraph("");
    }

    // Wrap in NamedRange to effectively "assign ID"
    const rangeBuilder = this.doc.newRange();
    rangeBuilder.addElement(element);
    this.doc.addNamedRange(id, rangeBuilder.build());

    return new GDOMElement(this.doc, id, this.doc.getNamedRanges(id)[0]);
  }

  /**
   * document.getElementsByTagName(tagName)
   * Returns array of GDOMElements (wrapped if they have IDs, or raw wrappers?)
   * Note: GDOMElement requires an ID (NamedRange).
   * Elements without NamedRanges cannot be fully managed by GDOM yet.
   * This method returns *native* elements wrapped in a lightweight interface?
   * For now, we only return Elements that *have* NamedRanges (IDs).
   */
  getElementsByTagName(tagName: 'PARAGRAPH' | 'TABLE'): GDOMElement[] {
    const results: GDOMElement[] = [];
    const namedRanges = this.doc.getNamedRanges();
    
    namedRanges.forEach(nr => {
      const range = nr.getRange();
      const rangeElements = range.getRangeElements();
      // Check if the range contains the requested type
      for (const re of rangeElements) {
        const el = re.getElement();
        let match = false;
        if (tagName === 'TABLE' && el.getType() === DocumentApp.ElementType.TABLE) match = true;
        if (tagName === 'PARAGRAPH' && el.getType() === DocumentApp.ElementType.PARAGRAPH) match = true;
        
        if (match) {
          results.push(new GDOMElement(this.doc, nr.getName(), nr));
          break; // Avoid duplicates for same ID
        }
      }
    });
    
    return results;
  }

  // --- The 2-Command Strategy ---

  /**
   * Command 1: Embed (Structure Definition)
   * Creates NamedRanges and sets metadata based on schema.
   * If an element with the ID exists, it updates metadata.
   * If not, it creates a new element (simple default).
   */
  embed(metadata: { fields: Array<{ id: string, type: 'text' | 'table', meta?: any }> }) {
    metadata.fields.forEach(field => {
      let el = this.getElementById(field.id);
      
      // Create if missing
      if (!el) {
        const tagName = field.type === 'table' ? 'TABLE' : 'PARAGRAPH';
        el = this.createElement(tagName, field.id);
      }
      
      // Embed Metadata
      if (field.meta) {
        Object.keys(field.meta).forEach(key => {
          el!.setMetadata(key, field.meta[key]);
        });
      }
    });
  }

  /**
   * Command 2: Inject (Content Filling)
   * Fills the document with values from the content object.
   * Matches keys in content JSON to NamedRange IDs.
   */
  inject(content: Record<string, any>) {
    Object.keys(content).forEach(id => {
      const el = this.getElementById(id);
      if (el) {
        const value = content[id];
        
        // Auto-detect type based on value structure
        if (Array.isArray(value) && Array.isArray(value[0])) {
          // 2D Array -> Table
          el.setTableData(value as string[][]);
        } else {
          // Primitive -> Text
          el.setText(String(value));
        }
      } else {
        // Warn? Logger.log(`ID not found: ${id}`);
      }
    });
  }
}
