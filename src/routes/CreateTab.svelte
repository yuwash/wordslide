<script lang="ts">
  import { unzipSync } from 'fflate';
  import { appState, type WordItem, type MnemonicMapping } from '../lib/state.svelte';
  import { ALPHABET_CODE } from '../lib/tokipona-12-sk';

  let pasteText = $state('');
  let fileInput: HTMLInputElement | null = $state(null);
  let zipInput: HTMLInputElement | null = $state(null);
  let uploadError = $state('');
  let successMessage = $state('');

  // Store image blobs for display
  let imageBlobs: Map<string, string> = new Map();

  function cleanCSVCell(cell: string): string {
    let cleaned = cell.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
  }

  function parseCSV(text: string): WordItem[] {
    const lines = text.split(/\r?\n/);
    const parsed: WordItem[] = [];
    let hasHeader = false;

    // Determine if there is a header
    if (lines.length > 0) {
      const firstLine = lines[0].split(',');
      const col1 = cleanCSVCell(firstLine[0] || '').toLowerCase();
      const col2 = cleanCSVCell(firstLine[1] || '').toLowerCase();
      if (
        firstLine.length >= 2 &&
        (col1 === 'word' || col1 === 'words') &&
        (col2 === 'meaning' || col2 === 'meanings' || col2 === 'translation')
      ) {
        hasHeader = true;
      }
    }

    const startIdx = hasHeader ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple comma separation
      const cols = line.split(',');
      if (cols.length >= 2) {
        const word = cleanCSVCell(cols[0]);
        const meaning = cleanCSVCell(cols.slice(1).join(','));
        if (word && meaning) {
          parsed.push({
            id: crypto.randomUUID(),
            word,
            meaning
          });
        }
      }
    }
    return parsed;
  }

  function handlePasteUpload() {
    uploadError = '';
    successMessage = '';
    try {
      const items = parseCSV(pasteText);
      if (items.length === 0) {
        uploadError = 'No valid rows found. Format should be: word,meaning';
        return;
      }
      appState.setWords(items);
      successMessage = `Successfully loaded ${items.length} words from typed/pasted CSV.`;
      pasteText = '';
    } catch (err: any) {
      uploadError = `Error parsing CSV: ${err?.message || err}`;
    }
  }

  function handleFileUpload(event: Event) {
    uploadError = '';
    successMessage = '';
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const items = parseCSV(text);
        if (items.length === 0) {
          uploadError = 'No valid rows found in the uploaded file. Format should be: word,meaning';
          return;
        }
        appState.setWords(items);
        successMessage = `Successfully loaded ${items.length} words from ${file.name}.`;
        if (fileInput) fileInput.value = ''; // Reset file input
      } catch (err: any) {
        uploadError = `Error reading file: ${err?.message || err}`;
      }
    };
    reader.onerror = () => {
      uploadError = 'Error reading the file.';
    };
    reader.readAsText(file);
  }

  function handleZipUpload(event: Event) {
    uploadError = '';
    successMessage = '';
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(arrayBuffer);
        const unzipped = unzipSync(uint8);

        // Look for mapping.json anywhere in the zip
        const mappingKey = Object.keys(unzipped).find((key) => key.endsWith('mapping.json'));
        if (!mappingKey) {
          uploadError = "Zip file does not contain 'mapping.json'.";
          return;
        }

        const decoder = new TextDecoder();
        const jsonText = decoder.decode(unzipped[mappingKey]);
        const parsed = JSON.parse(jsonText) as MnemonicMapping;

        // Validation
        if (!parsed.alphabet) {
          uploadError = "The mapping.json file is missing the 'alphabet' field.";
          return;
        }

        if (parsed.alphabet !== ALPHABET_CODE) {
          uploadError = `Alphabet code mismatch! Expected '${ALPHABET_CODE}', but zip contains mapping for '${parsed.alphabet}'.`;
          return;
        }

        if (!parsed.mappings || typeof parsed.mappings !== 'object') {
          uploadError = "The mapping.json is missing a valid 'mappings' object.";
          return;
        }

        // Validate that all mappings have either emoji or file
        for (const [key, value] of Object.entries(parsed.mappings)) {
          if (!value.emoji && !value.file) {
            uploadError = `Mapping for '${key}' must have either 'emoji' or 'file' property.`;
            return;
          }
        }

        // Extract image files and create blob URLs
        const imageFiles = Object.keys(unzipped).filter(key => 
          key.match(/\.(jpg|jpeg|png)$/i)
        );

        // Clear existing blobs
        imageBlobs.clear();

        // Process image files
        for (const key of imageFiles) {
          const imageData = unzipped[key];
          if (imageData) {
            const blob = new Blob([imageData], { type: getImageMimeType(key) });
            const blobUrl = URL.createObjectURL(blob);
            imageBlobs.set(key, blobUrl);
          }
        }

        // Update the mapping with file paths
        const updatedMappings = { ...parsed.mappings };
        for (const [key, value] of Object.entries(updatedMappings)) {
          if (value.file) {
            // Replace file reference with blob URL if it exists
            const blobUrl = imageBlobs.get(value.file);
            if (blobUrl) {
              updatedMappings[key] = {
                ...value,
                file: blobUrl
              };
            }
          }
        }

        // Create updated mapping with resolved file paths
        const updatedMapping = {
          ...parsed,
          mappings: updatedMappings
        };

        appState.setMnemonicMapping(updatedMapping);
        successMessage = `Successfully loaded mnemonic mapping zip with covered alphabet '${parsed.alphabet}'.`;
        if (zipInput) zipInput.value = ''; // Reset file input
      } catch (err: any) {
        uploadError = `Error unzipping / parsing mapping: ${err?.message || err}`;
      }
    };
    reader.onerror = () => {
      uploadError = 'Error reading the zip file.';
    };
    reader.readAsArrayBuffer(file);
  }

  function getImageMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'image/png';
    }
  }

  function handleReset() {
    appState.setWords([
      { id: '1', word: 'králik', meaning: 'rabbit' },
      { id: '2', word: 'ovca', meaning: 'sheep' },
      { id: '3', word: 'okno', meaning: 'window' },
      { id: '4', word: 'stôl', meaning: 'table' },
      { id: '5', word: 'včela', meaning: 'bee' }
    ]);
    successMessage = 'Reset to default Slovak vocabulary list.';
    uploadError = '';
  }

  function handleClear() {
    appState.setWords([]);
    successMessage = 'Cleared all words.';
    uploadError = '';
  }
