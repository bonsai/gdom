/**
 * GDOM: Google Doc Object Model & AutoPilot
 * Pure JavaScript Version for Google Apps Script
 */

// ==========================================
// 1. GDOM CORE (Element & GDOM)
// ==========================================

class GDOMElement {
  constructor(doc, id, namedRange) {
    this.doc = doc;
    this.id = id;
    this.namedRange = namedRange;
  }

  getId() {
    return this.id;
  }

  setText(text) {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();

    elements.forEach((re) => {
      const el = re.getElement();
      if (el.getType() === DocumentApp.ElementType.TEXT) {
        el.asText().setText("");
      } else if (el.getType() === DocumentApp.ElementType.PARAGRAPH) {
        el.asParagraph().setText("");
      }
    });

    if (elements.length > 0) {
      const first = elements[0].getElement();
      if (first.getType() === DocumentApp.ElementType.PARAGRAPH) {
        first.asParagraph().setText(text);
      } else if (first.getType() === DocumentApp.ElementType.TEXT) {
        first.asText().setText(text);
      }
    }
  }

  injectValue(text) {
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

  setTableData(data) {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    
    let table = null;
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

    for (let r = 0; r < data.length; r++) {
      if (r >= table.getNumRows()) table.appendTableRow();
      const row = table.getRow(r);
      const rowData = data[r];
      for (let c = 0; c < rowData.length; c++) {
        if (c >= row.getNumCells()) row.appendTableCell();
        row.getCell(c).setText(String(rowData[c]));
      }
    }
  }

  setMetadata(key, value) {
    const range = this.namedRange.getRange();
    const elements = range.getRangeElements();
    if (elements.length > 0) {
      const el = elements[0].getElement();
      el.addDeveloperMetadata(key, JSON.stringify(value));
    }
  }
}

class GDOM {
  constructor(doc) {
    this.doc = doc;
  }

  getElementById(id) {
    const ranges = this.doc.getNamedRanges(id);
    if (ranges.length === 0) return null;
    return new GDOMElement(this.doc, id, ranges[0]);
  }

  createElement(tagName, id) {
    const body = this.doc.getBody();
    let element;

    if (tagName === 'TABLE') {
      element = body.appendTable();
    } else {
      element = body.appendParagraph("");
    }

    const rangeBuilder = this.doc.newRange();
    rangeBuilder.addElement(element);
    this.doc.addNamedRange(id, rangeBuilder.build());

    return new GDOMElement(this.doc, id, this.doc.getNamedRanges(id)[0]);
  }
}

// ==========================================
// 2. MAIN LOGIC (Embed & Inject)
// ==========================================

function onOpen() {
  const ui = getUi();
  if (ui) {
    ui.createMenu("Grant AutoPilot")
      .addItem("🚀 一発実行 (Embed -> Inject -> DB保存)", "runEmbedAndInject")
      .addSeparator()
      .addItem("💾 CSVエクスポート (全シート)", "exportAllSheetsToCsv")
      .addToUi();
  }
}

function getUi() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    try {
      return DocumentApp.getUi();
    } catch (e) {
      return null;
    }
  }
}

// ==========================================
// 4. CSV Export Logic
// ==========================================
function exportAllSheetsToCsv() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const ssId = ss.getId();
  
  // Save in the same folder as the spreadsheet
  const parentFolder = DriveApp.getFileById(ssId).getParents().next(); 
  
  let count = 0;
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    
    // Skip Dashboard as it is UI only
    if (sheetName === "Dashboard") return;

    const csvData = convertToCsv(sheet);
    const fileName = `${sheetName}.csv`;
    
    // Check if file exists and update or create new
    const existingFiles = parentFolder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const file = existingFiles.next();
      file.setContent(csvData);
    } else {
      parentFolder.createFile(fileName, csvData, MimeType.CSV);
    }
    count++;
  });
  
  const ui = getUi();
  if (ui) {
    ui.alert(`完了: ${count} シートをCSVとして出力しました。\n保存先: ${parentFolder.getName()}`);
  }
}

