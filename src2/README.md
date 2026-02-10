# Grant AutoPilot

Autonomous grant application document generator using Google Apps Script.

## Features
- Schema auto detection from bureaucratic templates
- LLM semantic field mapping
- Smart table auto-fill
- One-click PDF export
- DOM-like API for Google Docs manipulation (GDOM)

## Research Topics
GovTech, NLP, HCI, Digital Humanities

## Setup

### 1. Install Dependencies
```bash
npm install
# or
deno install
```

### 2. Configure Script Properties
Set the following properties in Google Apps Script:
- Go to: **File > Project Settings > Script Properties**
- Add properties:
  - `TEMPLATE_DOC_ID`: Your template document ID
  - `OUTPUT_FOLDER_ID`: Output folder ID for generated files

### 3. Deploy
```bash
npm run push
# or
deno task push
```

## Development

### Available Commands
```bash
# Push code to Google Apps Script
npm run push
deno task push

# Run tests (Deno)
deno test

# Open project in Apps Script Editor
deno task open
```

### Project Structure
```
src/
├── main.ts           # Main entry points
├── ui.ts             # Google Docs UI integration
├── config.ts         # Configuration management
├── lib/
│   ├── gdom.ts       # GDOM (Google Doc Object Model)
│   ├── element.ts    # GDOMElement class
│   ├── fill.ts       # Smart fill logic
│   └── schema.ts     # Schema detection
├── semantic.ts       # Similarity algorithms
├── pdf.ts           # PDF export
└── types/
    └── usr.d.ts     # Type definitions
```

## Usage

### From Google Docs UI
1. Open your document
2. Menu: **Grant AutoPilot > 自動入力**
3. Menu: **Grant AutoPilot > PDF出力**

### Programmatic Usage

#### Build New Document
```typescript
import { buildDoc } from './main';
buildDoc();
```

#### Update Existing Document
```typescript
import { updateDoc } from './main';
updateDoc('DOCUMENT_ID');
```

#### Smart Fill with GDOM
```typescript
import { GDOM } from './lib/gdom';

const doc = DocumentApp.getActiveDocument();
const gdom = new GDOM(doc);

// Embed structure
gdom.embed({
  fields: [
    { id: "title", type: "text", meta: { label: "タイトル" } },
    { id: "budget", type: "table" }
  ]
});

// Inject content
gdom.inject({
  "title": "プロジェクトタイトル",
  "budget": [
    ["項目", "金額"],
    ["材料費", "100,000円"]
  ]
});
```

## Recent Improvements (v2.0)

### Code Quality
- ✅ Added comprehensive error handling
- ✅ Improved type safety (reduced `any` usage)
- ✅ Added JSDoc documentation
- ✅ Removed unused code and imports

### Configuration
- ✅ Environment variable support via Script Properties
- ✅ Configuration validation
- ✅ No more hardcoded IDs in source code

### Features
- ✅ Enhanced semantic similarity with Levenshtein distance
- ✅ Advanced schema detection with filtering
- ✅ Batch PDF export support
- ✅ Timestamped PDF filenames

### Testing
- ✅ Improved test coverage
- ✅ Added GDOM integration tests
- ✅ Semantic similarity tests

## API Reference

### GDOM (Google Doc Object Model)

```typescript
class GDOM {
  getElementById(id: string): GDOMElement | null
  createElement(tagName: 'PARAGRAPH' | 'TABLE', id: string): GDOMElement
  getElementsByTagName(tagName: 'PARAGRAPH' | 'TABLE'): GDOMElement[]
  embed(metadata: EmbedMetadata): void
  inject(content: InjectContent): void
}
```

### GDOMElement

```typescript
class GDOMElement {
  setText(text: string): void
  setTableData(data: string[][]): void
  setMetadata(key: string, value: any): void
  getMetadata(key: string): any | null
}
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests: `deno test`
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

## Changelog

### v2.0.0 (2025-02-10)
- Major refactoring for code quality
- Added comprehensive error handling
- Improved type safety
- Configuration management via Script Properties
- Enhanced documentation
- Extended semantic similarity algorithms
- Batch PDF export support

### v1.0.0
- Initial release
- Basic GDOM implementation
- Smart fill functionality
- Schema auto-detection
