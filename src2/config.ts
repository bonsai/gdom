/**
 * Application Configuration
 * 
 * Environment variables should be set in Script Properties:
 * File > Project Settings > Script Properties
 */

interface AppConfig {
  TEMPLATE_DOC_ID: string;
  OUTPUT_FOLDER_ID: string;
}

/**
 * Get configuration from Script Properties or use defaults
 */
function getConfig(): AppConfig {
  const props = PropertiesService.getScriptProperties();
  
  return {
    TEMPLATE_DOC_ID: props.getProperty('TEMPLATE_DOC_ID') || '',
    OUTPUT_FOLDER_ID: props.getProperty('OUTPUT_FOLDER_ID') || ''
  };
}

export const CONFIG = getConfig();

/**
 * Validate that required configuration is present
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!CONFIG.TEMPLATE_DOC_ID) missing.push('TEMPLATE_DOC_ID');
  if (!CONFIG.OUTPUT_FOLDER_ID) missing.push('OUTPUT_FOLDER_ID');
  
  return {
    valid: missing.length === 0,
    missing
  };
}
