import { onBeforeUnmount, ref, shallowRef } from 'vue'
import Peer, { type DataConnection } from 'peerjs'
import type { ControlEvent, RoomMeta, PlaybackState } from './types'

export type ViewerStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'waiting-media'
  | 'streaming'
  | 'disconnected'
  | 'error'

export function useViewer() {
  const status = ref<ViewerStatus>('idle')
  const error = ref<string | null>(null)
  const meta = ref<RoomMeta | null>(null)
  const playback = ref<PlaybackState>({
    currentTime: 0,
    duration: 0,
    paused: true,
  })
  const stream = shallowRef<MediaStream | null>(null)

  const peer = shallowRef<Peer | null>(null)
  const conn = shallowRef<DataConnection | null>(null)

  function connect(hostId: string) {
    status.value = 'connecting'
    error.value = null

    const p = new Peer()
    peer.value = p

    p.on('open', () => {
      const c = p.connect(hostId, { reliable: true })
      conn.value = c

      c.on('open', () => {
        status.value = stream.value ? 'streaming' : 'waiting-media'
      })

      c.on('data', (raw) => {
        const event = raw as ControlEvent
        handleEvent(event)
      })

      c.on('close', () => {
        status.value = 'disconnected'
      })

      c.on('error', (err) => {
        error.value = err.message ?? String(err)
        status.value = 'error'
      })
    })

    p.on('call', (call) => {
      call.answer()
      call.on('stream', (remote) => {
        stream.value = remote
        status.value = 'streaming'
      })
      call.on('close', () => {
        stream.value = null
        if (status.value === 'streaming') status.value = 'waiting-media'
      })
    })

    p.on('error', (err) => {
      error.value = err.message ?? String(err)
      status.value = 'error'
    })
  }

  function handleEvent(event: ControlEvent) {
    switch (event.type) {
      case 'meta':
        meta.value = { name: event.name, mediaKind: event.mediaKind }
        break
      case 'clear':
        meta.value = null
        playback.value = { currentTime: 0, duration: 0, paused: true }
        stream.value = null
        status.value = 'waiting-media'
        break
      case 'state':
        playback.value = {
          currentTime: event.currentTime,
          duration: event.duration,
          paused: event.paused,
        }
        break
      case 'play':
        playback.value = { ...playback.value, paused: false, currentTime: event.currentTime }
        break
      case 'pause':
        playback.value = { ...playback.value, paused: true, currentTime: event.currentTime }
        break
      case 'seek':
        playback.value = { ...playback.value, currentTime: event.currentTime }
        break
    }
  }

  function destroy() {
    conn.value?.close()
    peer.value?.destroy()
    peer.value = null
    conn.value = null
    stream.value = null
  }

  onBeforeUnmount(destroy)

  return {
    status,
    error,
    meta,
    playback,
    stream,
    connect,
    destroy,
  }
}
