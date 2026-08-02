import defaultMapping from './tokipona-12-emoji.json';

export interface WordItem {
  id: string;
  word: string;
  meaning: string;
}

export interface MnemonicLetterMapping {
  emoji: string;
  description: string;
}

export interface MnemonicMapping {
  alphabet: string;
  mappings: Record<string, MnemonicLetterMapping>;
}

const defaultWords: WordItem[] = [
  { id: '1', word: 'králik', meaning: 'rabbit' },
  { id: '2', word: 'ovca', meaning: 'sheep' },
  { id: '3', word: 'okno', meaning: 'window' },
  { id: '4', word: 'stôl', meaning: 'table' },
  { id: '5', word: 'včela', meaning: 'bee' }
];

class AppState {
  words = $state<WordItem[]>(defaultWords);
  duration = $state<number>(2); // in seconds
  mnemonicMapping = $state<MnemonicMapping>(defaultMapping as MnemonicMapping);

  setWords(newWords: WordItem[]) {
    this.words = newWords;
  }

  setDuration(secs: number) {
    this.duration = secs;
  }

  setMnemonicMapping(mapping: MnemonicMapping) {
    this.mnemonicMapping = mapping;
  }
}

export const appState = new AppState();
