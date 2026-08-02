export interface FlashcardQueueConfig {
  /**
   * Waiting numbers representing how many OTHER card reviews must occur 
   * before this card is shown again. 
   * Default: [1, 3, 10, 30, 100]
   */
  waitingIntervals?: number[];
}

export interface QueuedCard {
  cardId: string;
  reviewCount: number;
  scheduledAtPosition: number;
}

export interface FlashcardQueueState {
  queue: QueuedCard[];
  reviewCounter: number;
  waitingIntervals: number[];
}

export class FlashcardQueueManager {
  private queue: QueuedCard[] = [];
  private reviewCounter: number = 0;
  private readonly waitingIntervals: number[];

  constructor(config?: FlashcardQueueConfig) {
    this.waitingIntervals = config?.waitingIntervals ?? [1, 3, 10, 30, 100];
  }

  /**
   * Advances the progress of the flashcard review session.
   * 
   * @param reviewedCardId The ID of the card that was just completed, or `undefined` / `null` if starting a fresh session.
   * @returns The ID of the next due card from the queue, or `null` if no queued card is due (indicating a new card can be introduced).
   */
  public progress(reviewedCardId?: string | null): string | null {
    // Increment total review counter on every progress call
    this.reviewCounter++;

    // 1. Process the card that was just completed (if provided)
    if (reviewedCardId) {
      this.requeueCard(reviewedCardId);
    }

    // 2. Check if the top card in the queue is ready for review
    const head = this.queue[0];
    if (head && head.scheduledAtPosition <= this.reviewCounter) {
      // Return the due card ID without modifying its queue state.
      // The state only updates on the NEXT progress call when this card ID is passed back.
      return head.cardId;
    }

    // No card is ready to be reviewed; caller should introduce a new card
    return null;
  }

  /**
   * Handles updating the review count and inserting/re-queuing the card.
   */
  private requeueCard(cardId: string): void {
    let reviewCount = 0;

    // Remove the card if it was previously in the queue (e.g. at the top position)
    const existingIndex = this.queue.findIndex((item) => item.cardId === cardId);
    if (existingIndex !== -1) {
      const [existingCard] = this.queue.splice(existingIndex, 1);
      reviewCount = existingCard.reviewCount;
    }

    // Increment review count for this card
    reviewCount++;

    // Determine waiting steps based on intervals (fall back to max interval if exceeded)
    const intervalIndex = Math.min(reviewCount - 1, this.waitingIntervals.length - 1);
    const waitNumber = this.waitingIntervals[intervalIndex];

    const scheduledAtPosition = this.reviewCounter + waitNumber;

    const updatedCard: QueuedCard = {
      cardId,
      reviewCount,
      scheduledAtPosition,
    };

    // Insert into queue ordered by scheduledAtPosition ascending
    this.insertInOrder(updatedCard);
  }

  /**
   * Inserts a card into the queue maintained in ascending order of `scheduledAtPosition`.
   */
  private insertInOrder(card: QueuedCard): void {
    const insertIndex = this.queue.findIndex(
      (item) => item.scheduledAtPosition > card.scheduledAtPosition
    );

    if (insertIndex === -1) {
      this.queue.push(card);
    } else {
      this.queue.splice(insertIndex, 0, card);
    }
  }

  /**
   * Helper method to inspect internal queue state.
   */
  public getState(): FlashcardQueueState {
    return {
      reviewCounter: this.reviewCounter,
      queue: [...this.queue],
      waitingIntervals: [...this.waitingIntervals],
    };
  }

  /**
   * Restores the queue manager state from a serialized state object.
   * @param state The serialized state to restore
   */
  public restoreState(state: FlashcardQueueState): void {
    this.reviewCounter = state.reviewCounter;
    this.queue = [...state.queue];
    this.waitingIntervals = [...state.waitingIntervals];
  }
}
