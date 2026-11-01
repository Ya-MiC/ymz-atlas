'use strict';
/**
 * 等高線 + flomo 式日曆熱力
 * - 從樹節點 mtime 建密度場 → marching squares 畫等高線
 * - 從 activity.byDay / memos 建日曆熱力格子
 */
(function (global) {
  function dayKey(ms) {
    if (!ms) return null;
    const d = new Date(ms);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 掃描樹 → 每日活動 */
  function activityFromTrees(trees) {
    const byDay = Object.create(null);
    function walk(n) {
      if (!n) return;
      if (!n.isDir && n.mtime) {
        const k = dayKey(n.mtime);
        if (k) {
          if (!byDay[k]) byDay[k] = { files: 0, bytes: 0, memos: 0 };
          byDay[k].files++;
          byDay[k].bytes += n.size || 0;
        }
      }
      if (n.children) for (const c of n.children) walk(c);
    }
    for (const t of trees || []) walk(t.root);
    return byDay;
  }

  function mergeMemoActivity(byDay, memos) {
    for (const m of memos || []) {
      const k = dayKey(m.createdAt || m.updatedAt);
      if (!k) continue;
      if (!byDay[k]) byDay[k] = { files: 0, bytes: 0, memos: 0 };
      byDay[k].memos++;
    }
    return byDay;
  }

  /** 建日曆熱力序列（含空日） */
  function heatmapSeries(byDay, daysBack = 120) {
    const out = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime());
      const v = byDay[k] || { files: 0, bytes: 0, memos: 0 };
      out.push({
        day: k,
        value: v.files + v.memos * 3,
        files: v.files,
        memos: v.memos,
        bytes: v.bytes,
      });
    }
    return out;
  }

  /**
   * 把目錄投影到 2D 密度網格
   * x = 深度方向展開的兄弟序；y = log(size)
   */
  function densityGrid(trees, cols = 64, rows = 48) {
    const points = [];
    function walk(n, depth, siblingIndex, siblingCount) {
      if (!n) return;
      const xNorm = siblingCount <= 1
        ? 0.5
        : (siblingIndex + 0.5) / siblingCount;
      // 把深度也混進 x，避免全部擠中間
      const x = (depth * 0.12 + xNorm * 0.88);
      const y = Math.min(1, Math.log10((n.size || 1) + 1) / 12);
      const w = Math.max(0.2, Math.log10((n.files || 1) + 1));
      points.push({ x, y, w, mtime: n.mtime || 0, name: n.name, id: n.id });
      if (n.children && n.children.length) {
        const kids = n.children.filter((c) => c.isDir || (c.size || 0) > 0);
        kids.forEach((c, i) => walk(c, depth + 1, i, kids.length));
      }
    }
    for (const t of trees || []) walk(t.root, 0, 0, 1);

    const grid = Array.from({ length: rows }, () => new Float32Array(cols));
    const sigma = 0.045;
    const twoSigma2 = 2 * sigma * sigma;
    for (const p of points) {
      const cx = p.x * (cols - 1);
      const cy = (1 - p.y) * (rows - 1);
      const r = Math.ceil(sigma * Math.max(cols, rows) * 3);
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(cols - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(rows - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = (x - cx) / cols;
          const dy = (y - cy) / rows;
          const g = Math.exp(-(dx * dx + dy * dy) / twoSigma2);
          grid[y][x] += p.w * g;
        }
      }
    }
    // 正規化
    let max = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) max = Math.max(max, grid[y][x]);
    if (max > 0) {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) grid[y][x] /= max;
    }
    return { grid, cols, rows, points };
  }

  /** Marching Squares → 等高線折線 */
  function contours(gridObj, levels) {
    const { grid, cols, rows } = gridObj;
    const lines = [];
    const edge = (x, y, a, b, va, vb, level) => {
      if (va === vb) return [(x + a) / 2, (y + b) / 2];
      const t = (level - va) / (vb - va);
      return [x + a + (b === a ? t : 0) * 0 + (a !== b && false), 0]; // placeholder overwritten below
    };
    // 簡化：每格四角，用線性插值找邊交點
    function lerp(v0, v1, level) {
      if (Math.abs(v1 - v0) < 1e-9) return 0.5;
      return (level - v0) / (v1 - v0);
    }

    for (const level of levels) {
      const segs = [];
      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const v00 = grid[y][x];
          const v10 = grid[y][x + 1];
          const v01 = grid[y + 1][x];
          const v11 = grid[y + 1][x + 1];
          const b0 = v00 >= level ? 1 : 0;
          const b1 = v10 >= level ? 2 : 0;
          const b2 = v11 >= level ? 4 : 0;
          const b3 = v01 >= level ? 8 : 0;
          const idx = b0 | b1 | b2 | b3;
          if (idx === 0 || idx === 15) continue;

          const top = [x + lerp(v00, v10, level), y];
          const right = [x + 1, y + lerp(v10, v11, level)];
          const bottom = [x + lerp(v01, v11, level), y + 1];
          const left = [x, y + lerp(v00, v01, level)];

          // 經典 16 案例（鞍點取較簡邊）
          const cases = {
            1: [left, top], 2: [top, right], 3: [left, right],
            4: [right, bottom], 5: [left, top, right, bottom],
            6: [top, bottom], 7: [left, bottom],
            8: [bottom, left], 9: [top, bottom],
            10: [top, right, bottom, left], 11: [right, bottom],
            12: [right, left], 13: [top, right], 14: [top, left],
          };
          const pts = cases[idx];
          if (!pts) continue;
          for (let i = 0; i < pts.length; i += 2) {
            segs.push([pts[i], pts[i + 1]]);
          }
        }
      }
      lines.push({ level, segs });
    }
    return lines;
  }

  /** 在 canvas 上畫等高線地形 + 可選熱力色帶 */
  function drawContour(ctx, gridObj, lines, width, height, opts = {}) {
    const { grid, cols, rows } = gridObj;
    const pad = opts.pad || 16;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const ink = opts.ink || '#E2E4ED';
    const accent = opts.accent || '#9FA98F';
    const bg = opts.bg || '#191C29';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 填色場
    const img = ctx.createImageData(cols, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = grid[y][x];
        const i = (y * cols + x) * 4;
        // accent → ink 混合
        const a = Math.floor(40 + v * 180);
        img.data[i] = mixHex(bg, accent, v).r;
        img.data[i + 1] = mixHex(bg, accent, v).g;
        img.data[i + 2] = mixHex(bg, accent, v).b;
        img.data[i + 3] = a;
      }
    }
    // 放大到畫布
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, pad, pad, w, h);

    // 等高線
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.55;
    for (const band of lines) {
      ctx.beginPath();
      for (const [a, b] of band.segs) {
        const ax = pad + (a[0] / (cols - 1)) * w;
        const ay = pad + (a[1] / (rows - 1)) * h;
        const bx = pad + (b[0] / (cols - 1)) * w;
        const by = pad + (b[1] / (rows - 1)) * h;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function mixHex(a, b, t) {
    const pa = parse(a);
    const pb = parse(b);
    return {
      r: Math.round(pa.r + (pb.r - pa.r) * t),
      g: Math.round(pa.g + (pb.g - pa.g) * t),
      b: Math.round(pa.b + (pb.b - pa.b) * t),
    };
  }
  function parse(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16) || 0,
      g: parseInt(full.slice(2, 4), 16) || 0,
      b: parseInt(full.slice(4, 6), 16) || 0,
    };
  }

  /** 畫 flomo 式日曆熱力 */
  function drawHeatmap(ctx, series, width, height, opts = {}) {
    const pad = 12;
    const cell = Math.max(8, Math.min(14, Math.floor((width - pad * 2) / 32)));
    const gap = 3;
    const accent = opts.accent || '#9FA98F';
    const bg = opts.surface || '#1E3029';
    const ink = opts.ink || '#E2E4ED';
    const max = Math.max(1, ...series.map((s) => s.value));

    ctx.fillStyle = opts.bg || '#191C29';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = ink;
    ctx.font = '11px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText('活動等高 · 日曆熱力（檔案變更 + 筆記）', pad, 14);

    const startY = 28;
    // 依星期排成 7 列
    let col = 0;
    let row = new Date(series[0].day + 'T00:00:00').getDay();
    for (const s of series) {
      const x = pad + col * (cell + gap);
      const y = startY + row * (cell + gap);
      const t = s.value / max;
      const c = mixHex(bg, accent, 0.15 + t * 0.85);
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      roundRect(ctx, x, y, cell, cell, 2);
      ctx.fill();
      row++;
      if (row > 6) { row = 0; col++; }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  global.Contour = {
    activityFromTrees,
    mergeMemoActivity,
    heatmapSeries,
    densityGrid,
    contours,
    drawContour,
    drawHeatmap,
    dayKey,
  };
})(window);
