<script>
  import { createEventDispatcher } from 'svelte';
  import LearnTab from './LearnTab.svelte';
  import CreateTab from './CreateTab.svelte';

  const dispatch = createEventDispatcher();

  const tabs = ['learn', 'create'];
  let activeTab = $state(tabs[0]);

  function handleTabClick(tab) {
    activeTab = tab;
    dispatch('tab:change', { tab });
  }
</script>

<svelte:head>
  <!-- Bulma CSS via CDN -->
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css"
    crossorigin="anonymous"
  />
</svelte:head>

<div class="container">
  <h1 class="title is-3">Wordslide</h1>

  <!-- Bulma tabs -->
  <div class="tabs is-centered">
    <ul>
      {#each tabs as tab}
        <li class={activeTab === tab ? 'is-active' : ''}>
          <a on:click={() => handleTabClick(tab)}>{tab}</a>
        </li>
      {/each}
    </ul>
  </div>

  <section class="section">
    {#if activeTab === 'learn'}
      <LearnTab />
    {:else if activeTab === 'create'}
      <CreateTab />
    {/if}
  </section>
</div>
