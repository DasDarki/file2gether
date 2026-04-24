<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app__header">
      <RouterLink to="/" class="app__brand">
        <span class="app__brand-mark">f2</span>
        <span class="app__brand-name">file<em>2</em>gether</span>
      </RouterLink>
      <span class="app__tag">peer-to-peer · live</span>
    </header>

    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.app {
  min-height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 32px;
    border-bottom: 1px solid $border-soft;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: $text;
    font-weight: 600;
    letter-spacing: -0.02em;

    &:hover {
      color: $text;
    }
  }

  &__brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: $accent;
    color: white;
    font-size: 12px;
    font-weight: 700;
  }

  &__brand-name em {
    color: $accent;
    font-style: normal;
  }

  &__tag {
    color: $text-faint;
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__main {
    flex: 1;
    display: flex;
    padding: 32px;
  }
}

@media (max-width: 640px) {
  .app__header {
    padding: 14px 18px;
  }

  .app__main {
    padding: 18px;
  }

  .app__tag {
    display: none;
  }
}
</style>
