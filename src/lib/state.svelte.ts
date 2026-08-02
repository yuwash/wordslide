import defaultMapping from './tokipona-12-emoji.json';
import { FlashcardQueueManager } from './queue';

export interface WordItem {
  id: string;
  word: string;
  meaning: string;
}

export interface MnemonicLetterMapping {
  emoji?: string;
  file?: string;
  description: string;
}

export interface MnemonicMapping {
  alphabet: string;
  mappings: Record<string, MnemonicLetterMapping>;
}

export interface AppStateSnapshot {
  words: WordItem[];
  duration: number;
  mnemonicMapping: MnemonicMapping;
  queueState: ReturnType<FlashcardQueueManager['getState']>;
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
  queueManager = $state<FlashcardQueueManager>(new FlashcardQueueManager());

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      // Load words
      const savedWords = localStorage.getItem('wordslide_words');
      if (savedWords) {
        this.words = JSON.parse(savedWords);
      }

      // Load duration
      const savedDuration = localStorage.getItem('wordslide_duration');
      if (savedDuration) {
        this.duration = parseInt(savedDuration, 10);
      }

      // Load mnemonic mapping
      const savedMnemonicMapping = localStorage.getItem('wordslide_mnemonicMapping');
      if (savedMnemonicMapping) {
        this.mnemonicMapping = JSON.parse(savedMnemonicMapping);
      }

      // Load queue state
      const savedQueueState = localStorage.getItem('wordslide_queueState');
      if (savedQueueState) {
        const parsedQueueState = JSON.parse(savedQueueState);
        this.queueManager.restoreState(parsedQueueState);
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('wordslide_words', JSON.stringify(this.words));
      localStorage.setItem('wordslide_duration', this.duration.toString());
      localStorage.setItem('wordslide_mnemonicMapping', JSON.stringify(this.mnemonicMapping));
      localStorage.setItem('wordslide_queueState', JSON.stringify(this.queueManager.getState()));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }

  setWords(newWords: WordItem[]) {
    this.words = newWords;
    this.saveToLocalStorage();
  }

  setDuration(secs: number) {
    this.duration = secs;
    this.saveToLocalStorage();
  }

  setMnemonicMapping(mapping: MnemonicMapping) {
    this.mnemonicMapping = mapping;
    this.saveToLocalStorage();
  }

  /**
   * Get the current state of the application as a serializable object
   */
  getState(): AppStateSnapshot {
    return {
      words: [...this.words],
      duration: this.duration,
      mnemonicMapping: {...this.mnemonicMapping},
      queueState: this.queueManager.getState()
    };
  }

  /**
   * Restore the application state from a previously saved snapshot
   */
  restoreState(state: AppStateSnapshot): void {
    this.words = [...state.words];
    this.duration = state.duration;
    this.mnemonicMapping = {...state.mnemonicMapping};
    this.queueManager.restoreState(state.queueState);
    this.saveToLocalStorage();
  }
}

export const appState = new AppState();
