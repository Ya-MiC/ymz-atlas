// src/composables/useLocalVault.ts
// 本地優先 Markdown 文件庫 —— 用戶編輯的是自己文件夾裏的 .md
// Tauri 命令名與 src-tauri 端對應（見 src-tauri/src/commands.rs）

import { reactive, ref, computed } from 'vue';

export interface VaultFile {
  path: string          // 相對於 vault 根的相對路徑
  name: string
  content: string
  mtime: number
  zone: string          // 所屬分區：notes / scenes / shots / assets / exports
}

export interface VaultZone {
  id: string
  name: string
  color: string         // wenrun 色票
  files: VaultFile[]
}

export const DEFAULT_ZONES: VaultZone[] = [
  { id: 'notes', name: '筆記', color: '#B9DDF1', files: [] },   // 雲箋-淺天空藍
  { id: 'scenes', name: '場景', color: '#F4DDE7', files: [] },  // 荷花粉
  { id: 'shots', name: '分鏡', color: '#CBBF9E', files: [] },   // 亞麻金
  { id: 'assets', name: '素材', color: '#CDBFE0', files: [] },  // 淡紫
  { id: 'exports', name: '輸出', color: '#B7C8A8', files: [] }, // 鼠尾草綠
]

// 本地模擬（沒 Tauri 時降級），實際生產環境由 Tauri Rust 端提供 fs 讀寫
export function useLocalVault() {
  const zones = reactive<VaultZone[]>(JSON.parse(JSON.stringify(DEFAULT_ZONES)))
  const activeZoneId = ref('notes')
  const activeFile = ref<VaultFile | null>(null)
  const editing = ref(false)

  const activeZone = computed(() => zones.find((z: VaultZone) => z.id === activeZoneId.value));

  function setZone(id: string) {
    activeZoneId.value = id
    activeFile.value = null
    editing.value = false
  }

  function selectFile(file: VaultFile) {
    activeFile.value = file
    editing.value = false
  }

  function newFile(zoneId: string, name: string, content = '') {
    const path = `${zoneId}/${name}`
    const file: VaultFile = { path, name, content, mtime: Date.now(), zone: zoneId };
    const zone = zones.find((z: VaultZone) => z.id === zoneId);
    if (zone) zone.files.push(file)
    selectFile(file)
    editing.value = true
  }

  function saveFile(content: string) {
    if (!activeFile.value) return
    activeFile.value.content = content
    activeFile.value.mtime = Date.now()
    editing.value = false
  }

  function deleteFile(file: VaultFile) {
    const zone = zones.find((z: VaultZone) => z.id === file.zone);
    if (zone) {
      zone.files = zone.files.filter(f => f.path !== file.path)
    }
    if (activeFile.value?.path === file.path) {
      activeFile.value = null
      editing.value = false
    }
  }

  // Tauri 命令接口（實際生產環境由 Rust 端實現 fs 讀寫）
  async function loadFromDisk(vaultPath: string) {
    // TODO: invoke('read_vault', { vaultPath })
    console.log('load vault from', vaultPath)
  }

  async function saveToDisk(vaultPath: string) {
    // TODO: invoke('write_vault', { vaultPath, files: zones.flatMap(z => z.files) })
    console.log('save vault to', vaultPath)
  }

  return {
    zones,
    activeZoneId,
    activeZone,
    activeFile,
    editing,
    setZone,
    selectFile,
    newFile,
    saveFile,
    deleteFile,
    loadFromDisk,
    saveToDisk,
  }
}