</script>

<div class="box">
  <h2 class="title is-4">Configure Slideshow</h2>

  <!-- Duration Configuration -->
  <div class="field mb-5">
    <label class="label" for="duration-input">Flip / Reveal Duration (seconds)</label>
    <div class="control is-flex is-align-items-center gap-3">
      <input
        id="duration-input"
        class="input style-input-width"
        type="number"
        min="0.5"
        max="30"
        step="0.5"
        bind:value={appState.duration}
        style="width: 100px; margin-right: 15px;"
      />
      <input
        type="range"
        min="0.5"
        max="10"
        step="0.5"
        bind:value={appState.duration}
        class="slider"
        style="flex-grow: 1;"
      />
      <span class="ml-3 tag is-info is-light">{appState.duration}s per step</span>
    </div>
    <p class="help">Adjust the duration (in seconds) for each automatic card flip and reveal step.</p>
  </div>

  <hr />

  <!-- Zip Mapping Upload -->
  <h2 class="title is-4">Import Mnemonic Mapping</h2>
  <p class="subtitle is-6">
    Upload a <strong>.zip</strong> file containing a <code>mapping.json</code> file representing covered alphabet <code>{ALPHABET_CODE}</code>.
    The mapping can include either emoji or image files (jpg/png).
  </p>

  <div class="field mb-5">
    <div class="file has-name is-fullwidth">
      <label class="file-label" for="zip-upload-input">
        <input
          id="zip-upload-input"
          class="file-input"
          type="file"
          accept=".zip"
          bind:this={zipInput}
          onchange={handleZipUpload}
        />
        <span class="file-cta">
          <span class="file-icon">🤐</span>
          <span class="file-label"> Choose .zip mnemonic mapping file… </span>
        </span>
      </label>
    </div>
    <p class="help">Currently loaded mapping covers alphabet: <span class="tag is-dark">{appState.mnemonicMapping.alphabet}</span></p>
  </div>

  <hr />

  <!-- CSV Upload and Paste -->
  <h2 class="title is-4">Upload / Paste Vocabulary CSV</h2>
  <p class="subtitle is-6">
    Provide a CSV file or paste CSV content below. CSV format should be: <code>word,meaning</code>. Optional header allowed.
  </p>

  {#if uploadError}
    <div class="notification is-danger is-light">
      <button class="delete" aria-label="close" onclick={() => uploadError = ''}></button>
      {uploadError}
    </div>
  {/if}

  {#if successMessage}
    <div class="notification is-success is-light">
      <button class="delete" aria-label="close" onclick={() => successMessage = ''}></button>
      {successMessage}
    </div>
  {/if}

  <div class="columns">
    <!-- File Upload -->
    <div class="column is-6">
      <div class="field">
        <label class="label" for="csv-upload-input">Upload CSV File</label>
        <div class="file has-name is-fullwidth">
          <label class="file-label" for="csv-upload-input">
            <input
              id="csv-upload-input"
              class="file-input"
              type="file"
              accept=".csv,text/csv"
              bind:this={fileInput}
              onchange={handleFileUpload}
            />
            <span class="file-cta">
              <span class="file-icon">📁</span>
              <span class="file-label"> Choose a .csv file… </span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Paste Area -->
    <div class="column is-6">
      <div class="field">
        <label class="label" for="paste-csv-textarea">Or Paste CSV Content</label>
        <div class="control">
          <textarea
            id="paste-csv-textarea"
            class="textarea"
            placeholder="králik,rabbit&#13;ovca,sheep&#13;okno,window"
            rows="3"
            bind:value={pasteText}
          ></textarea>
        </div>
      </div>
      <div class="field">
        <button class="button is-link is-fullwidth" onclick={handlePasteUpload}>
          Load Pasted CSV
        </button>
      </div>
    </div>
  </div>

  <hr />

  <!-- Words List / Control -->
  <div class="is-flex is-justify-content-between is-align-items-center mb-3">
    <h3 class="title is-5 mb-0">Current Word List ({appState.words.length} items)</h3>
    <div class="buttons">
      <button class="button is-light is-warning" onclick={handleReset}>
        Reset to Default
      </button>
      <button class="button is-light is-danger" onclick={handleClear}>
        Clear All
      </button>
    </div>
  </div>

  {#if appState.words.length === 0}
    <div class="notification is-warning is-light has-text-centered">
      No words are currently loaded. Upload a CSV file or paste vocabulary to start learning!
    </div>
  {:else}
    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
      <table class="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th>Word</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {#each appState.words as item}
            <tr>
              <td><strong>{item.word}</strong></td>
              <td>{item.meaning}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
