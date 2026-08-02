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
  currentWordIndex: number;
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
  currentWordIndex = $state<number>(0);

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

      // Load current word index
      const savedCurrentWordIndex = localStorage.getItem('wordslide_currentWordIndex');
      if (savedCurrentWordIndex) {
        this.currentWordIndex = parseInt(savedCurrentWordIndex, 10);
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }

  private saveItemToLocalStorage(key: string, value: string): void {
    const absoluteKey = 'wordslide_' + key;
    try {
      localStorage.setItem(absoluteKey, value);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }

  setWords(newWords: WordItem[]) {
    this.words = newWords;
    this.saveItemToLocalStorage('words', JSON.stringify(this.words));
  }

  setDuration(secs: number) {
    this.duration = secs;
    this.saveItemToLocalStorage('duration', this.duration.toString());
  }

  setMnemonicMapping(mapping: MnemonicMapping) {
    this.mnemonicMapping = mapping;
    this.saveItemToLocalStorage('mnemonicMapping', JSON.stringify(this.mnemonicMapping));
  }

  setCurrentWordIndex(index: number) {
    this.currentWordIndex = index;
    this.saveItemToLocalStorage('currentWordIndex', this.currentWordIndex.toString());
  }

  saveQueueState() {
    this.saveItemToLocalStorage('queueState', JSON.stringify(this.queueManager.getState()));
  }

  /**
   * Get the current state of the application as a serializable object
   */
  getState(): AppStateSnapshot {
    return {
      words: [...this.words],
      duration: this.duration,
      mnemonicMapping: {...this.mnemonicMapping},
      queueState: this.queueManager.getState(),
      currentWordIndex: this.currentWordIndex
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
    this.currentWordIndex = state.currentWordIndex;
  }
}

export const appState = new AppState();
