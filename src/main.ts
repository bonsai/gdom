/**
 * Grant AutoPilot Main Entry Point
 * 
 * Functions:
 * 1. buildDoc: Creates a new Grant Application Doc using GDAH (Structure + Content)
 * 2. updateDoc: Updates an existing Grant Application Doc using GDAH (Content Only)
 * 3. fillTemplate: Fills a legacy template using text replacement
 */

import { GDOM } from './lib/gdom';
import { smartFill } from './lib/fill';

// --- Configuration ---
const CONFIG = {
  structureFile: "sumida_gosai_entry_sample_2026_detected.json",
  contentFile: "filled_usr.json",
  outputTitle: "Generated Grant Application (Auto)",
  legacyTemplateName: "1 - Copy (1)"
};

/**
 * [Action 1] Build a new document from scratch based on detected structure
 * Uses GDOM to assign IDs (NamedRanges) for future updates.
 */
function buildDoc() {
  const structure = loadJson(CONFIG.structureFile);
  const usrData = loadJson(CONFIG.contentFile);
  if (!structure || !usrData) return;

  const doc = DocumentApp.create(CONFIG.outputTitle);
  const gdom = new GDOM(doc);
  const flatUsr = flattenObject(usrData);

  // Header
  gdom.createElement('PARAGRAPH', 'doc-title').setText("自動生成された申請書 (GDOM)");
  
  // Sort fields by position
  const fields = structure.fields || [];
  fields.sort((a: any, b: any) => {
    const pA = a.layer_1_physical.page_index;
    const pB = b.layer_1_physical.page_index;
    if (pA !== pB) return pA - pB;
    return a.layer_1_physical.bbox[1] - b.layer_1_physical.bbox[1];
  });

  // Main Form Table
  const mainTable = gdom.createElement('TABLE', 'main-form');
  const tableData = [["項目", "内容 (ID付き)"]];

  fields.forEach((field: any, index: number) => {
    const label = field.layer_2_semantic.label || `Field ${index}`;
    const value = heuristicMatch(label, flatUsr) || "";
    // Note: To make individual cells updateable, we would need to add NamedRanges inside cells.
    // GDOM.createElement currently adds to body. 
    // For now, we build the initial static table.
    tableData.push([label, value]);
  });
  mainTable.setTableData(tableData);

  // Specific Updateable Section (Budget)
  gdom.createElement('PARAGRAPH', 'budget-header').setText("【予算サマリー】(Auto-calculated)");
  const budgetTable = gdom.createElement('TABLE', 'budget-table');
  updateBudgetTable(budgetTable, usrData.budget);

  Logger.log(`Created Doc: ${doc.getUrl()}`);
}

/**
 * [Action 2] Update an existing document (Budget Only)
 * Demonstrates ID-based partial update.
 */
function updateDoc(docId: string) {
  const doc = DocumentApp.openById(docId);
  const gdom = new GDOM(doc);
  const usrData = loadJson(CONFIG.contentFile); // Reload latest data

  const budgetTable = gdom.getElementById('budget-table');
  if (budgetTable) {
    updateBudgetTable(budgetTable, usrData.budget);
    Logger.log("Budget table updated.");
  } else {
    Logger.log("Budget table not found (ID: budget-table).");
  }
}

/**
 * [Action 3] Legacy Template Fill (Text Replacement)
 * For pre-made templates like "1 - Copy (1)"
 */
function fillTemplate() {
  const usrData = loadJson(CONFIG.contentFile);
  if (!usrData) return;
  
  const files = DriveApp.getFilesByName(CONFIG.legacyTemplateName);
  if (!files.hasNext()) {
    Logger.log(`Template '${CONFIG.legacyTemplateName}' not found.`);
    return;
  }
  
  const doc = DocumentApp.openById(files.next().getId());
  const body = doc.getBody();
  const flatData = flattenObject(usrData);
  
  let count = 0;
  for (const key in flatData) {
    const val = flatData[key];
    if (val !== null && val !== undefined) {
      try {
        body.replaceText("{{" + key + "}}", String(val));
        count++;
      } catch (e) {
        Logger.log(`Error: ${e}`);
      }
    }
  }
  doc.saveAndClose();
  Logger.log(`Legacy Template Updated: ${count} keys.`);
}

/**
 * [Action 4] Embed and Inject
 * Parses text.json and fills temp.gdoc based on sumida_gosai...json schema
 * Implements the GDOM 2-Command Strategy: Embed (Structure) -> Inject (Content)
 */
