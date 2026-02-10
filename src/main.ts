/**
 * Grant AutoPilot Main Entry Point
 * 
 * Functions:
 * 1. buildDoc: Creates a new Grant Application Doc using GDOM (Structure + Content)
 * 2. updateDoc: Updates an existing Grant Application Doc using GDOM (Content Only)
 * 3. fillTemplate: Fills a legacy template using text replacement
 * 4. runEmbedAndInject: Implements the GDOM 2-Command Strategy
 */

import { GDOM } from './lib/gdom';
import { GDOMElement } from './lib/element';

// --- Configuration ---
const CONFIG = {
  structureFile: "sumida_gosai_entry_sample_2026_detected.json",
  contentFile: "filled_usr.json",
  outputTitle: "Generated Grant Application (Auto)",
  legacyTemplateName: "1 - Copy (1)"
};

// --- Type Definitions ---
interface StructureField {
  id: string;
  layer_1_physical: {
    page_index: number;
    bbox: number[];
  };
  layer_2_semantic?: {
    label?: string;
  };
}

interface Structure {
  fields?: StructureField[];
}

interface BudgetData {
  request_amount?: number;
  total_expense?: number;
  total_income?: number;
}

interface UserData {
  budget?: BudgetData;
  [key: string]: any;
}

/**
 * [Action 1] Build a new document from scratch based on detected structure
 * Uses GDOM to assign IDs (NamedRanges) for future updates.
 */
function buildDoc(): void {
  try {
    const structure = loadJson<Structure>(CONFIG.structureFile);
    const usrData = loadJson<UserData>(CONFIG.contentFile);
    
    if (!structure || !usrData) {
      Logger.log("Failed to load required files");
      return;
    }

    const doc = DocumentApp.create(CONFIG.outputTitle);
    const gdom = new GDOM(doc);
    const flatUsr = flattenObject(usrData);

    // Header
    gdom.createElement('PARAGRAPH', 'doc-title').setText("自動生成された申請書 (GDOM)");
    
    // Sort fields by position
    const fields = structure.fields || [];
    fields.sort((a, b) => {
      const pA = a.layer_1_physical.page_index;
      const pB = b.layer_1_physical.page_index;
      if (pA !== pB) return pA - pB;
      return a.layer_1_physical.bbox[1] - b.layer_1_physical.bbox[1];
    });

    // Main Form Table
    const mainTable = gdom.createElement('TABLE', 'main-form');
    const tableData: string[][] = [["項目", "内容 (ID付き)"]];

    fields.forEach((field, index) => {
      const label = field.layer_2_semantic?.label || `Field ${index}`;
      const value = heuristicMatch(label, flatUsr) || "";
      tableData.push([label, value]);
    });
    mainTable.setTableData(tableData);

    // Specific Updateable Section (Budget)
    gdom.createElement('PARAGRAPH', 'budget-header').setText("【予算サマリー】(Auto-calculated)");
    const budgetTable = gdom.createElement('TABLE', 'budget-table');
    updateBudgetTable(budgetTable, usrData.budget);

    Logger.log(`Created Doc: ${doc.getUrl()}`);
  } catch (error) {
    Logger.log(`Error in buildDoc: ${error}`);
    throw error;
  }
}

/**
 * [Action 2] Update an existing document (Budget Only)
 * Demonstrates ID-based partial update.
 */
function updateDoc(docId: string): void {
  try {
    const doc = DocumentApp.openById(docId);
    const gdom = new GDOM(doc);
    const usrData = loadJson<UserData>(CONFIG.contentFile);
    
    if (!usrData) {
      Logger.log("Failed to load user data");
      return;
    }

    const budgetTable = gdom.getElementById('budget-table');
    if (budgetTable) {
      updateBudgetTable(budgetTable, usrData.budget);
      Logger.log("Budget table updated.");
    } else {
      Logger.log("Budget table not found (ID: budget-table).");
    }
  } catch (error) {
    Logger.log(`Error in updateDoc: ${error}`);
    throw error;
  }
}

/**
 * [Action 3] Legacy Template Fill (Text Replacement)
 * For pre-made templates like "1 - Copy (1)"
 */
function fillTemplate(): void {
  try {
    const usrData = loadJson<UserData>(CONFIG.contentFile);
    if (!usrData) {
      Logger.log("Failed to load user data");
      return;
    }
    
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
      if (!Object.prototype.hasOwnProperty.call(flatData, key)) continue;
      
      const val = flatData[key];
      if (val !== null && val !== undefined) {
        try {
          body.replaceText("{{" + key + "}}", String(val));
          count++;
        } catch (e) {
          Logger.log(`Error replacing ${key}: ${e}`);
        }
      }
    }
    
    doc.saveAndClose();
    Logger.log(`Legacy Template Updated: ${count} keys.`);
  } catch (error) {
    Logger.log(`Error in fillTemplate: ${error}`);
    throw error;
  }
}

