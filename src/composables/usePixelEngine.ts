// src/composables/usePixelEngine.ts
// 像素畫布引擎 —— 模仿 kid-pixel-mv/comp/pix.js 的 Buf / sprite / text / draw
// 純前端 Canvas 2D 實現，適合 Vue 組件直接消費

export const PX_HEX = {
  ink: '#1a1218', ink2: '#2b2127',
  n0: '#0e1a21', n1: '#152c35', n2: '#21434b', n3: '#336466', n4: '#568f8a',
  p0: '#fff7e6', p1: '#f4e5c2', p2: '#e2c892', p3: '#c3a068', p4: '#8d6c43',
  r0: '#ff9d6c', r1: '#ec4b30', r2: '#c22d28', r3: '#871d25', r4: '#4f1320',
  g0: '#fff4b4', g1: '#f9cd4b', g2: '#e39b2b', g3: '#a9671d', g4: '#6b3b15',
  j0: '#b6ebd2', j1: '#63c5a1', j2: '#2f937d', j3: '#1d635b', j4: '#123f3d',
  b0: '#dbf3f0', b1: '#9fd7e2', b2: '#5aa7c8', b3: '#31719c',
  s0: '#ffe7cd', s1: '#f6c7a1', s2: '#df9b77', s3: '#b16b53',
  h0: '#6b5a5d', h1: '#3b2f33', h2: '#251d21',
  q0: '#efece6', q1: '#c3c0bc', q2: '#8f8c8c', q3: '#5f5d61', q4: '#3b393f', q5: '#26252a',
  w: '#fffcf5', cf: '#6f4531', cf2: '#46291f',
  v0: '#efe2ff', v1: '#c9a4f4', v2: '#9f6cdb', v3: '#7046ad', v4: '#462a72',
  k0: '#fff1f0', k1: '#f9cdd6', k2: '#e79db3',
} as const

export function pack(hex: string, a = 255): number {
  const n = parseInt(hex.slice(1), 16)
  return (((a & 255) << 24) | ((n & 255) << 16) | ((n >>> 8) & 255) | (n >> 16)) >>> 0
}

export const C: Record<string, number> = {}
for (const k of Object.keys(PX_HEX) as Array<keyof typeof PX_HEX>) {
  C[k] = pack(PX_HEX[k])
}
C.none = 0

export class Buf {
  w: number
  h: number
  d: Uint32Array
  constructor(w: number, h: number) {
    this.w = w | 0
    this.h = h | 0
    this.d = new Uint32Array(this.w * this.h)
  }
  clear(c = 0) { this.d.fill(c); return this }
  inb(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  px(x: number, y: number, c: number) {
    if (!c) return
    x = Math.round(x); y = Math.round(y)
    if (!this.inb(x, y)) return
    this.d[y * this.w + x] = c
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h)
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h)
    for (let j = y0; j < y1; j++) this.d.fill(c, j * this.w + x0, j * this.w + x1)
    return this
  }
  hline(x0: number, x1: number, y: number, c: number) {
    if (x1 < x0) [x0, x1] = [x1, x0]
    this.rect(x0, y, x1 - x0 + 1, 1, c)
  }
  vline(x: number, y0: number, y1: number, c: number) {
    if (y1 < y0) [y0, y1] = [y1, y0]
    this.rect(x, y0, 1, y1 - y0 + 1, c)
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
    let e = dx + dy
    for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx } if (e2 <= dx) { e += dx; y0 += sy } }
  }
  disc(cx: number, cy: number, r: number, c: number, fn?: (x: number, y: number, u: number, v: number) => number) {
    const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1), y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r
      if (u * u + v * v <= 1) this.px(x, y, fn ? fn(x, y, u, v) : c)
    }
  }
  outline(c = C.ink, diag = false) {
    const w = this.w, h = this.h, d = this.d, op = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) op[i] = d[i] ? 1 : 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (op[i]) continue
      let hit = (x > 0 && op[i - 1]) || (x < w - 1 && op[i + 1]) || (y > 0 && op[i - w]) || (y < h - 1 && op[i + w])
      if (!hit && diag) hit = (x > 0 && y > 0 && op[i - w - 1]) || (x < w - 1 && y > 0 && op[i - w + 1]) || (x > 0 && y < h - 1 && op[i + w - 1]) || (x < w - 1 && y < h - 1 && op[i + w + 1])
      if (hit) d[i] = c
    }
    return this
  }
  blit(src: Buf, dx: number, dy: number, opts: { flipX?: boolean, flipY?: boolean, sx?: number, sy?: number, sw?: number, sh?: number } = {}) {
    dx = Math.round(dx); dy = Math.round(dy)
    const { flipX = false, flipY = false, sx = 0, sy = 0, sw = src.w, sh = src.h } = opts
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const si = flipX ? sx + sw - 1 - i : sx + i, sj = flipY ? sy + sh - 1 - j : sy + j
      let c = src.d[sj * src.w + si]; if (!c) continue
      const X = dx + i, Y = dy + j
      if (this.inb(X, Y)) this.d[Y * this.w + X] = c
    }
    return this
  }
  toImageData() {
    const im = new ImageData(this.w, this.h)
    im.data.set(new Uint8ClampedArray(this.d.buffer as ArrayBufferLike))
    return im
  }
}

