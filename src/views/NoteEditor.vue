// src/views/NoteEditor.vue
// Obsidian 輕量級本地 Markdown 編輯器 —— 用戶編輯的是自己文件夾裏的 .md
// 與 wenrun-design-system v7.1 色票對齊

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocalVault } from '../composables/useLocalVault'

const { zones, activeZone, activeFile, editing, setZone, selectFile, newFile, saveFile, deleteFile } = useLocalVault()

const localActiveZoneId = ref<string>('notes')

const newFileName = ref('')
const editContent = ref('')

watch(
  () => activeFile.value,
  (f) => { editContent.value = f?.content ?? ''; editing.value = false },
  { immediate: true }
)

function saveEdit() {
  if (!activeFile.value) return
  saveFile(editContent.value)
}

function onZoneClick(id: string) { setZone(id) }

function onNewFile() {
  if (!newFileName.value.trim()) return
  const zone = activeZone.value?.id ?? 'notes'
  newFile(zone, newFileName.value.trim())
  newFileName.value = ''
}
</script>

<template>
  <div class="note-editor">
    <!-- 左側分區檔案列表 -->
    <aside class="zone-sidebar">
      <div class="zone-header">
        <span class="zone-title">文件分區</span>
        <div class="new-file-bar">
          <input v-model="newFileName" placeholder="新文件名..." @keyup.enter="onNewFile" />
          <button class="btn" @click="onNewFile">新建</button>
        </div>
      </div>

      <div class="zone-list">
        <div
          v-for="zone in zones"
          :key="zone.id"
          class="zone-block"
          :class="{ active: localActiveZoneId === zone.id }"
          @click="onZoneClick(zone.id)"
        >
          <div class="zone-color-dot" :style="{ background: zone.color }"></div>
          <span class="zone-name">{{ zone.name }}</span>
          <span class="zone-count">{{ zone.files.length }}</span>
        </div>
      </div>

      <div class="file-list">
        <div
          v-for="file in (activeZone?.files || [])"
          :key="file.path"
          class="file-item"
          :class="{ active: activeFile?.path === file.path }"
          @click="selectFile(file)"
        >
          <span class="file-icon">📄</span>
          <span class="file-name">{{ file.name }}</span>
          <button class="btn-del" @click.stop="deleteFile(file)">×</button>
        </div>
      </div>
    </aside>

    <!-- 中間編輯區 -->
    <section class="note-body">
      <div class="note-header">
        <div class="file-title">
          {{ activeFile?.name ?? '未選擇文件' }}
        </div>
        <div class="note-actions">
          <button class="btn ghost" @click="editing = true" :disabled="!activeFile">編輯</button>
          <button class="btn" @click="saveEdit" :disabled="!editing || !activeFile">儲存</button>
          <button class="btn ghost" @click="editing = false" :disabled="!editing">取消</button>
        </div>
      </div>

      <div class="note-content">
        <textarea
          v-model="editContent"
          :disabled="!editing"
          placeholder="沒有選擇文件，請從左側分區選擇，或點擊「新建」"
          class="note-textarea"
        ></textarea>
      </div>
    </section>
  </div>
</template>

<style scoped>
.note-editor { display: flex; height: 100%; background: var(--bg); color: var(--ink); }
.zone-sidebar {
  width: 280px;
  border-right: 1px solid var(--line);
  background: var(--surface);
  display: flex;
  flex-direction: column;
}
.zone-header { padding: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--line); }
.zone-title { font-size: 12px; font-weight: 650; color: var(--muted); flex: 1; }
.new-file-bar { display: flex; gap: 6px; }
.new-file-bar input { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-size: 11px; }
.zone-list { padding: 10px; }
.zone-block {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  cursor: pointer; font-size: 12px;
  margin-bottom: 4px;
}
.zone-block.active { background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: var(--accent); }
.zone-color-dot { width: 8px; height: 8px; border-radius: 50%; }
.zone-name { flex: 1; color: var(--ink); }
.zone-count { font-size: 10px; color: var(--muted); }
.file-list { padding: 10px; display: flex; flex-direction: column; gap: 4px; }
.file-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px; cursor: pointer;
  font-size: 12px;
}
.file-item.active { background: color-mix(in srgb, var(--accent) 12%, transparent); }
.file-item:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.file-icon { font-size: 14px; }
.file-name { flex: 1; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-del { background: var(--r2); color: var(--w); font-size: 10px; padding: 2px 6px; border-radius: 4px; }

.note-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.note-header { padding: 10px 14px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; background: var(--surface); }
.file-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.note-actions { display: flex; gap: 6px; }
.note-content { flex: 1; padding: 14px; overflow: auto; }
.note-textarea {
  width: 100%; height: 100%;
  background: var(--bg); color: var(--ink);
  border: none; outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Microsoft YaHei", monospace;
  font-size: 14px; line-height: 1.7;
  resize: none;
}
.note-textarea:disabled { background: transparent; }
</style>