/**
 * [Action 4] Embed and Inject
 * Parses text.json and fills temp.gdoc based on sumida_gosai...json schema
 * Implements the GDOM 2-Command Strategy: Embed (Structure) -> Inject (Content)
 */
function runEmbedAndInject(): void {
  const structureFile = "sumida_gosai_entry_sample_2026_detected.json";
  const contentFile = "text.json";
  const targetDocName = "temp"; 

  Logger.log("Starting Embed and Inject...");

  try {
    const structure = loadJson<Structure>(structureFile);
    const rawContent = loadJson<any>(contentFile);
    
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

    fields.forEach((field) => {
      const label = field.layer_2_semantic?.label;
      if (!label) return;

      // Skip very long labels that might cause regex errors
      if (label.length > 200) {
        Logger.log(`Skipping long label (${label.length} chars): ${label.substring(0, 50)}...`);
        return;
      }

      // Try to find the label in the doc
      // Escape special characters in label for findText
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      try {
        const found = body.findText(escapedLabel);
        if (found) {
          const element = found.getElement();
          
          // Check if ID already exists
          const existingRanges = targetDoc.getNamedRanges(field.id);
          if (existingRanges.length === 0) {
            const rangeBuilder = targetDoc.newRange();
            rangeBuilder.addElement(element);
            targetDoc.addNamedRange(field.id, rangeBuilder.build());
            embedCount++;
          }
        }
      } catch (e) {
        Logger.log(`Skipping invalid label pattern: "${label}" (Escaped: "${escapedLabel}") - Error: ${e}`);
      }
    });
    Logger.log(`Embedded ${embedCount} new named ranges.`);

    // --- Phase 2: Inject (Content) ---
    Logger.log("Phase 2: Injecting Content...");
    let injectCount = 0;

    fields.forEach((field) => {
      const label = field.layer_2_semantic?.label;
      if (!label) return;

      // Find matching data
      let value = "";
      
      // Exact match on label
      if (data[label]) {
        value = data[label];
      } else {
        // Fuzzy match
        const cleanLabel = label.replace(/\s+/g, "").replace(/[:：]/g, "");
        for (const k in data) {
          if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
          
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
          el.setText(value);
          injectCount++;
        }
      }
    });

    targetDoc.saveAndClose();
    Logger.log(`Injection complete. Updated ${injectCount} fields.`);
  } catch (error) {
    Logger.log(`Error in runEmbedAndInject: ${error}`);
    throw error;
  }
}

// --- Helper Functions ---

/**
 * Update budget table with current data
 */
function updateBudgetTable(tableElement: GDOMElement, budgetData?: BudgetData): void {
  if (!budgetData) return;
  
  tableElement.setTableData([
    ["項目", "金額"],
    ["申請額", String(budgetData.request_amount || 0)],
    ["総支出", String(budgetData.total_expense || 0)],
    ["総収入", String(budgetData.total_income || 0)],
    ["更新日時", new Date().toLocaleString()]
  ]);
}

/**
 * Load and parse JSON file from Google Drive
 * @throws Error if JSON parsing fails
 */
function loadJson<T>(fileName: string): T | null {
  try {
    const files = DriveApp.getFilesByName(fileName);
    if (!files.hasNext()) {
      Logger.log(`File not found: ${fileName}`);
      return null;
    }
    
    const content = files.next().getBlob().getDataAsString();
    return JSON.parse(content) as T;
  } catch (error) {
    Logger.log(`Error loading JSON from ${fileName}: ${error}`);
    return null;
  }
}

/**
 * Recursively flatten nested object into dot-notation keys
 * @example { user: { name: "Alice" } } => { "user.name": "Alice" }
 */
function flattenObject(ob: any, prefix = "", result: Record<string, any> = {}): Record<string, any> {
  for (const i in ob) {
    if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
    
    if (typeof ob[i] === 'object' && ob[i] !== null) {
      if (Array.isArray(ob[i])) {
        ob[i].forEach((item: any, index: number) => {
          if (typeof item === 'object') {
            flattenObject(item, `${prefix}${i}.${index}.`, result);
          } else {
            result[`${prefix}${i}.${index}`] = item;
          }
        });
      } else {
        flattenObject(ob[i], `${prefix}${i}.`, result);
      }
    } else {
      result[prefix + i] = ob[i];
    }
  }
  return result;
}

/**
 * Match field label to user data key using heuristics
 */
function heuristicMatch(label: string, flatUsr: Record<string, any>): string | null {
  if (!label) return null;
  
  const cleanLabel = label.replace(/[:：]/g, "").trim();
  
  // Mapping rules for common fields
  const rules: Array<[string, string]> = [
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
      if (keySuffix === "kana") return flatUsr["applicant.name.kana"] || null;
      if (flatUsr[keySuffix]) return flatUsr[keySuffix];
      
      // Search for any key ending with the suffix
      for (const k in flatUsr) {
        if (k.endsWith(keySuffix)) return flatUsr[k];
      }
    }
  }
  
  return null;
}

// Export functions for use in UI
export { buildDoc, updateDoc, fillTemplate, runEmbedAndInject };
