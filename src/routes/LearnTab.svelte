<script lang="ts">
  import { onDestroy } from 'svelte';
  import { appState } from '../lib/state.svelte';
  import { splitWordIntoGroups, getRepresentativeGrapheme, mapToTokiPona } from '../lib/tokipona-12-sk';
  import { FlashcardQueueManager } from '../lib/queue';

  let currentWordIndex = $state(0);
  let step = $state(0);
  let isPlaying = $state(false);
  let intervalId: any = null;
  let showGallery = $state(false);

  // Create queue manager
  const queueManager = new FlashcardQueueManager();

  // Derive active word
  const activeWord = $derived(appState.words[currentWordIndex] || null);

  // Derive groups of the active word
  const groups = $derived(activeWord ? splitWordIntoGroups(activeWord.word) : []);
  const G = $derived(groups.length);
  const M = $derived(Math.min(G, 3));
  const totalSteps = $derived(2 * M + (G > 3 ? 1 : 0));

  // Derive displayed text for the current step
  const stepTextState = $derived(() => {
    if (!activeWord || G === 0) {
      return { text: '...', isFullyRevealed: false };
    }

    if (step === 0) {
      return { text: '...', isFullyRevealed: false };
    }

    // Check if it's the "all remaining" step for G > 3
    if (G > 3 && step === totalSteps) {
      return { text: activeWord.word, isFullyRevealed: true };
    }

    // It's one of the first M groups
    const gIdx = Math.floor((step - 1) / 2);
    const phase = (step - 1) % 2; // 0 for emoji, 1 for text

    if (phase === 0) {
      // Emoji phase: show groups before gIdx
      const shownText = groups.slice(0, gIdx).join('');
      return { text: shownText + '...', isFullyRevealed: false };
    } else {
      // Text phase: show groups up to gIdx
      const shownText = groups.slice(0, gIdx + 1).join('');
      const isFullyRevealed = (gIdx === G - 1);
      return {
        text: shownText + (isFullyRevealed ? '' : '...'),
        isFullyRevealed
      };
    }
  });

  const currentText = $derived(stepTextState().text);
  const isFullyRevealed = $derived(stepTextState().isFullyRevealed);

  // Derive visible emojis with ruby pronunciation guides for the current step
  const visibleEmojis = $derived(() => {
    if (!activeWord || G === 0 || step === 0) {
      return [];
    }

    let count = 0;
    if (G > 3 && step === totalSteps) {
      count = 3;
    } else {
      const gIdx = Math.floor((step - 1) / 2);
      count = gIdx + 1;
    }

    const list: { emoji?: string; file?: string; rep: string }[] = [];
    for (let i = 0; i < count; i++) {
      const repGrapheme = getRepresentativeGrapheme(groups[i]);
      const tpLetter = mapToTokiPona(repGrapheme);
      const entry = appState.mnemonicMapping.mappings[tpLetter];
      
      if (entry) {
        if (entry.emoji) {
          list.push({
            emoji: entry.emoji,
            rep: repGrapheme.toLowerCase()
          });
        } else if (entry.file) {
          list.push({
            file: entry.file,
            rep: repGrapheme.toLowerCase()
          });
        }
      }
    }
    return list;
  });

  function advanceStep() {
    if (appState.words.length === 0) return;
    
    // If we've fully revealed the current word, queue it for review
    if (isFullyRevealed) {
      const nextCardId = queueManager.progress(activeWord.id);
      
      if (nextCardId === null) {
        // No card is due, show a new card
        step = 0;
        currentWordIndex = (currentWordIndex + 1) % appState.words.length;
      } else {
        // Show the due card
        step = 0;
        const newIndex = appState.words.findIndex(w => w.id === nextCardId);
        if (newIndex !== -1) {
          currentWordIndex = newIndex;
        } else {
          // Fallback to next card if not found
          currentWordIndex = (currentWordIndex + 1) % appState.words.length;
        }
      }
    } else {
      // Continue revealing the current word
      if (step < totalSteps) {
        step++;
      } else {
        // Shouldn't happen with our logic, but just in case
        step = 0;
        currentWordIndex = (currentWordIndex + 1) % appState.words.length;
      }
    }
  }

  function previousWord() {
    if (appState.words.length === 0) return;
    step = 0;
    currentWordIndex = (currentWordIndex - 1 + appState.words.length) % appState.words.length;
  }

  function nextWord() {
    if (appState.words.length === 0) return;
    step = 0;
    currentWordIndex = (currentWordIndex + 1) % appState.words.length;
  }

  function startSlideshow() {
    if (isPlaying) return;
    if (appState.words.length === 0) return;
    isPlaying = true;
  }

  function pauseSlideshow() {
    isPlaying = false;
  }

  function togglePlay() {
    if (isPlaying) {
      pauseSlideshow();
    } else {
      startSlideshow();
    }
  }

  // Effect to automatically run and update intervals when isPlaying or duration changes
  $effect(() => {
    if (isPlaying) {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        advanceStep();
      }, appState.duration * 1000);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  // Dynamically generate gallery items from loaded mnemonic mapping
  const guideItems = $derived(() => {
    return Object.entries(appState.mnemonicMapping.mappings).map(([letter, item]) => ({
      letter,
      emoji: item.emoji,
      file: item.file,
      desc: item.description
    }));
  });
</script>

<div class="learn-container">
  <!-- Slideshow controls at the top -->
  <div class="is-flex is-justify-content-center is-align-items-center mb-5 gap-3">
    <button
      id="play-pause-button"
      class="button is-large {isPlaying ? 'is-danger' : 'is-success'}"
      onclick={togglePlay}
      disabled={appState.words.length === 0}
    >
      <span class="icon mr-2">
        {isPlaying ? '⏸' : '▶'}
      </span>
      <span>
        {isPlaying ? 'Pause' : 'Start'}
      </span>
    </button>

    <div class="buttons ml-4">
      <button
        class="button is-medium"
        onclick={previousWord}
        disabled={appState.words.length === 0}
        title="Previous word"
      >
        ⏮ Prev Word
      </button>

      <button
        class="button is-medium"
        onclick={advanceStep}
        disabled={appState.words.length === 0}
        title="Advance reveal / Next word"
      >
        ⏭ Next Reveal
      </button>

      <button
        class="button is-medium"
        onclick={nextWord}
        disabled={appState.words.length === 0}
        title="Skip to next word"
      >
        Skip Word ⏭
      </button>
    </div>
  </div>

  {#if appState.words.length === 0}
    <div class="notification is-warning has-text-centered">
      <p class="title is-4">No words loaded</p>
      <p>Go to the <strong>create</strong> tab to upload or paste a CSV of vocabulary words!</p>
    </div>
  {:else if activeWord}
    <!-- Main Card Display -->
    <div class="card my-5 mx-auto" style="max-width: 600px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <div class="card-content has-text-centered">
        <!-- Progress Indicator -->
        <div class="is-flex is-justify-content-between is-align-items-center mb-4 text-muted">
          <span class="tag is-info is-light mr-1">Word {currentWordIndex + 1} of {appState.words.length}</span>
          <span class="tag is-dark is-light">Step {step} / {totalSteps}</span>
        </div>

        <!-- Word's Meaning (Always Visible) -->
        <div class="mb-4">
          <p class="heading is-size-6 text-uppercase tracking-wider">Meaning</p>
          <p class="title is-2 has-text-info my-2">{activeWord.meaning}</p>
        </div>

        <hr style="opacity: 0.5;" />

        <!-- Representative Ruby Emoji Space -->
        <div class="emoji-container is-flex is-justify-content-center is-align-items-center mb-5" style="height: 160px; overflow-y: hidden;">
          {#if visibleEmojis().length > 0}
            <div class="is-flex is-justify-content-center is-align-items-center gap-4">
              {#each visibleEmojis() as item, i (i)}
                {#if item.emoji}
                  <ruby class="mx-2 has-text-centered animate-emoji" style="font-size: 5rem; line-height: 1; display: inline-flex; flex-direction: column-reverse; align-items: center;">
                    <span>{item.emoji}</span>
                    <rt class="has-text-weight-bold has-text-grey-dark" style="font-size: 1.4rem; line-height: 1.2; text-transform: lowercase; display: block; margin-bottom: 2px;">{item.rep}</rt>
                  </ruby>
                {:else if item.file}
                  <ruby class="mx-2 has-text-centered animate-emoji" style="font-size: 5rem; line-height: 1; display: inline-flex; flex-direction: column-reverse; align-items: center;">
                    <img src={item.file} alt={item.rep} style="width: 100%; height: auto; max-width: 100px; border-radius: 8px;" />
                    <rt class="has-text-weight-bold has-text-grey-dark" style="font-size: 1.4rem; line-height: 1.2; text-transform: lowercase; display: block; margin-bottom: 2px;">{item.rep}</rt>
                  </ruby>
                {/if}
              {/each}
            </div>
          {:else}
            <!-- Transparent placeholder to prevent visual jumping -->
            <div style="font-size: 5rem; opacity: 0; line-height: 1;">❓</div>
          {/if}
        </div>

        <!-- Word Space -->
        <div class="word-container py-3">
          <p class="heading is-size-6 text-uppercase tracking-wider mb-2">Answer</p>
          <p class="title is-1 has-text-primary mb-2" style="font-family: monospace, sans-serif; letter-spacing: 2px;">
            {currentText}
          </p>
          <p class="is-size-7 has-text-grey-light">
            {#if isFullyRevealed}
              <span class="tag is-success is-light">Fully Revealed</span>
            {:else}
              <span class="tag is-warning is-light">Revealing...</span>
            {/if}
          </p>
        </div>
      </div>

      <!-- Card footer/progress bar -->
      <footer class="card-footer" style="background-color: #fafafa;">
        <div class="w-100 p-3 is-flex is-justify-content-space-between is-align-items-center" style="width: 100%;">
          <div class="is-size-7 has-text-grey">
            Auto-flip speed: <strong class="has-text-dark">{appState.duration}s</strong>
          </div>
          <div>
            {#if isPlaying}
              <span class="tag is-danger animate-pulse">● Autoplay Active</span>
            {:else}
              <span class="tag is-light">Paused</span>
            {/if}
          </div>
        </div>
      </footer>
    </div>
  {/if}

  <!-- Collapsible Mnemonic Image Gallery -->
  <div class="guide-box mx-auto mt-6" style="max-width: 600px;">
    <button class="button is-light is-fullwidth" onclick={() => showGallery = !showGallery}>
      {showGallery ? 'Hide Mnemonic Image Gallery' : 'Show Mnemonic Image Gallery'}
    </button>

    {#if showGallery}
      <div class="box mt-3">
        <h4 class="title is-5 mb-3">Mnemonic Image Gallery ({appState.mnemonicMapping.alphabet})</h4>
        <p class="subtitle is-6 mb-4">
          Each word group is represented by one of 12 images acting as visual mnemonics:
        </p>
        <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;">
          {#each guideItems() as item}
            <div class="is-flex is-align-items-center gap-3 p-2 border-rounded" style="background: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 6px;">
              {#if item.emoji}
                <span class="is-size-2">{item.emoji}</span>
              {:else if item.file}
                <img src={item.file} alt={item.letter} style="width: 100%; height: auto; max-width: 60px; border-radius: 8px;" />
              {/if}
              <div>
                <strong>{item.letter}</strong>
                <p class="is-size-7 has-text-grey">{item.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .gap-3 {
    gap: 0.75rem;
  }
  .gap-4 {
    gap: 1.5rem;
  }
  .animate-pulse {
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  .animate-emoji {
    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  @keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
</style>
