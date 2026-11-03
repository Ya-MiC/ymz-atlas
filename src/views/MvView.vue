// src/views/MvView.vue
// 像素MV編輯器 —— 整合 kid-pixel-mv 引擎進 ymz-atlas
// 標籤頁：mv（像素MV製作）
// 輸出：2:3 (1080x1620 抖音) / 16:9 (1920x1080 B站YouTube)

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { Buf, C, drawText, drawBufToCanvas, textWidth } from '../composables/usePixelEngine'
import { MVProject, MVShot, MVCharacter, newShot, newCharacter, findShotAt } from '../composables/useMvTimeline'

const props = defineProps<{ fmt?: '169' | '23' }>()

// 畫布尺寸（世界像素）
const LW = props.fmt === '23' ? 180 : 320
const LH = props.fmt === '23' ? 270 : 180
const SCALE = 6 // 1 世界像素 = 6 螢幕像素
const W = LW * SCALE
const H = LH * SCALE

// 項目狀態
const project = reactive<MVProject>({
  title: '小孩 Kid',
  artist: '张艺兴',
  album: '闹天宫',
  fmt: props.fmt || '169',
  fps: 30,
  dur: 152.916,
  shots: [],
  watermark: '晏銘湛箴',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const selectedShotId = ref<string | null>(null)
const playTime = ref(0)
const isPlaying = ref(false)
const newCharKind = ref<MVCharacter['kind']>('lay')
const raf = ref<number | null>(null)

// Canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// 像素畫布（低解析度世界畫布）
const worldBuf = ref(new Buf(LW, LH))
const overlayBuf = ref(new Buf(LW, LH))

// 分鏡操作
function addShot() {
  const t = project.shots.length > 0
    ? project.shots[project.shots.length - 1].t + 4
    : 0
  const shot = newShot(`shot-${Date.now()}`, t, '字幕內容')
  project.shots.push(shot)
  project.updatedAt = Date.now()
  selectedShotId.value = shot.id
}

function deleteShot(id: string) {
  project.shots = project.shots.filter((s: MVShot) => s.id !== id)
  if (selectedShotId.value === id) selectedShotId.value = project.shots[0]?.id || null
  project.updatedAt = Date.now()
}

function selectShot(id: string | null) {
  selectedShotId.value = id
}

const currentShot = computed(() => project.shots.find((s: MVShot) => s.id === selectedShotId.value))

// 播放與幀渲染
function renderFrame(t: number) {
  const shot = findShotAt(project.shots, t)
  worldBuf.value.clear(C.n0)
  overlayBuf.value.clear(C.n0)

  if (!shot) {
    drawText(worldBuf.value, 'NO SHOT', LW / 2 - 30, LH / 2, C.p0, 2)
    drawBufToCanvas(worldBuf.value, ctx!, SCALE)
    return
  }

  // 場景背景（簡化：不同場景不同底色）
  const sceneBg: Record<string, number> = {
    room: C.n1, city: C.n0, park: C.n1, practice: C.q0, rooftop: C.n0,
    stageDark: C.ink, mama: C.r3, gameRoom: C.n1, jixian: C.g1,
    redcarpet: C.ink, mushroom: C.b2, bedNight: C.n1, island: C.p0,
    kitchen: C.b0, corner: C.s1, filmset: C.q5, mirror: C.k0,
    bridge: C.n0, phoneClose: C.n1, crewAll: C.q4, birdsNest: C.n0,
    sky: C.n1, spokesman: C.n1, la: C.r3,
  }
  worldBuf.value.rect(0, 0, LW, LH, sceneBg[shot.sc] || C.n0)

  // 繪製角色（簡化：每個角色畫一個像素方塊 + 名稱標籤）
  shot.chars.forEach((ch) => {
    const bx = Math.round(ch.x)
    const by = Math.round(ch.y)
    const colorMap: Record<string, number> = {
      lay: C.v1, lamb: C.v2, huan: C.k1, akita: C.s2, foxLei: C.g2,
      foxBo: C.j2, bull: C.q1, pig: C.k2, squirrel: C.s3, alien: C.j1,
      heJiong: C.h2, peng: C.h1, ziFeng: C.k0, staff: C.q4, exoL: C.p1,
      fanS: C.v0,
    }
    const col = colorMap[ch.kind] || C.q0
    // 身體
    worldBuf.value.disc(bx, by - 8, 6, col)
    // 頭
    worldBuf.value.disc(bx, by - 14, 4, ch.persona === 'unicorn' ? C.v3 : C.p0)
    // 名稱標籤
    drawText(worldBuf.value, ch.kind, bx - 10, by - 20, C.w, 1)
    // 連線到腳底
    worldBuf.value.vline(bx, by - 4, by - 2, col)
  })

  // 字幕（底部）
  const captionY = shot.captionY || LH - 10
  drawText(overlayBuf.value, shot.caption, 4, captionY, C.w, 1, C.ink)

  drawBufToCanvas(worldBuf.value, ctx!, SCALE)
  drawBufToCanvas(overlayBuf.value, ctx!, SCALE)

  // 水印（右下角極小）
  const wm = project.watermark
  const wmW = textWidth(wm, 1)
  drawText(ctx as unknown as Buf, wm, W - wmW - 12, H - 12, C.q1, 1)
  // 註：drawText 寫入 Buf，這裡直接在 Canvas 上畫水印文字（簡化）
  ctx!.fillStyle = 'rgba(255,255,255,0.5)'
  ctx!.font = '12px sans-serif'
  ctx!.fillText(wm, W - wmW - 12, H - 10)
}

function tick() {
  if (!isPlaying.value) return
  playTime.value += 1 / project.fps
  if (playTime.value > project.dur) playTime.value = 0
  const c = canvasRef.value!
  ctx = c.getContext('2d')!
  renderFrame(playTime.value)
  raf.value = requestAnimationFrame(tick)
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) tick()
  else if (raf.value) cancelAnimationFrame(raf.value)
}

function seek(t: number) {
  playTime.value = Math.max(0, Math.min(project.dur, t))
  const c = canvasRef.value!
  ctx = c.getContext('2d')!
  renderFrame(playTime.value)
}

// 匯出（前端 MediaRecorder 擷取 Canvas）
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []

async function startExport() {
  const c = canvasRef.value!
  const stream = c.captureStream(project.fps)
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' })
  recordedChunks = []
  mediaRecorder.ondataavailable = (e) => { if (e.data.size) recordedChunks.push(e.data) }
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title}_${project.fmt}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }
  mediaRecorder.start()
  setTimeout(() => mediaRecorder!.stop(), (project.dur / project.fps) * 1000)
}

