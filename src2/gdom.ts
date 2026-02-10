import { GDOMElement } from './element';

/**
 * GDOM: Google Doc Object Model
 * Main entry point for DOM-like manipulation of Google Docs.
 * 
 * @example
 * const doc = DocumentApp.getActiveDocument();
 * const gdom = new GDOM(doc);
 * const element = gdom.getElementById('my-field');
 */
export class GDOM {
  private doc: GoogleAppsScript.Document.Document;

  constructor(doc: GoogleAppsScript.Document.Document) {
    this.doc = doc;
  }

  /**
   * Get element by ID (similar to document.getElementById)
   * @param id - The NamedRange ID to search for
   * @returns GDOMElement or null if not found
   */
  getElementById(id: string): GDOMElement | null {
    const ranges = this.doc.getNamedRanges(id);
    if (ranges.length === 0) return null;
    return new GDOMElement(this.doc, id, ranges[0]);
  }

  /**
   * Create a new element and assign it an ID
   * Note: Element is immediately appended to the document body
   * 
   * @param tagName - Type of element to create
   * @param id - Unique identifier for the element
   * @returns Newly created GDOMElement
   */
  createElement(tagName: 'PARAGRAPH' | 'TABLE', id: string): GDOMElement {
    const body = this.doc.getBody();
    let element: GoogleAppsScript.Document.Element;

    if (tagName === 'TABLE') {
      element = body.appendTable();
    } else {
      element = body.appendParagraph("");
    }

    // Wrap in NamedRange to assign ID
    const rangeBuilder = this.doc.newRange();
    rangeBuilder.addElement(element);
    this.doc.addNamedRange(id, rangeBuilder.build());

    return new GDOMElement(this.doc, id, this.doc.getNamedRanges(id)[0]);
  }

  /**
   * Get all elements of a specific type that have IDs
   * Only returns elements that have been assigned NamedRanges
   * 
   * @param tagName - Type of elements to search for
   * @returns Array of GDOMElements matching the tag type
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
        
        if (tagName === 'TABLE' && el.getType() === DocumentApp.ElementType.TABLE) {
          match = true;
        }
        if (tagName === 'PARAGRAPH' && el.getType() === DocumentApp.ElementType.PARAGRAPH) {
          match = true;
        }
        
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
   * If not, it creates a new element.
   * 
   * @param metadata - Schema definition with fields and their types
   * 
   * @example
   * gdom.embed({
   *   fields: [
   *     { id: "title", type: "text", meta: { label: "タイトル" } },
   *     { id: "data", type: "table" }
   *   ]
   * });
   */
  embed(metadata: EmbedMetadata): void {
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
          el!.setMetadata(key, field.meta![key]);
        });
      }
    });
  }

  /**
   * Command 2: Inject (Content Filling)
   * Fills the document with values from the content object.
   * Matches keys in content JSON to NamedRange IDs.
   * 
   * @param content - Key-value pairs where keys match element IDs
   * 
   * @example
   * gdom.inject({
   *   "title": "プロジェクトタイトル",
   *   "data_table": [["Header"], ["Row 1"]]
   * });
   */
  inject(content: InjectContent): void {
    Object.keys(content).forEach(id => {
      const el = this.getElementById(id);
      if (el) {
        const value = content[id];
        
        // Auto-detect type based on value structure
        if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
          // 2D Array -> Table
          el.setTableData(value as string[][]);
        } else {
          // Primitive -> Text
          el.setText(String(value));
        }
      } else {
        Logger.log(`Warning: ID not found: ${id}`);
      }
    });
  }
}

// --- Type Definitions ---

/**
 * Metadata structure for embed command
 */
export interface EmbedMetadata {
  fields: Array<{
    id: string;
    type: 'text' | 'table';
    meta?: Record<string, unknown>;
  }>;
}

/**
 * Content structure for inject command
 * Values can be primitives (converted to text) or 2D arrays (for tables)
 */
export interface InjectContent {
  [key: string]: string | number | boolean | string[][];
}
