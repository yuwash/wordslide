<script lang="ts">
  import LearnTab from './LearnTab.svelte';
  import CreateTab from './CreateTab.svelte';

  const tabs = ['learn', 'create'] as const;
  type Tab = (typeof tabs)[number];
  let activeTab = $state<Tab>('learn');

  function handleTabClick(tab: Tab) {
    activeTab = tab;
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

<div class="container py-5 px-3">
  <div class="has-text-centered mb-5">
    <h1 class="title is-2 has-text-primary">Wordslide</h1>
    <p class="subtitle is-5">Passively learn vocabulary with visual mnemonics</p>
  </div>

  <!-- Bulma tabs -->
  <div class="tabs is-centered is-boxed">
    <ul>
      {#each tabs as tab}
        <li class={activeTab === tab ? 'is-active' : ''}>
          <a
            href="#{tab}"
            onclick={(e) => {
              e.preventDefault();
              handleTabClick(tab);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(tab);
              }
            }}
          >
            <span class="is-capitalized">{tab}</span>
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <section class="section py-4">
    {#if activeTab === 'learn'}
      <LearnTab />
    {:else if activeTab === 'create'}
      <CreateTab />
    {/if}
  </section>
</div>
