<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { useHost } from '@/composables/useHost'
import type { MediaKind } from '@/composables/types'

const host = useHost()
host.start()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const videoEl = useTemplateRef<HTMLVideoElement>('videoEl')

const file = ref<File | null>(null)
const blobUrl = ref<string>('')
const mediaKind = ref<MediaKind>('video')
const captured = ref(false)
const copied = ref(false)

const shareLink = computed(() =>
  host.hostId.value ? `${location.origin}/room/${host.hostId.value}` : '',
)

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (!f) return
  loadFile(f)
  target.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const f = e.dataTransfer?.files?.[0]
  if (f) loadFile(f)
}

function loadFile(f: File) {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
  file.value = f
  blobUrl.value = URL.createObjectURL(f)
  mediaKind.value = f.type.startsWith('audio') ? 'audio' : 'video'
  captured.value = false
  host.setStream(null)
  host.setMeta({ name: f.name, mediaKind: mediaKind.value })
}

function captureFromVideo(el: HTMLVideoElement): MediaStream {
  const anyEl = el as HTMLVideoElement & {
    captureStream?: () => MediaStream
    mozCaptureStream?: () => MediaStream
  }
  if (typeof anyEl.captureStream === 'function') return anyEl.captureStream()
  if (typeof anyEl.mozCaptureStream === 'function') return anyEl.mozCaptureStream()
  throw new Error('captureStream wird vom Browser nicht unterstützt')
}

function onPlaying() {
  const el = videoEl.value
  if (!el) return
  if (!captured.value) {
    try {
      const stream = captureFromVideo(el)
      host.setStream(stream)
      captured.value = true
    } catch (err) {
      console.error(err)
    }
  }
  emitState()
  host.broadcast({ type: 'play', currentTime: el.currentTime })
}

function onPause() {
  const el = videoEl.value
  if (!el) return
  emitState()
  host.broadcast({ type: 'pause', currentTime: el.currentTime })
}

function onSeeked() {
  const el = videoEl.value
  if (!el) return
  emitState()
  host.broadcast({ type: 'seek', currentTime: el.currentTime })
}

function emitState() {
  const el = videoEl.value
  if (!el) return
  host.updateState({
    currentTime: el.currentTime,
    duration: isFinite(el.duration) ? el.duration : 0,
    paused: el.paused,
  })
}

async function copyLink() {
  if (!shareLink.value) return
  try {
    await navigator.clipboard.writeText(shareLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch {
    // noop
  }
}

function clearFile() {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
  file.value = null
  blobUrl.value = ''
  captured.value = false
  host.setStream(null)
  host.clearMeta()
}

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div class="room">
    <aside class="room__side">
      <div class="card room__id-card">
        <span class="room__chip room__chip--accent">Du bist Host</span>
        <h3>Raum-Link</h3>
        <p v-if="host.ready.value" class="room__id">{{ shareLink }}</p>
        <p v-else class="room__id room__id--pending">Hole Raum-ID vom Server…</p>
        <button class="btn btn--primary" @click="copyLink" :disabled="!host.ready.value">
          {{ copied ? 'Kopiert!' : 'Link kopieren' }}
        </button>
        <div class="room__meta">
          <span class="room__dot" :class="{ 'room__dot--live': host.ready.value }" />
          <span v-if="!host.ready.value">Verbinde mit Signaling…</span>
          <span v-else>{{ host.peerCount.value }} Zuschauer</span>
        </div>
      </div>

      <div class="card room__file-card">
        <h3>Datei</h3>
        <p v-if="file" class="room__filename" :title="file.name">{{ file.name }}</p>
        <p v-else class="room__hint">
          Keine Datei geladen. mp3, mp4, webm, ogg…
        </p>
        <div class="room__file-actions">
          <button class="btn" @click="pickFile">
            {{ file ? 'Andere Datei' : 'Datei wählen' }}
          </button>
          <button v-if="file" class="btn btn--ghost" @click="clearFile">Entfernen</button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="video/*,audio/*"
          hidden
          @change="onFileChange"
        />
      </div>

      <p v-if="host.error.value" class="room__error">
        {{ host.error.value }}
      </p>
    </aside>

    <section class="room__stage">
      <div
        v-if="!file"
        class="room__drop"
        @dragover.prevent
        @drop="onDrop"
        @click="pickFile"
      >
        <div class="room__drop-inner">
          <div class="room__drop-icon">⏵</div>
          <h2>Datei hierher ziehen</h2>
          <p>oder klicken, um auszuwählen.</p>
        </div>
      </div>

      <div v-else class="room__player" :data-kind="mediaKind">
        <video
          ref="videoEl"
          class="room__video"
          :src="blobUrl"
          controls
          playsinline
          @playing="onPlaying"
          @pause="onPause"
          @seeked="onSeeked"
        />
        <div v-if="mediaKind === 'audio'" class="room__audio-overlay">
          <div class="room__audio-icon">♪</div>
          <span>Audio</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.room {
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

  &__id-card,
  &__file-card {
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

    &--accent {
      color: $accent;
      border-color: $accent-soft;
      background: $accent-soft;
    }
  }

  &__id {
    margin: 0;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 12px;
    color: $text-muted;
    word-break: break-all;
    padding: 10px 12px;
    background: $bg;
    border: 1px solid $border-soft;
    border-radius: $radius-sm;

    &--pending {
      color: $text-faint;
      font-style: italic;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $text-muted;
    font-size: 13px;
    margin-top: 4px;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $text-faint;
    transition: background 0.2s $ease;

    &--live {
      background: $success;
      box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.18);
    }
  }

  &__filename {
    margin: 0;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__hint {
    margin: 0;
    color: $text-faint;
    font-size: 13px;
  }

  &__file-actions {
    display: flex;
    gap: 8px;
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

  &__drop {
    flex: 1;
    border: 1.5px dashed $border;
    border-radius: $radius-lg;
    background: $bg-elevated;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.15s $ease, background 0.15s $ease;

    &:hover {
      border-color: $accent;
      background: $bg-hover;
    }
  }

  &__drop-inner {
    text-align: center;
    color: $text-muted;

    h2 {
      margin: 12px 0 6px;
      color: $text;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    p {
      margin: 0;
      font-size: 13px;
    }
  }

  &__drop-icon {
    font-size: 40px;
    color: $accent;
    opacity: 0.7;
  }

  &__player {
    flex: 1;
    position: relative;
    background: black;
    border-radius: $radius-lg;
    overflow: hidden;
    border: 1px solid $border-soft;
  }

  &__video {
    width: 100%;
    height: 100%;
    display: block;
    aspect-ratio: 16 / 9;
    background: black;
  }

  &__audio-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: $text-muted;
    pointer-events: none;
    background: linear-gradient(135deg, #1a1a24, #0f0f16);
  }

  &__audio-icon {
    font-size: 64px;
    color: $accent;
  }
}

@media (max-width: 920px) {
  .room {
    grid-template-columns: 1fr;
  }
}
</style>
