/**
 * PDF Export Module
 * Exports Google Docs as PDF files to Google Drive
 */

/**
 * Export a Google Doc as PDF to a specified folder
 * 
 * @param docId - Google Doc ID to export
 * @param folderId - Google Drive folder ID for output
 * @returns Created file object
 * 
 * @throws Error if document or folder cannot be accessed
 * 
 * @example
 * const file = exportPDF(docId, folderId);
 * Logger.log(`PDF created: ${file.getUrl()}`);
 */
export function exportPDF(
  docId: string, 
  folderId: string
): GoogleAppsScript.Drive.File {
  try {
    const file = DriveApp.getFileById(docId);
    const fileName = file.getName();
    
    Logger.log(`Exporting document: ${fileName}`);
    
    const blob = file.getAs("application/pdf");
    const folder = DriveApp.getFolderById(folderId);
    
    // Generate timestamped filename
    const timestamp = Utilities.formatDate(
      new Date(), 
      Session.getScriptTimeZone(), 
      "yyyyMMdd_HHmmss"
    );
    const pdfFileName = `${fileName}_${timestamp}.pdf`;
    
    const pdfFile = folder.createFile(blob);
    pdfFile.setName(pdfFileName);
    
    Logger.log(`PDF exported: ${pdfFile.getUrl()}`);
    return pdfFile;
  } catch (error) {
    Logger.log(`Error in exportPDF: ${error}`);
    throw new Error(`Failed to export PDF: ${error}`);
  }
}

/**
 * Export multiple documents as PDFs
 * 
 * @param docIds - Array of Google Doc IDs
 * @param folderId - Google Drive folder ID for output
 * @returns Array of created file objects
 */
export function exportMultiplePDFs(
  docIds: string[],
  folderId: string
): GoogleAppsScript.Drive.File[] {
  const results: GoogleAppsScript.Drive.File[] = [];
  const errors: string[] = [];
  
  docIds.forEach((docId, index) => {
    try {
      Logger.log(`Exporting document ${index + 1}/${docIds.length}`);
      const file = exportPDF(docId, folderId);
      results.push(file);
    } catch (error) {
      Logger.log(`Failed to export ${docId}: ${error}`);
      errors.push(`${docId}: ${error}`);
    }
  });
  
  if (errors.length > 0) {
    Logger.log(`Export completed with ${errors.length} errors:\n${errors.join('\n')}`);
  }
  
  return results;
}
