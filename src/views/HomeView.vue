<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const joinId = ref('')

function createRoom() {
  router.push({ name: 'host' })
}

function joinRoom() {
  const id = joinId.value.trim()
  if (!id) return
  router.push({ name: 'room', params: { hostId: id } })
}
</script>

<template>
  <div class="home">
    <section class="home__hero">
      <h1 class="home__title">Schau zusammen, ohne hochzuladen.</h1>
      <p class="home__sub">
        Lokale Videos und Musik live an deine Freunde streamen — direkt von Browser zu
        Browser. Kein Upload, kein Account.
      </p>
    </section>

    <div class="home__cards">
      <article class="card home__card">
        <header class="home__card-head">
          <span class="home__chip home__chip--accent">Host</span>
          <h2>Raum erstellen</h2>
        </header>
        <p class="home__card-text">
          Du wählst die Datei, du steuerst Wiedergabe. Teile den Link, deine Freunde joinen.
        </p>
        <button class="btn btn--primary home__cta" @click="createRoom">
          Neuen Raum starten
        </button>
      </article>

      <article class="card home__card">
        <header class="home__card-head">
          <span class="home__chip">Viewer</span>
          <h2>Raum beitreten</h2>
        </header>
        <p class="home__card-text">
          Füge die Raum-ID oder den Link deines Hosts ein.
        </p>
        <form class="home__join" @submit.prevent="joinRoom">
          <input
            v-model="joinId"
            class="input"
            placeholder="raum-id einfügen…"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="btn" type="submit" :disabled="!joinId.trim()">Beitreten</button>
        </form>
      </article>
    </div>

    <footer class="home__foot">
      Peer-to-peer via WebRTC · Dateien verlassen niemals deinen Rechner direkt — sie werden
      live als Stream übertragen.
    </footer>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.home {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-self: center;

  &__hero {
    text-align: center;
    padding-top: 32px;
  }

  &__title {
    font-size: clamp(28px, 5vw, 44px);
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin: 0 0 14px;
    font-weight: 600;
  }

  &__sub {
    color: $text-muted;
    margin: 0 auto;
    max-width: 540px;
    font-size: 16px;
  }

  &__cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__card-head {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
  }

  &__chip {
    align-self: flex-start;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $text-muted;
    border: 1px solid $border;
    padding: 4px 10px;
    border-radius: 999px;

    &--accent {
      color: $accent;
      border-color: $accent-soft;
      background: $accent-soft;
    }
  }

  &__card-text {
    color: $text-muted;
    margin: 0;
    flex: 1;
  }

  &__cta {
    align-self: flex-start;
  }

  &__join {
    display: flex;
    gap: 10px;

    .input {
      flex: 1;
    }
  }

  &__foot {
    text-align: center;
    color: $text-faint;
    font-size: 13px;
    padding-bottom: 24px;
  }
}

@media (max-width: 720px) {
  .home__cards {
    grid-template-columns: 1fr;
  }
}
</style>
