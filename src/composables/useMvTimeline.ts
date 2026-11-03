// src/composables/useMvTimeline.ts
// 像素MV 分鏡時間軸數據結構與操作
// 參考 kid-pixel-mv/comp/bio_shots.js，但簡化為前端可編輯的 JSON

export interface MVCharacter {
  id: string
  kind: 'lay' | 'lamb' | 'huan' | 'akita' | 'foxLei' | 'foxBo' | 'bull' | 'pig' | 'squirrel' | 'luguofu' | 'alien' | 'heJiong' | 'peng' | 'ziFeng' | 'staff' | 'exoL' | 'fanS' | `exo${number}`
  pose: 'stand' | 'walk' | 'run' | 'sit' | 'dance' | 'cheer' | 'wave' | 'hold' | 'drink' | 'reach' | 'point' | 'crouch' | 'sleepdesk' | 'sitdesk' | 'trophy' | 'speech' | 'ride' | 'mask'
  x: number
  y: number
  k: number          // 縮放
  left: boolean
  expr: 'neutral' | 'smile' | 'grin' | 'tired' | 'sad' | 'surprised' | 'closed' | 'sleep'
  persona?: 'sheep' | 'fox' | 'unicorn' | 'monkey' | 'producer' | 'director' | 'star' | 'xiaoxing'
  prop?: 'staff' | 'phone' | 'mug' | 'trophy' | 'mic' | 'scroll' | 'lantern' | 'controller'
  prop2?: 'flower' | 'fish' | 'stickS' | 'stickL' | 'clap' | 'book'
  heart?: number
  fade?: number
  wind?: number
  cloak?: boolean
  apron?: boolean
  glasses?: boolean
  headset?: boolean
  cape?: boolean
  tail?: boolean | 'squirrel'
  tailC?: number
  mask?: { crack: number }
  badge?: number
  plain?: boolean
  body?: [number, number, number]
  cloth?: [number, number, number]
  pants?: [number, number, number]
  handC?: number
  shoe?: number
}

export interface MVShot {
  id: string
  t: number          // 開始時間（秒）
  dur: number        // 持續時間（秒）
  sc: string         // 場景畫家名：room | city | park | practice | rooftop | stageDark | mama | gameRoom | jixian | redcarpet | mushroom | bedNight | island | kitchen | corner | filmset | mirror | bridge | phoneClose | crewAll | birdsNest | sky | spokesman | la
  cap?: string       // 標籤欄位
  caption: string    // 字幕內容
  captionY?: number  // 字幕偏移
  chars: MVCharacter[]
  note?: string      // 備註
}

export interface MVProject {
  title: string
  artist: string
  album: string
  fmt: '169' | '23'  // 輸出尺寸
  fps: number
  dur: number
  shots: MVShot[]
  watermark: string
  createdAt: number
  updatedAt: number
}

export const DEFAULT_PROJECT: MVProject = {
  title: '小孩 Kid',
  artist: '张艺兴',
  album: '闹天宫',
  fmt: '169',
  fps: 30,
  dur: 152.916,
  shots: [],
  watermark: '晏銘湛箴',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

export function newShot(id: string, t: number, caption: string): MVShot {
  return {
    id, t, dur: 4, sc: 'room', cap: '', caption,
    chars: [], note: '',
  }
}

export function newCharacter(kind: MVCharacter['kind'], x: number, y: number): MVCharacter {
  return {
    id: `${kind}-${Date.now()}`,
    kind, pose: 'stand', x, y, k: 1, left: false, expr: 'neutral',
  }
}

export function shotDuration(shots: MVShot[], index: number): number {
  const next = shots[index + 1]
  if (next) return next.t - shots[index].t
  return shots[index].dur
}

export function findShotAt(shots: MVShot[], t: number): MVShot | undefined {
  for (let i = shots.length - 1; i >= 0; i--) {
    if (t >= shots[i].t) return shots[i]
  }
  return undefined
}
