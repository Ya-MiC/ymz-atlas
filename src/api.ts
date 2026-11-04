import { invoke } from "@tauri-apps/api/core";

export type Totals = {
  dirs: number;
  files: number;
  bytes: number;
  memos?: number;
};

export type Snapshot = {
  schema: string;
  generatedAt: number;
  durationMs: number;
  roots: any[];
  totals: Totals;
  extStats: any[];
  categories: Record<string, string>;
  activity?: { byDay: Record<string, any> };
  palette?: string;
  mode?: string;
};

export type Vault = {
  schema: string;
  id: string;
  name: string;
  brand: string;
  palette: string;
  mode: string;
  roots: string[];
  excludeNames: string[];
  maxDepth: number;
  maxDirs: number;
  scanIntervalMinutes: number;
};

function isTauri(): boolean {
  return typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
}

const demoSnapshot = (): Snapshot => ({
  schema: "ymz.atlas.snap/1",
  generatedAt: Date.now(),
  durationMs: 12,
  roots: [
    {
      drive: "Demo",
      path: "Demo",
      dirCount: 3,
      fileCount: 5,
      totalBytes: 1200000,
      root: {
        id: "demo",
        name: "Demo",
        isDir: true,
        size: 1200000,
        files: 5,
        dirs: 3,
        mtime: Date.now(),
        cat: "folder",
        children: [
          {
            id: "demo/notes",
            name: "notes",
            isDir: true,
            size: 400000,
            files: 2,
            dirs: 0,
            mtime: Date.now(),
            cat: "folder",
            children: [
              { id: "demo/notes/a.md", name: "a.md", isDir: false, size: 1200, files: 1, dirs: 0, mtime: Date.now(), cat: "markdown" },
              { id: "demo/notes/b.md", name: "b.md", isDir: false, size: 2200, files: 1, dirs: 0, mtime: Date.now() - 86400000, cat: "markdown" },
            ],
          },
          {
            id: "demo/code",
            name: "code",
            isDir: true,
            size: 800000,
            files: 3,
            dirs: 0,
            mtime: Date.now(),
            cat: "folder",
            children: [
              { id: "demo/code/main.rs", name: "main.rs", isDir: false, size: 5000, files: 1, dirs: 0, mtime: Date.now(), cat: "code" },
              { id: "demo/code/app.vue", name: "App.vue", isDir: false, size: 8000, files: 1, dirs: 0, mtime: Date.now(), cat: "code" },
            ],
          },
        ],
      },
    },
  ],
  totals: { dirs: 3, files: 5, bytes: 1200000, memos: 0 },
  extStats: [
    { ext: "md", count: 2, bytes: 3400 },
    { ext: "rs", count: 1, bytes: 5000 },
    { ext: "vue", count: 1, bytes: 8000 },
  ],
  categories: {
    code: "#61dafb",
    markdown: "#7c9cff",
    folder: "#8b9dc3",
    other: "#6c757d",
  },
  activity: {
    byDay: {
      [new Date().toISOString().slice(0, 10)]: { files: 3, bytes: 1000, memos: 1 },
    },
  },
  palette: "A",
  mode: "dark",
});

const demoVault = (): Vault => ({
  schema: "ymz.atlas.vault/1",
  id: "vault_demo",
  name: "本機星圖",
  brand: "晏銘湛箴",
  palette: "A",
  mode: "dark",
  roots: ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"],
  excludeNames: ["node_modules", ".git", "Windows", "AppData"],
  maxDepth: 6,
  maxDirs: 40000,
  scanIntervalMinutes: 30,
});

export async function apiGetStatus() {
  if (!isTauri()) {
    return { scanning: false, product: "星圖 Atlas", brand: "晏銘湛箴", stats: demoSnapshot().totals };
  }
  return invoke<any>("get_status");
}

export async function apiGetSnapshot(): Promise<Snapshot | null> {
  if (!isTauri()) return demoSnapshot();
  return invoke<Snapshot | null>("get_snapshot");
}

export async function apiRescan(): Promise<Snapshot> {
  if (!isTauri()) return demoSnapshot();
  return invoke<Snapshot>("rescan");
}

export async function apiGetVault(): Promise<Vault> {
  if (!isTauri()) return demoVault();
  return invoke<Vault>("get_vault");
}

export async function apiSaveVault(vault: Vault): Promise<Vault> {
  if (!isTauri()) return vault;
  return invoke<Vault>("save_vault_cmd", { vault });
}

export function fmtSize(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? n : n.toFixed(n >= 10 ? 1 : 2)) + " " + u[i];
}

export function fmtNum(n: number) {
  return (n || 0).toLocaleString("zh-TW");
}