onMounted(() => {
  const c = canvasRef.value!
  c.width = W
  c.height = H
  ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  renderFrame(0)
})

onUnmounted(() => {
  if (raf.value) cancelAnimationFrame(raf.value)
})
</script>

<template>
  <div class="mv-shell">
    <div class="mv-toolbar">
      <div class="mv-brand">
        <span class="logo">◈</span>
        <div>
          <h1>像素MV製作</h1>
          <p class="sub">{{ project.title }} · {{ project.artist }} · {{ project.album }}</p>
        </div>
      </div>
      <div class="mv-controls">
        <button class="btn" @click="addShot">+ 新分鏡</button>
        <button class="btn" :disabled="!project.shots.length" @click="togglePlay">
          {{ isPlaying ? '暫停' : '播放' }}
        </button>
        <button class="btn" @click="startExport">匯出 MP4</button>
        <select v-model="project.fmt" class="fmt-select">
          <option value="169">16:9 (1920x1080)</option>
          <option value="23">2:3 (1080x1620)</option>
        </select>
      </div>
    </div>

    <div class="mv-body">
      <!-- 左側分鏡時間軸 -->
      <aside class="mv-timeline">
        <h3>分鏡列表</h3>
        <div class="shot-list">
          <div
            v-for="shot in project.shots"
            :key="shot.id"
            class="shot-item"
            :class="{ active: selectedShotId === shot.id }"
            @click="selectShot(shot.id)"
          >
            <div class="shot-time">{{ shot.t.toFixed(2) }}s</div>
            <div class="shot-caption">{{ shot.caption }}</div>
            <div class="shot-scene">{{ shot.sc }}</div>
            <button class="btn-del" @click.stop="deleteShot(shot.id)">×</button>
          </div>
        </div>
        <div class="shot-empty" v-if="!project.shots.length">暫無分鏡，點擊「+ 新分鏡」建立</div>
      </aside>

      <!-- 中間預覽 -->
      <section class="mv-preview">
        <div class="preview-wrap">
          <canvas ref="canvasRef"></canvas>
          <div v-if="!project.shots.length" class="preview-empty">
            <p>建立第一個分鏡開始製作</p>
          </div>
        </div>
        <div class="play-info">
          <span>{{ playTime.toFixed(2) }}s / {{ project.dur.toFixed(2) }}s</span>
          <input type="range" :min="0" :max="project.dur" :step="0.1" v-model="playTime" @input="seek(playTime)" />
        </div>
      </section>

      <!-- 右側屬性編輯器 -->
      <aside class="mv-props" v-if="currentShot">
        <h3>分鏡屬性</h3>
        <div class="prop-field">
          <label>時間（秒）</label>
          <input type="number" v-model="currentShot.t" step="0.1" />
        </div>
        <div class="prop-field">
          <label>字幕</label>
          <input v-model="currentShot.caption" />
        </div>
        <div class="prop-field">
          <label>場景</label>
          <select v-model="currentShot.sc">
            <option value="room">夢中房間</option>
            <option value="city">城市/頒獎廳</option>
            <option value="park">被拆樂園</option>
            <option value="practice">SM練習室</option>
            <option value="rooftop">天台倒數</option>
            <option value="stageDark">舞台閃電</option>
            <option value="mama">MAMA頒獎</option>
            <option value="gameRoom">夢幻西遊房間</option>
            <option value="jixian">極限挑戰</option>
            <option value="redcarpet">紅毯/而立24</option>
            <option value="mushroom">蘑菇屋</option>
            <option value="bedNight">失眠夜晚</option>
            <option value="island">一出好戏</option>
            <option value="kitchen">生吃魚</option>
            <option value="corner">紅雷哥房間</option>
            <option value="filmset">片場</option>
            <option value="mirror">鏡像</option>
            <option value="bridge">哈爾濱時光大橋</option>
            <option value="phoneClose">手機特寫</option>
            <option value="crewAll">導演組</option>
            <option value="birdsNest">鳥巢演唱會</option>
            <option value="sky">筋斗雲</option>
            <option value="spokesman">夢幻西遊代言</option>
            <option value="la">L.A.求學</option>
          </select>
        </div>
        <div class="prop-field">
          <label>標籤</label>
          <input v-model="currentShot.cap" placeholder="例如：副歌一" />
        </div>

        <h4>角色（{{ currentShot.chars.length }} 個）</h4>
        <div class="char-list">
          <div
            v-for="ch in currentShot.chars"
            :key="ch.id"
            class="char-item"
          >
            <span class="char-kind">{{ ch.kind }}</span>
            <span class="char-pose">{{ ch.pose }}</span>
            <span class="char-expr">{{ ch.expr }}</span>
            <span class="char-pos">({{ Math.round(ch.x) }},{{ Math.round(ch.y) }})</span>
            <button class="btn-del" @click.stop="currentShot.chars = currentShot.chars.filter((c: MVCharacter) => c.id !== ch.id)">×</button>
          </div>
        </div>
        <div class="char-add">
          <select v-model="newCharKind">
            <option value="lay">張藝興(成人)</option>
            <option value="lamb">小孩(小羊)</option>
            <option value="huan">歡欢(童星)</option>
            <option value="akita">黃渤·秋田犬</option>
            <option value="foxLei">黃磊·老狐狸</option>
            <option value="bull">孫紅雷·牛頭梗</option>
            <option value="pig">羅志祥·小豬</option>
            <option value="squirrel">王迅·大松鼠</option>
            <option value="heJiong">何炅</option>
            <option value="peng">彭昱暢</option>
            <option value="ziFeng">張子楓</option>
            <option value="staff">導演組</option>
            <option value="alien">外星人</option>
          </select>
          <button class="btn" @click="currentShot.chars.push(newCharacter(newCharKind, LW / 2, LH - 20))">加入角色</button>
        </div>
      </aside>
    </div>

    <div class="mv-footer">
      <p>晏銘湛箴 · 像素風 MV 製作平台 · Tauri 2 + Vue 3 + Rust · 本地優先</p>
    </div>
  </div>
