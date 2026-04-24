<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useViewer } from '@/composables/useViewer'

const props = defineProps<{ hostId: string }>()

const viewer = useViewer()
const videoEl = useTemplateRef<HTMLVideoElement>('videoEl')

const volume = ref(1)
const muted = ref(false)
const needsAudioGesture = ref(false)

onMounted(() => {
  viewer.connect(props.hostId)
})

watch(
  () => viewer.stream.value,
  async (stream) => {
    await nextTick()
    const el = videoEl.value
    if (!el || !stream) return
    el.srcObject = stream
    el.volume = volume.value
    el.muted = muted.value
    try {
      await el.play()
      needsAudioGesture.value = false
    } catch {
      el.muted = true
      muted.value = true
      try {
        await el.play()
        needsAudioGesture.value = true
      } catch {
        // give up silently — user can click play overlay
        needsAudioGesture.value = true
      }
    }
  },
)

watch(volume, (v) => {
  const el = videoEl.value
  if (!el) return
  el.volume = v
  if (v > 0 && muted.value) {
    muted.value = false
    el.muted = false
  }
})

watch(muted, (m) => {
  const el = videoEl.value
  if (!el) return
  el.muted = m
})

async function enableAudio() {
  const el = videoEl.value
  if (!el) return
  el.muted = false
  muted.value = false
  if (volume.value === 0) volume.value = 1
  try {
    await el.play()
    needsAudioGesture.value = false
  } catch {
    needsAudioGesture.value = true
  }
}

function toggleMute() {
  muted.value = !muted.value
}

const statusLabel = computed(() => {
  switch (viewer.status.value) {
    case 'idle':
      return 'Initialisiere…'
    case 'connecting':
      return 'Verbinde mit Host…'
    case 'connected':
      return 'Verbunden'
    case 'waiting-media':
      return 'Warte bis der Host eine Datei lädt…'
    case 'streaming':
      return 'Live'
    case 'disconnected':
      return 'Verbindung verloren'
    case 'error':
      return 'Fehler'
  }
  return ''
})

const isLive = computed(() => viewer.status.value === 'streaming')

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const progressPct = computed(() => {
  const { currentTime, duration } = viewer.playback.value
  if (!duration) return 0
  return Math.min(100, (currentTime / duration) * 100)
})
</script>

<template>
  <div class="vroom">
    <aside class="vroom__side">
      <div class="card vroom__status-card">
        <span class="vroom__chip">Du bist Viewer</span>
        <h3>Status</h3>
        <div class="vroom__status">
          <span
            class="vroom__dot"
            :class="{
              'vroom__dot--live': isLive,
              'vroom__dot--warn': viewer.status.value === 'error' || viewer.status.value === 'disconnected',
            }"
          />
          <span>{{ statusLabel }}</span>
        </div>
        <p v-if="viewer.meta.value" class="vroom__meta-name" :title="viewer.meta.value.name">
          {{ viewer.meta.value.name }}
        </p>
      </div>

      <div class="card vroom__volume-card">
        <h3>Lautstärke</h3>
        <div class="vroom__volume">
          <button class="btn btn--ghost vroom__mute" @click="toggleMute" :title="muted ? 'Stumm aus' : 'Stumm'">
            {{ muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊' }}
          </button>
          <input
            v-model.number="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="vroom__slider"
          />
          <span class="vroom__vol-num">{{ Math.round(volume * 100) }}</span>
        </div>
        <p class="vroom__hint">Nur deine eigene Lautstärke — der Host hört das nicht.</p>
      </div>

      <p v-if="viewer.error.value" class="vroom__error">{{ viewer.error.value }}</p>
    </aside>

    <section class="vroom__stage">
      <div v-if="!isLive" class="vroom__placeholder">
        <div class="vroom__placeholder-inner">
          <div class="vroom__pulse" />
          <h2>{{ statusLabel }}</h2>
          <p v-if="viewer.status.value === 'waiting-media'">
            Sobald der Host etwas startet, läuft's hier los.
          </p>
        </div>
      </div>

      <div v-show="isLive" class="vroom__player">
        <video
          ref="videoEl"
          class="vroom__video"
          playsinline
          autoplay
        />

        <button
          v-if="needsAudioGesture"
          class="vroom__unmute-overlay"
          @click="enableAudio"
        >
          <span class="vroom__unmute-icon">🔊</span>
          <span>Klick für Ton</span>
        </button>

        <div class="vroom__bar">
          <div class="vroom__bar-times">
            <span>{{ fmt(viewer.playback.value.currentTime) }}</span>
            <span>{{ fmt(viewer.playback.value.duration) }}</span>
          </div>
          <div class="vroom__progress">
            <div class="vroom__progress-fill" :style="{ width: progressPct + '%' }" />
          </div>
          <div class="vroom__bar-state">
            <span class="vroom__state-dot" :class="{ 'vroom__state-dot--live': !viewer.playback.value.paused }" />
            {{ viewer.playback.value.paused ? 'Pausiert vom Host' : 'Spielt' }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.vroom {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-self: flex-start;

  &__side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__status-card,
  &__volume-card {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: $text-muted;
      text-transform: uppercase;
      letter-spacing: 0.06em;
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
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $text-faint;

    &--live {
      background: $success;
      box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.18);
    }

    &--warn {
      background: $danger;
      box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.18);
    }
  }

  &__meta-name {
    margin: 0;
    font-size: 13px;
    color: $text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__volume {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__mute {
    padding: 6px 8px;
    font-size: 18px;
  }

  &__slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 999px;
    background: $border;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: $accent;
      cursor: pointer;
      transition: transform 0.1s $ease;
    }

    &::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    &::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: $accent;
      border: none;
      cursor: pointer;
    }
  }

  &__vol-num {
    width: 28px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: $text-muted;
    font-size: 12px;
  }

  &__hint {
    margin: 0;
    color: $text-faint;
    font-size: 12px;
  }

  &__error {
    margin: 0;
    padding: 12px 14px;
    border-radius: $radius;
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.3);
    color: $danger;
    font-size: 13px;
  }

  &__stage {
    min-height: 480px;
    display: flex;
  }

  &__placeholder {
    flex: 1;
    border: 1.5px dashed $border;
    border-radius: $radius-lg;
    background: $bg-elevated;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__placeholder-inner {
    text-align: center;
    color: $text-muted;

    h2 {
      margin: 18px 0 6px;
      color: $text;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    p {
      margin: 0;
      font-size: 13px;
    }
  }

  &__pulse {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: $accent;
    margin: 0 auto;
    box-shadow: 0 0 0 0 $accent-soft;
    animation: pulse 1.6s $ease infinite;
  }

  &__player {
    flex: 1;
    position: relative;
    background: black;
    border-radius: $radius-lg;
    overflow: hidden;
    border: 1px solid $border-soft;
    display: flex;
    flex-direction: column;
  }

  &__video {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: black;
    display: block;
  }

  &__unmute-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    font-size: 14px;
  }

  &__unmute-icon {
    font-size: 36px;
  }

  &__bar {
    padding: 14px 18px;
    background: $bg-elevated;
    border-top: 1px solid $border-soft;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__bar-times {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }

  &__progress {
    height: 4px;
    background: $border;
    border-radius: 999px;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: $accent;
    transition: width 0.4s linear;
  }

  &__bar-state {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: $text-muted;
  }

  &__state-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $text-faint;

    &--live {
      background: $success;
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.45);
  }
  70% {
    box-shadow: 0 0 0 18px rgba(139, 92, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
  }
}

@media (max-width: 920px) {
  .vroom {
    grid-template-columns: 1fr;
  }
}
</style>
