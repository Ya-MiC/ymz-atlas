'use strict';
/**
 * 樹圖引擎（零依賴）
 * - Squarified treemap 演算法（Bruls, Huizing & van Wijk）
 * - 巢狀佈局：父矩形切分給子節點
 */
(function (global) {
  const worstRatio = (row, w, total) => {
    const sum = row.reduce((a, r) => a + r.size, 0);
    if (sum <= 0) return Infinity;
    const s2 = sum * sum;
    const w2 = w * w;
    let max = -Infinity;
    let min = Infinity;
    for (const r of row) {
      max = Math.max(max, r.size);
      min = Math.min(min, r.size);
    }
    return Math.max((w2 * max) / s2, s2 / (w2 * min));
  };

  /** 把 items 切成 squarified 的列 */
  function squarify(items, rect, out) {
    if (!items.length) return;
    const total = items.reduce((a, b) => a + b.size, 0);
    if (total <= 0) return;

    let itemsSorted = items.slice().sort((a, b) => b.size - a.size);
    let free = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    let row = [];

    while (itemsSorted.length) {
      const item = itemsSorted[0];
      const nextRow = row.concat([item]);
      const short = Math.min(free.w, free.h);
      const w = row.length ? worstRatio(row, short, total) : Infinity;
      const wn = worstRatio(nextRow, short, total);
      if (row.length === 0 || wn <= w) {
        row = nextRow;
        itemsSorted.shift();
      } else {
        layoutRow(row, free, out);
        row = [];
      }
    }
    if (row.length) layoutRow(row, free, out);
  }

  /** 將一列排版到 free 矩形中 */
  function layoutRow(row, free, out) {
    const sum = row.reduce((a, r) => a + r.size, 0);
    if (sum <= 0) return;
    const horizontal = free.w >= free.h;
    const total = horizontal ? free.h : free.w;
    let offset = 0;
    for (const r of row) {
      const frac = r.size / sum;
      const thickness = frac * total;
      let rect;
      if (horizontal) {
        rect = { x: free.x, y: free.y + offset, w: thickness, h: free.h };
      } else {
        rect = { x: free.x + offset, y: free.y, w: free.w, h: thickness };
      }
      out.push({ item: r, rect });
      offset += thickness;
    }
    // 扣除已用掉的區域
    if (horizontal) {
      free.x += total;
      free.w -= total;
    } else {
      free.y += total;
      free.h -= total;
    }
  }

  /**
   * 對一棵巢狀樹做 treemap 佈局
   * @param {object} root 巢狀樹節點 { id, name, size, isDir, children }
   * @param {object} bounds { x, y, w, h }
   * @param {object} opts  { maxDepth, sort }
   * @returns {Array} 扁平化後的 { node, rect, depth }
   */
  function layout(root, bounds, opts = {}) {
    const maxDepth = opts.maxDepth ?? 99;
    const sort = opts.sort || 'size';
    const result = [];

    const sortFn = (a, b) => {
      switch (sort) {
        case 'name':
          return String(a.name).localeCompare(String(b.name), 'zh-Hant');
        case 'mtime':
          return (b.mtime || 0) - (a.mtime || 0);
        case 'files':
          return (b.files || 0) - (a.files || 0);
        default:
          return (b.size || 0) - (a.size || 0);
      }
    };

    function recurse(node, rect, depth) {
      const padded = inset(rect, depth === 0 ? 0 : 2);
      if (padded.w <= 1 || padded.h <= 1) return;
      result.push({ node, rect: padded, depth });

      if (!node.children || !node.children.length || depth >= maxDepth) return;

      // 只有含內容的子節點才佔空間
      const kids = node.children
        .filter((c) => (c.size || 0) > 0)
        .sort(sortFn);
      if (!kids.length) return;

      // 留一點 padding 給標籤
      const inner = inset(padded, 1);
      const placed = [];
      squarify(kids, inner, placed);

      for (const { item, rect: r } of placed) {
        if (r.w < 1.5 || r.h < 1.5) continue;
        recurse(item, r, depth + 1);
      }
    }

    recurse(root, bounds, 0);
    return result;
  }

  function inset(rect, amount) {
    if (!amount) return { ...rect };
    return {
      x: rect.x + amount,
      y: rect.y + amount,
      w: Math.max(0, rect.w - amount * 2),
      h: Math.max(0, rect.h - amount * 2),
    };
  }

  /** 產生麵包屑路徑 */
  function crumbs(node, root) {
    const path = [];
    let cur = node;
    while (cur) {
      path.unshift(cur);
      cur = cur.__parent;
    }
    return path;
  }

  global.TreeMap = { layout, squarify, crumbs };
})(window);