</template>

<style scoped>
.mv-shell { display: flex; flex-direction: column; height: 100%; background: var(--bg); color: var(--ink); }
.mv-toolbar { display: flex; align-items: center; gap: 16px; padding: 10px 18px; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--surface) 88%, transparent); }
.mv-brand { display: flex; gap: 12px; align-items: center; }
.logo { font-size: 22px; color: var(--accent); }
.mv-brand h1 { font-size: 15px; font-weight: 650; }
.mv-brand .sub { font-size: 11px; color: var(--muted); }
.mv-controls { display: flex; gap: 8px; align-items: center; flex: 1; }
.btn { min-height: var(--hit); padding: 0 14px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 12px; background: var(--accent); color: var(--on-accent); }
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.btn-del { background: var(--r2); color: var(--w); }
.fmt-select { padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 12px; }

.mv-body { display: flex; flex: 1; overflow: hidden; }
.mv-timeline { width: 300px; border-right: 1px solid var(--line); background: var(--surface); overflow-y: auto; padding: 12px; }
.mv-timeline h3 { font-size: 13px; margin-bottom: 10px; color: var(--muted); }
.shot-list { display: flex; flex-direction: column; gap: 6px; }
.shot-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); cursor: pointer; }
.shot-item.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
.shot-time { font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent); }
.shot-caption { font-size: 12px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin: 0 8px; }
.shot-scene { font-size: 10px; color: var(--muted); }
.shot-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 12px; }

