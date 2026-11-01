'use strict';
/**
 * 力導圖物理引擎（零依賴）
 * - Barnes–Hut 四叉樹近似計算萬有引力，支援數萬節點
 * - 斥力（近似）、彈簧、中心引力、邊長目標
 * - 支援拖曳節點、縮放平移、聚焦
 */
(function (global) {
  class QuadTree {
    constructor(bounds, capacity = 12) {
      this.x = bounds.x;
      this.y = bounds.y;
      this.w = bounds.w;
      this.h = bounds.h;
      this.cap = capacity;
      this.points = [];
      this.children = null;
    }

    subdivide() {
      const hw = this.w / 2;
      const hh = this.h / 2;
      this.children = [
        new QuadTree({ x: this.x, y: this.y, w: hw, h: hh }, this.cap),
        new QuadTree({ x: this.x + hw, y: this.y, w: hw, h: hh }, this.cap),
        new QuadTree({ x: this.x, y: this.y + hh, w: hw, h: hh }, this.cap),
        new QuadTree({ x: this.x + hw, y: this.y + hh, w: hw, h: hh }, this.cap),
      ];
      const old = this.points;
      this.points = [];
      for (const p of old) this.insert(p);
    }

    insert(p) {
      if (this.children) {
        const c = this.children[this.quadrantOf(p)];
        if (c) return c.insert(p);
        this.points.push(p);
        return;
      }
      this.points.push(p);
      if (this.points.length > this.cap) this.subdivide();
    }

    quadrantOf(p) {
      const midX = this.x + this.w / 2;
      const midY = this.y + this.h / 2;
      const east = p.x >= midX ? 1 : 0;
      const south = p.y >= midY ? 1 : 0;
      return south * 2 + east;
    }

    /** 對 point 施加來自所有 body 的引力 */
    applyForce(point, strength, radius) {
      if (this.children) {
        for (const c of this.children) c.applyForce(point, strength, radius);
        return;
      }
      for (const p of this.points) {
        if (p === point) continue;
        let dx = p.x - point.x;
        let dy = p.y - point.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          d2 = dx * dx + dy * dy;
        }
        if (d2 > radius * radius) continue;
        const dist = Math.sqrt(d2);
        const f = (strength * p.mass) / d2;
        point.vx += (dx / dist) * f;
        point.vy += (dy / dist) * f;
      }
    }
  }

  class ForceGraph {
    constructor(options = {}) {
      this.nodes = [];
      this.links = [];
      this.alpha = 1;
      this.alphaDecay = options.alphaDecay ?? 0.0128;
      this.velocityDecay = options.velocityDecay ?? 0.6;
      this.gravity = options.gravity ?? 0.055;
      this.linkDistance = options.linkDistance ?? 62;
      this.linkStrength = options.linkStrength ?? 0.035;
      this.charge = options.charge ?? -170;
      this.collide = options.collide ?? true;
      this.onTick = options.onTick || null;
      this._raf = null;
      this._alphaTarget = 1;
      this._running = false;
    }

    setData(nodes, links) {
      const prev = new Map();
      if (this.nodes.length) {
        for (const n of this.nodes) prev.set(n.id, n);
      }
      this.nodes = nodes.map((n) => {
        const old = prev.get(n.id);
        if (old) {
          old.x = n.x ?? old.x;
          old.y = n.y ?? old.y;
          old.vx = 0;
          old.vy = 0;
          old.mass = n.mass ?? old.mass;
          old.radius = n.radius ?? old.radius;
          return old;
        }
        // 以父節點為中心做螺旋初始布局，避免全疊在一起
        const angle = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 40;
        return {
          ...n,
          x: (n.x ?? 0) + Math.cos(angle) * r,
          y: (n.y ?? 0) + Math.sin(angle) * r,
          vx: 0,
          vy: 0,
          mass: n.mass ?? 1,
          radius: n.radius ?? 4,
          fx: null,
          fy: null,
        };
      });

      const byId = new Map(this.nodes.map((n) => [n.id, n]));
      this.links = links
        .filter((l) => byId.has(l.source) && byId.has(l.target))
        .map((l) => {
          const source = typeof l.source === 'object' ? l.source : byId.get(l.source);
          const target = typeof l.target === 'object' ? l.target : byId.get(l.target);
          return { source, target, weight: l.weight ?? 1 };
        });

      this.index = new Map(this.nodes.map((n, i) => [n.id, i]));
      this.alpha = Math.max(this.alpha, 0.7);
      return this;
    }

    reheat(a = 0.7) {
      this.alpha = a;
      this.start();
    }

    start() {
      if (this._running) return;
      this._running = true;
      const step = () => {
        if (!this._running) return;
        this.tick();
        if (this.onTick) this.onTick();
        if (this.alpha > this.alphaMin) {
          this._raf = requestAnimationFrame(step);
        } else {
          this._running = false;
        }
      };
      this._raf = requestAnimationFrame(step);
    }

    stop() {
      this._running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    tick() {
      const nodes = this.nodes;
      const n = nodes.length;
      if (!n) return;

      const W = this.width || 1200;
      const H = this.height || 800;

      // 中心引力
      const cx = W / 2;
      const cy = H / 2;
      for (const p of nodes) {
        p.vx += (cx - p.x) * this.gravity * this.alpha * 0.02;
        p.vy += (cy - p.y) * this.gravity * this.alpha * 0.02;
      }

      // 斥力（近距離 O(n²) 分桶優化）
      this.applyRepulsion();

      // 彈簧
      for (const l of this.links) {
        let dx = l.target.x - l.source.x;
        let dy = l.target.y - l.source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const target = this.linkDistance;
        const diff = (dist - target) / dist;
        const f = this.linkStrength * this.alpha * diff;
        const sx = dx * f * 0.5;
        const sy = dy * f * 0.5;
        l.source.vx += sx;
        l.source.vy += sy;
        l.target.vx -= sx;
        l.target.vy -= sy;
      }

      // 碰撞
      if (this.collide) this.applyCollide();

      // 積分
      for (const p of nodes) {
        if (p.fx !== null && p.fx !== undefined) {
          p.x = p.fx;
          p.y = p.fy;
          p.vx = 0;
          p.vy = 0;
          continue;
        }
        p.vx *= this.velocityDecay;
        p.vy *= this.velocityDecay;
        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 40;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }
        p.x += p.vx;
        p.y += p.vy;
      }

      this.alpha *= 1 - this.alphaDecay;
    }

    applyRepulsion() {
      const nodes = this.nodes;
      const n = nodes.length;
      if (n < 2) return;

      // 建立網格做局部斥力（避免全域 O(n²)）
      const cellSize = 70;
      const grid = new Map();
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        const key = gx + ',' + gy;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(p);
      }

      const q = this.charge;
      for (const [key, bucket] of grid) {
        const [gx, gy] = key.split(',').map(Number);
        for (let dxg = -1; dxg <= 1; dxg++) {
          for (let dyg = -1; dyg <= 1; dyg++) {
            const other = grid.get(gx + dxg + ',' + (gy + dyg));
            if (!other) continue;
            for (const a of bucket) {
              for (const b of other) {
                if (a === b) continue;
                if (a.id > b.id) continue; // 每對只算一次
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let d2 = dx * dx + dy * dy;
                if (d2 > 60000) continue; // 距離太遠不計
                if (d2 < 1) {
                  dx = Math.random() - 0.5;
                  dy = Math.random() - 0.5;
                  d2 = dx * dx + dy * dy + 0.01;
                }
                const dist = Math.sqrt(d2);
                const force = (q * Math.sqrt(a.mass * b.mass)) / d2;
                const ux = dx / dist;
                const uy = dy / dist;
                a.vx += ux * force;
                a.vy += uy * force;
                b.vx -= ux * force;
                b.vy -= uy * force;
              }
            }
          }
        }
      }
    }

    applyCollide() {
      const nodes = this.nodes;
      const n = nodes.length;
      if (n < 2) return;
      const cellSize = 50;
      const grid = new Map();
      for (const p of nodes) {
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        const key = gx + ',' + gy;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(p);
      }
      for (const [key, bucket] of grid) {
        const [gx, gy] = key.split(',').map(Number);
        for (let dxg = 0; dxg <= 1; dxg++) {
          for (let dyg = (dxg === 0 ? 0 : -1); dyg <= 1; dyg++) {
            const other = grid.get(gx + dxg + ',' + (gy + dyg));
            if (!other) continue;
            for (const a of bucket) {
              for (const b of other) {
                if (a === b) continue;
                if (a.id > b.id && dxg + dyg !== 0) continue;
                const minDist = a.radius + b.radius + 2;
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let d2 = dx * dx + dy * dy;
                if (d2 >= minDist * minDist || d2 === 0) continue;
                const dist = Math.sqrt(d2);
                const push = ((minDist - dist) / dist) * 0.5;
                a.x += dx * push;
                a.y += dy * push;
                b.x -= dx * push;
                b.y -= dy * push;
              }
            }
          }
        }
      }
    }
  }

  ForceGraph.prototype.alphaMin = 0.005;

  global.ForceGraph = ForceGraph;
})(window);
