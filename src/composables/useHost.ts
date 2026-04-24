import { onBeforeUnmount, ref, shallowRef } from 'vue'
import Peer, { type DataConnection, type MediaConnection } from 'peerjs'
import type { ControlEvent, RoomMeta, PlaybackState } from './types'

interface PeerEntry {
  data: DataConnection
  call?: MediaConnection
}

export function useHost() {
  const hostId = ref<string>('')
  const ready = ref(false)
  const error = ref<string | null>(null)
  const peerCount = ref(0)

  const peer = shallowRef<Peer | null>(null)
  const stream = shallowRef<MediaStream | null>(null)
  const meta = ref<RoomMeta | null>(null)
  const lastState = ref<PlaybackState>({
    currentTime: 0,
    duration: 0,
    paused: true,
  })

  const peers = new Map<string, PeerEntry>()

  function start() {
    const id = crypto.randomUUID()
    const p = new Peer(id)

    p.on('open', (assignedId) => {
      hostId.value = assignedId
      ready.value = true
    })

    p.on('error', (err) => {
      error.value = err.message ?? String(err)
    })

    p.on('connection', (conn) => {
      conn.on('open', () => {
        peers.set(conn.peer, { data: conn })
        peerCount.value = peers.size

        // hand new viewer the current state
        if (meta.value) {
          conn.send({ type: 'meta', ...meta.value } satisfies ControlEvent)
        }
        conn.send({
          type: 'state',
          ...lastState.value,
        } satisfies ControlEvent)

        // and stream them the live media if we already have one
        if (stream.value) {
          callPeer(conn.peer, stream.value)
        }
      })

      conn.on('close', () => {
        const entry = peers.get(conn.peer)
        entry?.call?.close()
        peers.delete(conn.peer)
        peerCount.value = peers.size
      })

      conn.on('error', () => {
        peers.delete(conn.peer)
        peerCount.value = peers.size
      })
    })

    peer.value = p
  }

  function callPeer(peerId: string, ms: MediaStream) {
    const p = peer.value
    const entry = peers.get(peerId)
    if (!p || !entry) return

    entry.call?.close()
    const call = p.call(peerId, ms)
    entry.call = call
  }

  function setStream(ms: MediaStream | null) {
    stream.value = ms
    if (!ms) {
      for (const entry of peers.values()) {
        entry.call?.close()
        entry.call = undefined
      }
      return
    }
    for (const peerId of peers.keys()) {
      callPeer(peerId, ms)
    }
  }

  function setMeta(next: RoomMeta) {
    meta.value = next
    broadcast({ type: 'meta', ...next })
  }

  function clearMeta() {
    meta.value = null
    broadcast({ type: 'clear' })
  }

  function updateState(next: PlaybackState) {
    lastState.value = next
  }

  function broadcast(event: ControlEvent) {
    for (const entry of peers.values()) {
      try {
        entry.data.send(event)
      } catch {
        // peer dropped — cleanup happens on close/error
      }
    }
  }

  function destroy() {
    for (const entry of peers.values()) {
      entry.call?.close()
      entry.data.close()
    }
    peers.clear()
    peerCount.value = 0
    peer.value?.destroy()
    peer.value = null
    ready.value = false
  }

  onBeforeUnmount(destroy)

  return {
    hostId,
    ready,
    error,
    peerCount,
    meta,
    start,
    setStream,
    setMeta,
    clearMeta,
    updateState,
    broadcast,
    destroy,
  }
}