function convertToCsv(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return "";
  
  return data.map(row => {
    return row.map(cell => {
      let cellStr = "";
      if (cell instanceof Date) {
        cellStr = cell.toISOString();
      } else {
        cellStr = String(cell);
      }
      
      // Escape double quotes and wrap in quotes if contains comma, newline or quote
      if (cellStr.search(/["\n,]/g) !== -1) {
        cellStr = '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    }).join(",");
  }).join("\n");
}

function runEmbedAndInject() {
  const structureFile = "sumida_gosai_entry_sample_2026_detected.json";
  const contentFile = "text.json";
  const targetDocName = "temp"; 

  Logger.log("Starting Embed and Inject...");

  try {
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
    const data = {};
    if (rawContent.document && Array.isArray(rawContent.document)) {
      rawContent.document.forEach((p) => {
        if (p.text) {
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
    let fields = structure.fields || [];
    
    // LIMIT FOR TESTING: Only process first 10 fields
    Logger.log("TEST MODE: Limiting to first 10 fields.");
    fields = fields.slice(0, 10);

    let embedCount = 0;

    fields.forEach((field) => {
      const label = field.layer_2_semantic?.label;
      if (!label) {
        Logger.log(`Skipping field ${field.id}: No label`);
        return;
      }

      // 1. Basic Normalization
      // Escape special regex characters
      let escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 2. Flexible Whitespace
      // Replace explicit spaces with flexible whitespace pattern (\s*)
      escapedLabel = escapedLabel.replace(/\s+/g, '\\s*');
      
      // 3. Relaxed Punctuation (「細切れ」かつ「緩やか」な検索)
      // Replace common punctuation with a wildcard pattern that accepts anything or nothing
      // Matches: 、 。 ※ : ： ( ) （ ） 「 」 『 』
      escapedLabel = escapedLabel.replace(/[、。※:：()（）「」『』]/g, '.*?');

      // 4. Truncate Long Labels
      // If the label is long, search for the beginning part only to avoid mismatch due to minor tail differences
      if (label.length > 30) {
        // Take first 20 characters for the "core" match
        const shortLabel = label.substring(0, 20);
        // Re-apply escaping to the short version
        let shortEscaped = shortLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        shortEscaped = shortEscaped.replace(/\s+/g, '\\s*');
        shortEscaped = shortEscaped.replace(/[、。※:：()（）「」『』]/g, '.*?');
        
        Logger.log(`Long label detected. Relaxing pattern to start-match: "${shortLabel}..."`);
        escapedLabel = shortEscaped; 
      }
      
      Logger.log(`Searching for: "${label}" (Pattern: "${escapedLabel}")`);
      
      try {
        const found = body.findText(escapedLabel);
        if (found) {
          Logger.log(`Match FOUND for: "${label}"`);
          const element = found.getElement();
          
          // Check if ID already exists
          const existingRanges = targetDoc.getNamedRanges(field.id);
          if (existingRanges.length === 0) {
            const rangeBuilder = targetDoc.newRange();
            rangeBuilder.addElement(element);
            targetDoc.addNamedRange(field.id, rangeBuilder.build());
            embedCount++;
            Logger.log(`Added NamedRange: ${field.id}`);
          } else {
            Logger.log(`NamedRange already exists: ${field.id}`);
          }
        } else {
          Logger.log(`Match NOT found for: "${label}"`);
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

      let value = "";
      if (data[label]) {
        value = data[label];
      } else {
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
          el.injectValue(value);
          injectCount++;
        }
      }
    });

    targetDoc.saveAndClose();
    Logger.log(`Injection complete. Updated ${injectCount} fields.`);

    // --- Phase 3: Save to Master Spreadsheet ---
    Logger.log("Phase 3: Saving to Master Spreadsheet...");
    saveToMasterSheet(docId, doc.getName(), structure, data);
    Logger.log("Saved to GDOM_Master_DB.");

  } catch (error) {
    Logger.log(`Error in runEmbedAndInject: ${error}`);
    throw error;
  }
}

function saveToMasterSheet(docId, docName, structure, contentData) {
  const SPREADSHEET_NAME = "GDOM_Master_DB";
  let ss = null;
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  }

  const timestamp = new Date();

  // ---------------------------------------------------------
  // 1. Structure Sheet (解析されたメタデータ)
  // ---------------------------------------------------------
  let structSheet = ss.getSheetByName("Structure_Metadata");
  if (!structSheet) {
    structSheet = ss.insertSheet("Structure_Metadata");
    structSheet.appendRow(["Timestamp", "DocID", "Field_ID", "Label", "Description", "Type", "Required"]);
    structSheet.setFrozenRows(1);
  }
  
  const fields = structure.fields || [];
  const structRows = fields.map(f => [
    timestamp,
    docId,
    f.id || "",
    f.layer_2_semantic?.label || "",
    f.layer_2_semantic?.description || "",
    f.layer_2_semantic?.value_type || "",
    f.layer_2_semantic?.required || ""
  ]);
  
  if (structRows.length > 0) {
    structSheet.getRange(structSheet.getLastRow() + 1, 1, structRows.length, structRows[0].length).setValues(structRows);
  }

  // ---------------------------------------------------------
  // 2. Answer Sheet (生成された回答 text.json)
  // ---------------------------------------------------------
  let answerSheet = ss.getSheetByName("Answer_Data");
  if (!answerSheet) {
    answerSheet = ss.insertSheet("Answer_Data");
    answerSheet.appendRow(["Timestamp", "DocID", "Key (Label)", "Value (Answer)"]);
    answerSheet.setFrozenRows(1);
  }

  const answerRows = [];
  for (const key in contentData) {
     if (Object.prototype.hasOwnProperty.call(contentData, key)) {
       answerRows.push([timestamp, docId, key, contentData[key]]);
     }
  }
  
  if (answerRows.length > 0) {
    answerSheet.getRange(answerSheet.getLastRow() + 1, 1, answerRows.length, answerRows[0].length).setValues(answerRows);
  }

  // ---------------------------------------------------------
  // 3. Match Sheet (突合シート: Structure vs Answer)
  // ---------------------------------------------------------
  let matchSheet = ss.getSheetByName("Match_Result");
  if (!matchSheet) {
    matchSheet = ss.insertSheet("Match_Result");
    matchSheet.appendRow(["Timestamp", "DocID", "Field_ID", "Target Label", "Matched Value", "Status"]);
    matchSheet.setFrozenRows(1);
  }

  const matchRows = [];
  fields.forEach(f => {
    const label = f.layer_2_semantic?.label;
    if (!label) return;

    // Simple matching logic (same as inject logic)
    let value = "";
    let status = "MISSING";
    
    if (contentData[label]) {
      value = contentData[label];
      status = "EXACT_MATCH";
    } else {
      const cleanLabel = label.replace(/\s+/g, "").replace(/[:：]/g, "");
      for (const k in contentData) {
        if (!Object.prototype.hasOwnProperty.call(contentData, k)) continue;
        const cleanKey = k.replace(/\s+/g, "").replace(/[:：]/g, "");
        if (cleanKey.includes(cleanLabel) || cleanLabel.includes(cleanKey)) {
          value = contentData[k];
          status = "FUZZY_MATCH";
          break;
        }
      }
    }
    
    matchRows.push([timestamp, docId, f.id, label, value, status]);
  });

  if (matchRows.length > 0) {
    matchSheet.getRange(matchSheet.getLastRow() + 1, 1, matchRows.length, matchRows[0].length).setValues(matchRows);
  }

  // ---------------------------------------------------------
  // 4. File Links Sheet (すべてのファイルリンク)
  // ---------------------------------------------------------
  let linkSheet = ss.getSheetByName("File_Links");
  if (!linkSheet) {
    linkSheet = ss.insertSheet("File_Links");
    linkSheet.appendRow(["Timestamp", "DocID", "DocName", "Doc URL", "Structure JSON", "Content JSON"]);
    linkSheet.setFrozenRows(1);
  }

  const docUrl = DriveApp.getFileById(docId).getUrl();
  // Assuming JSON files are in the same folder or searchable
  // For simplicity, just putting names here, but could be URLs if we searched for them
  linkSheet.appendRow([timestamp, docId, docName, docUrl, "sumida_gosai_entry_sample_2026_detected.json", "text.json"]);

  // ---------------------------------------------------------
  // 5. Dashboard / Button Sheet (ボタンがあるシート)
  // ---------------------------------------------------------
  let dashSheet = ss.getSheetByName("Dashboard");
  if (!dashSheet) {
    dashSheet = ss.insertSheet("Dashboard");
    // Setup instructions
    dashSheet.getRange("B2").setValue("🚀 GDOM Control Panel").setFontSize(14).setFontWeight("bold");
    dashSheet.getRange("B4").setValue("メニューバーの [Grant AutoPilot] > [🚀 一発実行] をクリックしてください。");
    dashSheet.getRange("B5").setValue("※初回のみスクリプトの承認が必要です。");
    
    // Optional: Draw a "fake" button cell
    const btnCell = dashSheet.getRange("B7");
    btnCell.setValue("RUN GDOM (Click Menu)");
    btnCell.setBackground("#4285F4").setFontColor("white").setHorizontalAlignment("center").setFontWeight("bold");
    
    dashSheet.activate();
  }
}

function loadJson(fileName) {
  try {
    const files = DriveApp.getFilesByName(fileName);
    if (!files.hasNext()) {
      Logger.log(`File not found: ${fileName}`);
      return null;
    }
    const content = files.next().getBlob().getDataAsString();
    return JSON.parse(content);
  } catch (error) {
    Logger.log(`Error loading JSON from ${fileName}: ${error}`);
    return null;
  }
}
