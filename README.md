# GDOC DOMlike filler (GDOM)

Autonomous grant application document generator using Google Apps Script & GDOM.

## 📖 What is GDOM?

**GDOM (Google Doc Object Model)** is a DOM-like interface for Google Apps Script.
It treats Google Docs like HTML, enabling developers to manipulate documents using familiar concepts like `getElementById` (mapped to NamedRanges) and `createElement`.

## ✨ Features

- **Schema Auto Detection**: Analyze bureaucratic PDF templates and detect fields.
- **Semantic Field Mapping**: Map user data to document fields using LLM.
- **The 2-Command Strategy**:
    1.  **Embed**: Inject structure (NamedRanges) into a raw Google Doc based on schema.
    2.  **Inject**: Fill content into the structured document.
- **Smart Table Auto-fill**: Automatically populate budget tables and lists.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Deno (for local tasks)
- Google Apps Script API enabled

### Installation

```bash
npm install
```

### Development

We use **Clasp** for pushing code to Google Apps Script and **Deno** for local task management.

```bash
# Push code to GAS
deno task push
# or
npx clasp push

# Run local tests
deno test
```

## 🛠 Usage

### 1. Embed Structure
Parse the detected schema JSON and "tag" the target Google Doc with NamedRanges.

```typescript
// In GAS Editor
// This function embeds structure (NamedRanges) based on detected JSON
// and then injects content.
runEmbedAndInject(); 
```

### 2. Inject Content
Fill the tagged document with data from your content JSON.

## 📂 Project Structure

- `src/lib/gdom.ts`: Core GDOM implementation.
- `src/main.ts`: Main entry point for GAS.
- `data/`: Sample schemas and content files.
