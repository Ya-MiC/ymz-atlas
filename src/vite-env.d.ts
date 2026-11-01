/// <reference types="vite/client" />

interface ForceGraphOptions {
  charge?: number;
  linkDistance?: number;
  linkStrength?: number;
  gravity?: number;
  alphaDecay?: number;
  onTick?: () => void;
}

declare class ForceGraph {
  nodes: any[];
  links: any[];
  width: number;
  height: number;
  onTick: (() => void) | null;
  constructor(options?: ForceGraphOptions);
  setData(nodes: any[], links: any[]): this;
  reheat(a?: number): void;
  start(): void;
  stop(): void;
}

declare const TreeMap: {
  layout(
    root: any,
    bounds: { x: number; y: number; w: number; h: number },
    opts?: { maxDepth?: number; sort?: string }
  ): Array<{ node: any; rect: { x: number; y: number; w: number; h: number }; depth: number }>;
};

declare const Contour: {
  activityFromTrees(trees: any[]): Record<string, any>;
  mergeMemoActivity(byDay: Record<string, any>, memos: any[]): Record<string, any>;
  heatmapSeries(byDay: Record<string, any>, daysBack?: number): any[];
  densityGrid(trees: any[], cols?: number, rows?: number): any;
  contours(grid: any, levels: number[]): any[];
  drawContour(ctx: CanvasRenderingContext2D, grid: any, lines: any[], w: number, h: number, opts?: any): void;
  drawHeatmap(ctx: CanvasRenderingContext2D, series: any[], w: number, h: number, opts?: any): void;
};

interface Window {
  ForceGraph: typeof ForceGraph;
  TreeMap: typeof TreeMap;
  Contour: typeof Contour;
}