.mv-preview { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.preview-wrap { flex: 1; position: relative; border: 1px solid var(--line); background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.preview-wrap canvas { max-width: 100%; max-height: 100%; image-rendering: pixelated; background: var(--n0); }
.preview-empty { color: var(--muted); font-size: 14px; }
.play-info { padding: 8px 12px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 10px; background: var(--surface); }
.play-info input { flex: 1; }

.mv-props { width: 340px; border-left: 1px solid var(--line); background: var(--surface); overflow-y: auto; padding: 12px; }
.mv-props h3 { font-size: 13px; margin-bottom: 10px; color: var(--muted); }
.prop-field { margin-bottom: 10px; }
.prop-field label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.prop-field input, .prop-field select { width: 100%; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-size: 12px; }
.char-list { margin-bottom: 8px; max-height: 120px; overflow-y: auto; }
.char-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-radius: 6px; background: color-mix(in srgb, var(--ink) 8%, transparent); font-size: 11px; }
.char-kind { color: var(--accent); font-weight: 600; }
.char-pose { color: var(--muted); margin-left: 6px; }
.char-expr { color: var(--accent-soft); margin-left: 6px; }
.char-pos { color: var(--q2); margin-left: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.char-add { display: flex; gap: 6px; margin-top: 8px; }
.char-add select { flex: 1; }

.mv-footer { padding: 10px 18px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); text-align: center; }
</style>