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

  setWords(newWords: WordItem[]) {
    this.words = newWords;
  }

  setDuration(secs: number) {
    this.duration = secs;
  }

  setMnemonicMapping(mapping: MnemonicMapping) {
    this.mnemonicMapping = mapping;
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
  }
}

export const appState = new AppState();