export function sprite(rows: string[], legend: Record<string, number>): Buf {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), b = new Buf(w, h)
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; const k = legend[ch]; if (k === undefined) throw new Error(`sprite: no legend for '${ch}'`); b.d[y * w + x] = k } })
  b.clear(0)
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; const k = legend[ch]; if (k === undefined) throw new Error(`sprite: no legend for '${ch}'`); b.d[y * w + x] = k } })
  return b
}

// 簡易點陣文字（內建 5x5 點陣，後續可接 Zpix）
const FONT5: Record<string, string[]> = {
  ' ': ['.....','.....','.....','.....','.....'],
  'A': ['..#..','.#.#.','#####','#...#','#...#'],
  'B': ['####.','#...#','####.','#...#','####.'],
  'C': ['.###.','#...#','#....','#...#','.###.'],
  'D': ['####.','#...#','#...#','#...#','####.'],
  'E': ['#####','#....','####.','#....','#####'],
  'F': ['#####','#....','####.','#....','#....'],
  'G': ['.###.','#....','#.##.','#...#','.###.'],
  'H': ['#...#','#...#','#####','#...#','#...#'],
  'I': ['#####','..#..','..#..','..#..','#####'],
  'K': ['#...#','#..#.','#.#..','#..#.','#...#'],
  'L': ['#....','#....','#....','#....','#####'],
  'M': ['#...#','##.##','#.#.#','#...#','#...#'],
  'N': ['#...#','##..#','#.#.#','#..##','#...#'],
  'O': ['.###.','#...#','#...#','#...#','.###.'],
  'P': ['####.','#...#','####.','#....','#....'],
  'R': ['####.','#...#','####.','#..#.','#...#'],
  'S': ['.###.','#....','.###.','....#','.###.'],
  'T': ['#####','..#..','..#..','..#..','..#..'],
  'U': ['#...#','#...#','#...#','#...#','.###.'],
  'V': ['#...#','#...#','#...#','.###.','..#..'],
  'W': ['#...#','#.#.#','#.#.#','#.#.#','.###.'],
  'X': ['#...#','.###.','..#..','.###.','#...#'],
  'Y': ['#...#','.###.','..#..','..#..','..#..'],
  'Z': ['#####','...#.','..#..','.#...','#####'],
  '0': ['.###.','#...#','#.#.#','#.#.#','.###.'],
  '1': ['..#..','.###.','..#..','..#..','#####'],
  '2': ['.###.','....#','.###.','#....','.###.'],
  '3': ['.###.','....#','.###.','....#','.###.'],
  '4': ['#...#','#...#','#####','....#','....#'],
  '5': ['#####','#....','####.','....#','.###.'],
  '6': ['.###.','#....','####.','#...#','.###.'],
  '7': ['#####','....#','...#.','..#..','.###.'],
  '8': ['.###.','#...#','.###.','#...#','.###.'],
  '9': ['.###.','#...#','.###.','....#','.###.'],
  '.': ['.....','.....','.....','.....','..#..'],
  ',': ['.....','.....','.....','..#..','..#..'],
  '!': ['..#..','..#..','.....','..#..','..#..'],
  '?': ['.###.','....#','..#..','.....','..#..'],
  '-': ['.....','.....','..#..','.....','.....'],
  ':': ['.....','..#..','.....','..#..','.....'],
  ';': ['.....','..#..','.....','..#..','.###.'],
  "'": ['..#..','.....','.....','.....','.....'],
}

export function textWidth(str: string, scale = 1) { return str.length * (5 + 1) * scale }

export function drawText(buf: Buf, str: string, x: number, y: number, c: number, scale = 1, _outline?: number) {
  let cx = 0
  for (const ch of str) {
    const rows = FONT5[ch] || FONT5[' ']
    for (let j = 0; j < 5; j++) {
      const row = rows[j]
      for (let i = 0; i < 5; i++) {
        if (row[i] === '#') {
          for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) {
            buf.px(x + cx * scale + i * scale + a, y + j * scale + b, c)
          }
        }
      }
    }
    cx += 6
  }
  return cx * scale
}

export function drawBufToCanvas(buf: Buf, ctx: CanvasRenderingContext2D, scale = 1, dx = 0, dy = 0) {
  const id = buf.toImageData()
  const canvas = document.createElement('canvas')
  canvas.width = buf.w
  canvas.height = buf.h
  const c = canvas.getContext('2d')!
  c.putImageData(id, 0, 0)
  ctx.drawImage(canvas, dx, dy, buf.w * scale, buf.h * scale)
}

export const shade3 = (base: number, dark: number, hi: number, th = 0.42, td = -0.22) => {
  const LX = -0.6, LY = -0.8
  return (_x: number, _y: number, _nx: number, _ny: number) => {
    const s = -(_nx * LX + _ny * LY)
    return s > th && hi ? hi : s < td ? dark : base
  }
}

export function hash(x: number, y: number, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function step(t: number, fps: number) { return Math.floor(t * fps + 1e-6) }
