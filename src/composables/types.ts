export type MediaKind = 'video' | 'audio'

export type ControlEvent =
  | { type: 'meta'; name: string; mediaKind: MediaKind }
  | { type: 'play'; currentTime: number }
  | { type: 'pause'; currentTime: number }
  | { type: 'seek'; currentTime: number }
  | { type: 'state'; currentTime: number; duration: number; paused: boolean }
  | { type: 'clear' }

export interface RoomMeta {
  name: string
  mediaKind: MediaKind
}

export interface PlaybackState {
  currentTime: number
  duration: number
  paused: boolean
}