function runEmbedAndInject() {
  const structureFile = "sumida_gosai_entry_sample_2026_detected.json";
  const contentFile = "text.json";
  const targetDocName = "temp"; 

  Logger.log("Starting Embed and Inject...");

  const structure = loadJson(structureFile);
  const rawContent = loadJson(contentFile);
  
  if (!structure) {
    Logger.log(`Structure file not found: ${structureFile}`);
    return;
  }
  if (!rawContent) {
    Logger.log(`Content file not found: ${contentFile}`);
    return;
  }

  // Parse text.json
  const data: Record<string, string> = {};
  if (rawContent.document && Array.isArray(rawContent.document)) {
    rawContent.document.forEach((p: any) => {
      if (p.text) {
        // Simple splitting by first colon
        const parts = p.text.split(/[:：]/);
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join(":").trim();
          data[key] = val;
        }
      }
    });
  }
  Logger.log(`Parsed ${Object.keys(data).length} keys from content.`);

  // Find target doc
  let files = DriveApp.getFilesByName(targetDocName);
  if (!files.hasNext()) {
    files = DriveApp.getFilesByName(targetDocName + ".gdoc");
  }
  
  if (!files.hasNext()) {
    Logger.log(`Target doc not found: ${targetDocName}`);
    return;
  }
  
  const doc = files.next();
  const docId = doc.getId();
  Logger.log(`Found target doc: ${doc.getName()} (${docId})`);
  
  const targetDoc = DocumentApp.openById(docId);
  const body = targetDoc.getBody();
  const gdom = new GDOM(targetDoc);

  // --- Phase 1: Embed (Structure) ---
  Logger.log("Phase 1: Embedding Structure...");
  const fields = structure.fields || [];
  let embedCount = 0;

  fields.forEach((field: any) => {
    const label = field.layer_2_semantic?.label;
    if (!label) return;

    // Try to find the label in the doc
    const found = body.findText(label);
    if (found) {
      const element = found.getElement();
      const parent = element.getParent();
      
      // Strategy: If inside a table cell, tag the cell. Else tag the paragraph.
      let targetElement = element;
      if (parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
        // If label is in a cell, maybe we want to tag the NEXT cell? 
        // For safety/simplicity in this auto-mode, we tag the element itself 
        // so we can replace it or append to it.
        // But better UX: Tag the cell so GDOM can manage it.
        // targetElement = parent; 
      }

      // Check if ID already exists
      const existingRanges = targetDoc.getNamedRanges(field.id);
      if (existingRanges.length === 0) {
        const rangeBuilder = targetDoc.newRange();
        rangeBuilder.addElement(targetElement);
        targetDoc.addNamedRange(field.id, rangeBuilder.build());
        embedCount++;
      }
    }
  });
  Logger.log(`Embedded ${embedCount} new named ranges.`);

  // --- Phase 2: Inject (Content) ---
  Logger.log("Phase 2: Injecting Content...");
  let injectCount = 0;

  fields.forEach((field: any) => {
    const label = field.layer_2_semantic?.label;
    if (!label) return;

    // Find matching data
    // Heuristic: data key should contain label or vice versa
    let value = "";
    
    // Exact match on label
    if (data[label]) {
      value = data[label];
    } else {
      // Fuzzy match
      const cleanLabel = label.replace(/\s+/g, "").replace(/[:：]/g, "");
      for (const k in data) {
        const cleanKey = k.replace(/\s+/g, "").replace(/[:：]/g, "");
        if (cleanKey.includes(cleanLabel) || cleanLabel.includes(cleanKey)) {
          value = data[k];
          break;
        }
      }
    }

    if (value) {
      const el = gdom.getElementById(field.id);
      if (el) {
        // We found the element by ID (which we just embedded or existed)
        // Update the text. 
        // Note: This replaces the label with the value. 
        // If we want to keep the label, we should have appended.
        // For this task, we replace.
        el.setText(value);
        injectCount++;
      }
    }
  });

  targetDoc.saveAndClose();
  Logger.log(`Injection complete. Updated ${injectCount} fields.`);
}


// --- Helpers ---

function updateBudgetTable(tableElement: any, budgetData: any) {
  if (!budgetData) return;
  tableElement.setTableData([
      ["項目", "金額"],
      ["申請額", String(budgetData.request_amount || 0)],
      ["総支出", String(budgetData.total_expense || 0)],
      ["総収入", String(budgetData.total_income || 0)],
      ["更新日時", new Date().toLocaleString()]
  ]);
}

function loadJson(fileName: string) {
  const files = DriveApp.getFilesByName(fileName);
  if (!files.hasNext()) return null;
  return JSON.parse(files.next().getBlob().getDataAsString());
}

function flattenObject(ob: any, prefix = "", result: any = {}) {
  for (const i in ob) {
    if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
    if ((typeof ob[i]) === 'object' && ob[i] !== null) {
      if (Array.isArray(ob[i])) {
         ob[i].forEach((item: any, index: number) => {
             if (typeof item === 'object') {
                 flattenObject(item, prefix + i + "." + index + ".", result);
             } else {
                 result[prefix + i + "." + index] = item;
             }
         });
      } else {
         flattenObject(ob[i], prefix + i + ".", result);
      }
    } else {
      result[prefix + i] = ob[i];
    }
  }
  return result;
}

function heuristicMatch(label: string, flatUsr: any): string | null {
    if (!label) return null;
    const cleanLabel = label.replace(/[:：]/g, "").trim();
    // Simplified mapping logic
    const rules: [string, string][] = [
        ["代表者名", "applicant.representative.name.kanji"],
        ["団体名", "applicant.name.kanji"],
        ["ふりがな", "kana"],
        ["住所", "applicant.address.text"],
        ["電話", "applicant.contact.phone"],
        ["E-mail", "applicant.contact.email"],
        ["プロジェクト名", "project.title.kanji"],
        ["会場名", "project.venue.name"],
        ["概要", "project.description.summary"],
        ["金額", "budget.request_amount"]
    ];

    for (const [keyword, keySuffix] of rules) {
        if (cleanLabel.includes(keyword)) {
             if (keySuffix === "kana") return flatUsr["applicant.name.kana"];
             if (flatUsr[keySuffix]) return flatUsr[keySuffix];
             for (const k in flatUsr) if (k.endsWith(keySuffix)) return flatUsr[k];
        }
    }
    return null;
}
