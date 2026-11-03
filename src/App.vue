<script setup lang="ts">
import MvView from './views/MvView.vue'
import NoteEditor from './views/NoteEditor.vue'
import {
  ref,
  computed,
  reactive,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'
import {
  apiGetSnapshot,
  apiGetStatus,
  apiGetVault,
  apiRescan,
  apiSaveVault,
  fmtNum,
  fmtSize,
  type Snapshot,
  type Vault,
} from "./api";

const view = ref<"nebula" | "tree" | "contour" | "admin" | "mv" | "note">("nebula");
const snapshot = ref<Snapshot | null>(null);
const vault = reactive<Vault>({
  schema: "ymz.atlas.vault/1",
  id: "vault_local_001",
  name: "本機星圖",
  brand: "晏銘湛箴",
  palette: "A",
  mode: "dark",
  roots: [],
  excludeNames: [],
  maxDepth: 6,
  maxDirs: 40000,
  scanIntervalMinutes: 30,
});
const statusText = ref("載入中…");
const busy = ref(false);
const depth = ref(3);
const showFiles = ref(true);
const treeDepth = ref(5);
const heatDays = ref(120);
const contourLevels = ref(7);
const driveFilter = ref<string | null>(null);
const rootsText = ref("");
const excludeText = ref("");

const nebulaCanvas = ref<HTMLCanvasElement | null>(null);
const treeCanvas = ref<HTMLCanvasElement | null>(null);
const heatCanvas = ref<HTMLCanvasElement | null>(null);
const contourCanvas = ref<HTMLCanvasElement | null>(null);

let graph: ForceGraph | null = null;
let rafWatch: number | null = null;

const totals = computed(() => snapshot.value?.totals);
const projectFmt = computed<'169' | '23'>(() => '169');

function applyTheme() {
  document.documentElement.dataset.palette = vault.palette;
  document.documentElement.dataset.mode = vault.mode;
}

function resize(c: HTMLCanvasElement) {
  const r = c.parentElement!.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.floor(r.width * dpr);
  c.height = Math.floor(r.height * dpr);
  c.style.width = r.width + "px";
  c.style.height = r.height + "px";
  return { w: r.width, h: r.height, dpr };
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function buildGraphData() {
  const snap = snapshot.value;
  if (!snap) return { nodes: [] as any[], links: [] as any[] };
  const nodes: any[] = [];
  const links: any[] = [];
  const seen = new Set<string>();
  const rootId = "__ROOT__";
  nodes.push({
    id: rootId,
    name: "本機",
    isDir: true,
    depth: 0,
    size: snap.totals.bytes,
    files: snap.totals.files,
    dirs: snap.totals.dirs,
    cat: "folder",
    mass: 8,
    radius: 14,
  });
  seen.add(rootId);
  const trees = driveFilter.value
    ? snap.roots.filter((t) => t.drive === driveFilter.value)
    : snap.roots;

  function walk(n: any, d: number, parent: string) {
    if (d > depth.value) return;
    if (!n.isDir && !showFiles.value) return;
    if (!seen.has(n.id)) {
      const r = n.isDir
        ? Math.max(4, Math.min(22, 3 + Math.log10((n.size || 1) + 1) * 2.2))
        : Math.max(2.2, Math.min(10, 1.5 + Math.log10((n.size || 1) + 1) * 1.4));
      nodes.push({
        id: n.id,
        name: n.name,
        isDir: n.isDir,
        depth: d,
        size: n.size || 0,
        files: n.files || 0,
        dirs: n.dirs || 0,
        cat: n.cat || (n.isDir ? "folder" : "other"),
        mass: n.isDir ? 1.5 + Math.log10((n.size || 1) + 1) : 0.6,
        radius: r,
      });
      seen.add(n.id);
    }
    links.push({ source: parent, target: n.id, weight: n.size || 1 });
    if (n.children) for (const c of n.children) walk(c, d + 1, n.id);
  }

  for (const t of trees) {
    links.push({ source: rootId, target: t.root.id, weight: t.totalBytes || 1 });
    walk(t.root, 1, rootId);
  }
  return { nodes: nodes.slice(0, 3500), links };
}

function drawNebulaFrame() {
  const canvas = nebulaCanvas.value;
  if (!canvas || !graph) return;
  const size = resize(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  ctx.fillStyle = cssVar("--bg", "#191C29");
  ctx.fillRect(0, 0, size.w, size.h);
  const cats = snapshot.value?.categories || {};
  ctx.lineWidth = 0.7;
  for (const l of graph.links) {
    if (!l.source || !l.target) continue;
    ctx.strokeStyle = (cats[l.source.cat] || "#5d6d88") + "55";
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
  }
  for (const n of graph.nodes) {
    const col = cats[n.cat] || "#8b9dc3";
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  }
}

function refreshNebula() {
  const canvas = nebulaCanvas.value;
  if (!canvas || !snapshot.value) return;
  const size = resize(canvas);
  const { nodes, links } = buildGraphData();
  for (const n of nodes) {
    n.x = size.w / 2 + (Math.random() - 0.5) * 80;
    n.y = size.h / 2 + (Math.random() - 0.5) * 80;
  }
  if (!graph) {
    graph = new ForceGraph({
      charge: -140,
      linkDistance: 55,
      gravity: 0.08,
      onTick: drawNebulaFrame,
    });
  }
  graph.width = size.w;
  graph.height = size.h;
  graph.setData(nodes, links).reheat(0.85);
}

function refreshTree() {
  const canvas = treeCanvas.value;
  if (!canvas || !snapshot.value) return;
  const size = resize(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  ctx.fillStyle = cssVar("--bg", "#191C29");
  ctx.fillRect(0, 0, size.w, size.h);
  const root = {
    id: "__ALL__",
    name: "全部磁碟",
    isDir: true,
    size: snapshot.value.totals.bytes,
    files: snapshot.value.totals.files,
    dirs: snapshot.value.totals.dirs,
    cat: "folder",
    children: snapshot.value.roots.map((r) => r.root),
  };
  const cells = TreeMap.layout(root, { x: 8, y: 8, w: size.w - 16, h: size.h - 16 }, {
    maxDepth: treeDepth.value,
    sort: "size",
  });
  const cats = snapshot.value.categories || {};
  for (const cell of cells) {
    const { node, rect, depth: d } = cell;
    if (rect.w < 1 || rect.h < 1) continue;
    const col = cats[node.cat] || "#8b9dc3";
    ctx.globalAlpha = Math.max(0.35, 0.95 - d * 0.08);
    ctx.fillStyle = col;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(10,13,22,0.45)";
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    if (rect.w > 42 && rect.h > 18) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "600 12px Segoe UI, Microsoft YaHei, sans-serif";
      ctx.fillText(String(node.name).slice(0, 18), rect.x + 4, rect.y + 14);
    }
  }
}

function refreshContour() {
  if (!snapshot.value || !heatCanvas.value || !contourCanvas.value) return;
  const byDay = Object.assign(
    Object.create(null),
    snapshot.value.activity?.byDay || Contour.activityFromTrees(snapshot.value.roots)
  );
  const series = Contour.heatmapSeries(byDay, heatDays.value);
  const hs = resize(heatCanvas.value);
  Contour.drawHeatmap(heatCanvas.value.getContext("2d")!, series, hs.w, hs.h, {
    bg: cssVar("--bg", "#191C29"),
    surface: cssVar("--surface", "#1E3029"),
    accent: cssVar("--accent", "#9FA98F"),
    ink: cssVar("--ink", "#E2E4ED"),
  });
  const grid = Contour.densityGrid(snapshot.value.roots, 64, 48);
  const levels = Array.from({ length: contourLevels.value }, (_, i) => (i + 1) / (contourLevels.value + 1));
  const lines = Contour.contours(grid, levels);
  const cs = resize(contourCanvas.value);
  Contour.drawContour(contourCanvas.value.getContext("2d")!, grid, lines, cs.w, cs.h, {
    bg: cssVar("--bg", "#191C29"),
    accent: cssVar("--accent", "#9FA98F"),
    ink: cssVar("--ink", "#E2E4ED"),
  });
}

async function loadAll() {
  busy.value = true;
  statusText.value = "讀取資料…";
  try {
    const [s, v, st] = await Promise.all([apiGetSnapshot(), apiGetVault(), apiGetStatus()]);
    snapshot.value = s;
    Object.assign(vault, v);
    rootsText.value = (v.roots || []).join("\n");
    excludeText.value = (v.excludeNames || []).join("\n");
    applyTheme();
    statusText.value = st.scanning ? "掃描中…" : "就緒";
    await nextTick();
    redraw();
  } catch (e: any) {
    statusText.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

function redraw() {
  if (view.value === "nebula") refreshNebula();
  else if (view.value === "tree") refreshTree();
  else if (view.value === "contour") refreshContour();
  // mv view is self-rendering via requestAnimationFrame
}

async function onRescan() {
  busy.value = true;
  statusText.value = "掃描中…";
  try {
    snapshot.value = await apiRescan();
    statusText.value = "掃描完成";
    await nextTick();
    redraw();
  } catch (e: any) {
    statusText.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

async function onSaveVault() {
  vault.roots = rootsText.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  vault.excludeNames = excludeText.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  busy.value = true;
  try {
    const saved = await apiSaveVault({ ...vault });
    Object.assign(vault, saved);
    applyTheme();
    statusText.value = "vault 已儲存";
  } catch (e: any) {
    statusText.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

function togglePalette() {
  vault.palette = vault.palette === "A" ? "B" : "A";
  applyTheme();
  redraw();
}
function toggleMode() {
  vault.mode = vault.mode === "dark" ? "light" : "dark";
  applyTheme();
  redraw();
}

watch(view, async () => {
  await nextTick();
  redraw();
});
watch([depth, showFiles, driveFilter], () => {
  if (view.value === "nebula") refreshNebula();
});
watch(treeDepth, () => {
  if (view.value === "tree") refreshTree();
});
watch([heatDays, contourLevels], () => {
  if (view.value === "contour") refreshContour();
});

function onResize() {
  redraw();
}

onMounted(async () => {
  applyTheme();
  await loadAll();
  window.addEventListener("resize", onResize);
  rafWatch = window.setInterval(async () => {
    const st = await apiGetStatus();
    if (st.scanning) statusText.value = "掃描中…";
  }, 8000);
});
onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  if (rafWatch) clearInterval(rafWatch);
});
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="logo">◈</span>
        <div>
          <h1>星圖 Atlas</h1>
          <p class="sub">晏銘湛箴 · Vue + Tauri + Rust</p>
        </div>
      </div>
      <div class="stats" v-if="totals">
        <div class="stat"><span>檔案</span><b>{{ fmtNum(totals.files) }}</b></div>
        <div class="stat"><span>目錄</span><b>{{ fmtNum(totals.dirs) }}</b></div>
        <div class="stat"><span>容量</span><b>{{ fmtSize(totals.bytes) }}</b></div>
      </div>
      <div class="actions">
        <button class="btn ghost" @click="togglePalette">A/B</button>
        <button class="btn ghost" @click="toggleMode">◐</button>
        <button class="btn" :disabled="busy" @click="onRescan">↻ 重掃</button>
      </div>
    </header>

    <nav class="tabs">
      <button class="tab" :class="{ active: view === 'nebula' }" @click="view = 'nebula'">✦ 星雲圖</button>
      <button class="tab" :class="{ active: view === 'tree' }" @click="view = 'tree'">▦ 樹圖</button>
      <button class="tab" :class="{ active: view === 'contour' }" @click="view = 'contour'">〰 等高線</button>
      <button class="tab" :class="{ active: view === 'admin' }" @click="view = 'admin'">⚙ 管理員</button>
      <button class="tab" :class="{ active: view === 'mv' }" @click="view = 'mv'">🎬 像素MV</button>
      <button class="tab" :class="{ active: view === 'note' }" @click="view = 'note'">📝 筆記</button>
      <div class="spacer"></div>
      <div class="status" :class="{ busy }"><span class="dot"></span>{{ statusText }}</div>
    </nav>

    <section class="view" :class="{ active: view === 'nebula' }">
      <aside class="side">
        <div class="block">
          <h3>顯示</h3>
          <label class="slider-row"><span>深度</span>
            <input type="range" min="1" max="6" v-model.number="depth" /><b>{{ depth }}</b>
          </label>
          <label class="check-row"><input type="checkbox" v-model="showFiles" /><span>顯示檔案</span></label>
        </div>
        <div class="block">
          <h3>磁碟</h3>
          <div class="drive" :class="{ active: !driveFilter }" @click="driveFilter = null">全部</div>
          <div
            v-for="r in snapshot?.roots || []"
            :key="r.drive"
            class="drive"
            :class="{ active: driveFilter === r.drive }"
            @click="driveFilter = r.drive"
          >
            {{ r.drive }} · {{ fmtSize(r.totalBytes) }}
          </div>
        </div>
        <div class="block">
          <h3>分類</h3>
          <div class="legend">
            <div v-for="(col, k) in snapshot?.categories || {}" :key="k" class="legend-item">
              <span class="swatch" :style="{ background: col }"></span>{{ k }}
            </div>
          </div>
        </div>
      </aside>
      <div class="canvas-wrap">
        <canvas ref="nebulaCanvas"></canvas>
        <div v-if="!snapshot" class="empty"><p>等待掃描…</p></div>
      </div>
    </section>

    <section class="view" :class="{ active: view === 'tree' }">
      <aside class="side">
        <div class="block">
          <h3>樹圖</h3>
          <label class="slider-row"><span>深度</span>
            <input type="range" min="1" max="8" v-model.number="treeDepth" /><b>{{ treeDepth }}</b>
          </label>
          <p class="hint">方塊大小 = 容量。點擊管理員可調整掃描根目錄。</p>
        </div>
      </aside>
      <div class="canvas-wrap"><canvas ref="treeCanvas"></canvas></div>
    </section>

    <section class="view" :class="{ active: view === 'contour' }">
      <aside class="side">
        <div class="block">
          <h3>等高線</h3>
          <p class="hint">上：flomo 式日曆熱力；下：資料密度地形等高線。</p>
          <label class="slider-row"><span>天數</span>
            <input type="range" min="30" max="365" v-model.number="heatDays" /><b>{{ heatDays }}</b>
          </label>
          <label class="slider-row"><span>層數</span>
            <input type="range" min="3" max="12" v-model.number="contourLevels" /><b>{{ contourLevels }}</b>
          </label>
        </div>
      </aside>
      <div class="canvas-wrap split-v">
        <canvas ref="heatCanvas"></canvas>
        <canvas ref="contourCanvas"></canvas>
      </div>
    </section>

    <section class="view" :class="{ active: view === 'admin' }">
      <div class="admin">
        <div class="card">
          <h2 style="margin-bottom:8px">vault.atlasvault</h2>
          <p class="hint">本地保險庫設定。格式見 formats/SCHEMA.md</p>
          <label class="field"><span>名稱</span><input v-model="vault.name" /></label>
          <label class="field"><span>色票</span>
            <select v-model="vault.palette"><option value="A">A 愉悅</option><option value="B">B 茶色</option></select>
          </label>
          <label class="field"><span>模式</span>
            <select v-model="vault.mode"><option value="dark">深色</option><option value="light">淺色</option></select>
          </label>
          <label class="field"><span>最大深度</span><input type="number" v-model.number="vault.maxDepth" min="1" max="12" /></label>
          <label class="field"><span>根目錄</span><textarea v-model="rootsText" rows="6" /></label>
          <label class="field"><span>排除名稱</span><textarea v-model="excludeText" rows="8" /></label>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn" :disabled="busy" @click="onSaveVault">儲存 vault</button>
            <button class="btn ghost" :disabled="busy" @click="onRescan">儲存後重掃</button>
          </div>
        </div>
      </div>
    </section>
    <section class="view" :class="{ active: view === 'mv' }">
      <MvView :fmt="projectFmt" />
    </section>
    <section class="view" :class="{ active: view === 'note' }">
      <NoteEditor />
    </section>
  </div>
</template>
