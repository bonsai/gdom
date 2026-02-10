
import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";

// --- Mocks for Google Apps Script ---

const ElementType = {
  BODY_SECTION: 'BODY_SECTION',
  PARAGRAPH: 'PARAGRAPH',
  TABLE: 'TABLE',
  TEXT: 'TEXT',
  TABLE_ROW: 'TABLE_ROW',
  TABLE_CELL: 'TABLE_CELL',
};

// Global Mock
(globalThis as any).DocumentApp = {
  ElementType: ElementType,
};

// Mock Classes
class MockElement {
  type: string;
  text: string = "";
  children: MockElement[] = [];
  metadata: any[] = [];
  parent: MockElement | null = null;

  constructor(type: string) {
    this.type = type;
  }

  getType() { return this.type; }
  asText() { return this; }
  asParagraph() { return this; }
  asTable() { return this; }
  
  getText() { return this.text; }
  setText(text: string) { this.text = text; return this; }

  getDeveloperMetadata() { return this.metadata; }
  addDeveloperMetadata(key: string, value: string) {
    this.metadata.push({ 
        getKey: () => key, 
        getValue: () => value, 
        remove: () => {
            const idx = this.metadata.findIndex(m => m.getKey() === key);
            if (idx > -1) this.metadata.splice(idx, 1);
        }
    });
  }

  appendTableRow() {
      const row = new MockElement(ElementType.TABLE_ROW);
      row.parent = this;
      this.children.push(row);
      return row;
  }
  appendTableCell(text: string) {
      const cell = new MockElement(ElementType.TABLE_CELL);
      cell.setText(text);
      cell.parent = this;
      this.children.push(cell);
      return cell;
  }
  getNumRows() { return this.children.length; }
  removeRow(idx: number) { this.children.splice(idx, 1); }
}

class MockRangeElement {
  element: MockElement;
  constructor(element: MockElement) { this.element = element; }
  getElement() { return this.element; }
}

class MockRange {
  elements: MockRangeElement[];
  constructor(elements: MockElement[]) {
    this.elements = elements.map(e => new MockRangeElement(e));
  }
  getRangeElements() { return this.elements; }
}

class MockNamedRange {
  name: string;
  range: MockRange;
  constructor(name: string, elements: MockElement[]) {
    this.name = name;
    this.range = new MockRange(elements);
  }
  getName() { return this.name; }
  getRange() { return this.range; }
  remove() {}
}

class MockBody {
  children: MockElement[] = [];
  
  appendParagraph(text: string) {
    const el = new MockElement(ElementType.PARAGRAPH);
    el.setText(text);
    this.children.push(el);
    return el;
  }
  appendTable() {
    const el = new MockElement(ElementType.TABLE);
    this.children.push(el);
    return el;
  }
}

class MockDocument {
  body = new MockBody();
  namedRanges: MockNamedRange[] = [];

  getBody() { return this.body; }
  
  getNamedRanges(id?: string) {
    if (id) return this.namedRanges.filter(r => r.getName() === id);
    return this.namedRanges;
  }

  newRange() {
      const builder = {
          elements: [] as MockElement[],
          addElement: (el: MockElement) => builder.elements.push(el),
          build: () => new MockRange(builder.elements)
      };
      return builder;
  }

  addNamedRange(id: string, range: any) { 
      // range is MockRange from builder.build()
      const elements = range.elements.map((re: any) => re.getElement());
      const nr = new MockNamedRange(id, elements);
      this.namedRanges.push(nr);
  }
}

// Import Modules under test
import { GDOM } from "../src/lib/gdom.ts";
import { GDOMElement } from "../src/lib/element.ts";

Deno.test("GDOM Embed and Inject Flow", () => {
  const doc = new MockDocument() as any;
  const gdom = new GDOM(doc);

  // 1. Embed (Create Structure)
  const schema = {
      fields: [
          { id: "title", type: "text" as const, meta: { description: "Main Title" } },
          { id: "summary", type: "text" as const },
          { id: "data_table", type: "table" as const }
      ]
  };

  gdom.embed(schema);

  // Verify Elements Created
  const titleEl = gdom.getElementById("title");
  assertExists(titleEl, "Title element should exist");
  assertEquals(titleEl?.getMetadata("description"), "Main Title");

  const summaryEl = gdom.getElementById("summary");
  assertExists(summaryEl, "Summary element should exist");

  const tableEl = gdom.getElementById("data_table");
  assertExists(tableEl, "Table element should exist");

  // Verify Body Content
  const body = doc.getBody() as MockBody;
  assertEquals(body.children.length, 3, "Body should have 3 elements");
  assertEquals(body.children[0].getType(), ElementType.PARAGRAPH);
  assertEquals(body.children[2].getType(), ElementType.TABLE);

  // 2. Inject (Fill Content)
  const content = {
      "title": "Project Alpha",
      "summary": "This is a test project.",
      "data_table": [
          ["ID", "Name"],
          ["1", "Alice"],
          ["2", "Bob"]
      ]
  };

  gdom.inject(content);

  // Verify Content Injection
  // Title
  const rawTitle = (titleEl as any).getNativeRange().getRange().getRangeElements()[0].getElement() as MockElement;
  assertEquals(rawTitle.getText(), "Project Alpha");

  // Summary
  const rawSummary = (summaryEl as any).getNativeRange().getRange().getRangeElements()[0].getElement() as MockElement;
  assertEquals(rawSummary.getText(), "This is a test project.");

  // Table
  const rawTable = (tableEl as any).getNativeRange().getRange().getRangeElements()[0].getElement() as MockElement;
  assertEquals(rawTable.children.length, 3, "Table should have 3 rows");
  assertEquals(rawTable.children[0].children[0].getText(), "ID");
  assertEquals(rawTable.children[1].children[1].getText(), "Alice");
});

Deno.test("GDOMElement Metadata Operations", () => {
    const doc = new MockDocument() as any;
    const body = doc.getBody();
    const el = body.appendParagraph("Test");
    
    // Manual NamedRange creation to setup GDOMElement
    const nr = new MockNamedRange("test_id", [el]);
    const gdomEl = new GDOMElement(doc, "test_id", nr as any);

    // Test Set/Get
    gdomEl.setMetadata("key1", "value1");
    assertEquals(gdomEl.getMetadata("key1"), "value1");

    // Test Overwrite
    gdomEl.setMetadata("key1", "value2");
    assertEquals(gdomEl.getMetadata("key1"), "value2");

    // Test Object
    const obj = { a: 1, b: true };
    gdomEl.setMetadata("config", obj);
    assertEquals(gdomEl.getMetadata("config"), obj);
});
