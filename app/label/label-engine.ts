export type TransparencyMode = "none" | "auto" | "color";
export type DitherMode = "none" | "bayer" | "atkinson" | "floyd";

export interface LabelOptions {
  width: number; colorCount: number; dither: DitherMode;
  alphaThreshold: number; transparency: TransparencyMode; transparentColorIndex: number; columns: number; rows: number;
}
export interface LabelSlice { code: string; row: number; column: number; width: number; height: number; }
export interface LabelResult { canvas: HTMLCanvasElement; palette: string[]; code: string; slices: LabelSlice[]; width: number; height: number; visiblePixels: number; uniqueColors: number; }

type RGB = [number, number, number];
type Box = { colors: RGB[] };
const GAME_COLOR_IDS = Array.from({ length: 10 }, (_, index) => { const value = (index + 15).toString(16).padStart(2, "0").toUpperCase(); return `#${value}${value}${value}`; });
const BAYER_4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const keyOf = (rgb: RGB) => `${rgb[0]},${rgb[1]},${rgb[2]}`;
const toHex = (rgb: RGB) => `#${rgb.map((part) => clamp(part).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const distance = (a: RGB, b: RGB) => { const rMean = (a[0] + b[0]) / 2; const dr = a[0] - b[0]; const dg = a[1] - b[1]; const db = a[2] - b[2]; return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db); };

function nearest(target: RGB, palette: RGB[]) { let best = palette[0]; let score = Number.POSITIVE_INFINITY; for (const color of palette) { const next = distance(target, color); if (next < score) { score = next; best = color; } } return best; }
function average(colors: RGB[]): RGB { if (!colors.length) return [0, 0, 0]; const sum = colors.reduce((acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]] as RGB, [0, 0, 0] as RGB); return [clamp(sum[0] / colors.length), clamp(sum[1] / colors.length), clamp(sum[2] / colors.length)]; }

function medianCut(pixels: RGB[], wanted: number) {
  const sample = pixels.length > 50000 ? pixels.filter((_, index) => index % Math.ceil(pixels.length / 50000) === 0) : pixels;
  const boxes: Box[] = [{ colors: sample }];
  while (boxes.length < wanted) {
    let selected = -1; let selectedRange = -1; let channel = 0;
    boxes.forEach((box, index) => {
      if (box.colors.length < 2) return;
      const ranges = [0, 1, 2].map((part) => Math.max(...box.colors.map((color) => color[part])) - Math.min(...box.colors.map((color) => color[part])));
      const range = Math.max(...ranges); if (range > selectedRange) { selected = index; selectedRange = range; channel = ranges.indexOf(range); }
    });
    if (selected < 0) break;
    const colors = boxes[selected].colors.sort((a, b) => a[channel] - b[channel]); const middle = Math.ceil(colors.length / 2);
    boxes.splice(selected, 1, { colors: colors.slice(0, middle) }, { colors: colors.slice(middle) });
  }
  return boxes.map((box) => average(box.colors));
}

function floodTransparent(data: Uint8ClampedArray, width: number, height: number) {
  const starts: [number, number][] = [];
  for (let x = 0; x < width; x += 1) starts.push([x, 0], [x, height - 1]);
  for (let y = 1; y < height - 1; y += 1) starts.push([0, y], [width - 1, y]);
  const visited = new Uint8Array(width * height);
  for (const [sx, sy] of starts) {
    const start = (sx + sy * width) * 4; if (visited[sx + sy * width] || data[start + 3] === 0) continue;
    const target: RGB = [data[start], data[start + 1], data[start + 2]]; const stack: [number, number][] = [[sx, sy]];
    while (stack.length) {
      const point = stack.pop(); if (!point) break; const [x, y] = point;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const pixel = x + y * width; if (visited[pixel]) continue; visited[pixel] = 1; const offset = pixel * 4;
      if (data[offset + 3] === 0 || distance([data[offset], data[offset + 1], data[offset + 2]], target) > 18) continue;
      data[offset + 3] = 0; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
}

function processPixels(data: Uint8ClampedArray, width: number, height: number, palette: RGB[], options: LabelOptions) {
  const work = new Float32Array(data.length); for (let i = 0; i < data.length; i += 1) work[i] = data[i];
  const errors = options.dither === "floyd" ? [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]] : [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (x + y * width) * 4; if (data[offset + 3] === 0) continue;
    let source: RGB = [clamp(work[offset]), clamp(work[offset + 1]), clamp(work[offset + 2])];
    if (options.dither === "bayer") { const shift = (BAYER_4[y % 4][x % 4] - 7.5) * 5; source = source.map((part) => clamp(part + shift)) as RGB; }
    const output = nearest(source, palette);
    data[offset] = output[0]; data[offset + 1] = output[1]; data[offset + 2] = output[2];
    if (options.dither !== "atkinson" && options.dither !== "floyd") continue;
    const error: RGB = [source[0] - output[0], source[1] - output[1], source[2] - output[2]];
    for (const [dx, dy, weight] of errors) { const nx = x + dx; const ny = y + dy; if (nx < 0 || nx >= width || ny >= height) continue; const next = (nx + ny * width) * 4; for (let part = 0; part < 3; part += 1) work[next + part] += error[part] * weight; }
  }
}

function compressSpaces(value: string) { return value.replace(/ {12,}/g, (spaces) => `<space=${(spaces.length * 0.2).toFixed(1).replace(/\.0$/, "")}>`); }
function encodeRegion(data: Uint8ClampedArray, imageWidth: number, x0: number, y0: number, x1: number, y1: number, palette: RGB[]) {
  let result = "<mspace=0.2><line-height=0.2><size=0.65>"; let lastColor = "";
  for (let y = y0; y < y1; y += 1) {
    if (y > y0) result += "<br>"; let line = "";
    for (let x = x0; x < x1; x += 1) {
      const offset = (x + y * imageWidth) * 4;
      if (data[offset + 3] === 0) { line += " "; lastColor = ""; continue; }
      const current: RGB = [data[offset], data[offset + 1], data[offset + 2]]; const key = keyOf(current);
      if (key !== lastColor) { const index = Math.max(0, palette.findIndex((color) => keyOf(color) === key)); line += `<${GAME_COLOR_IDS[index]}>`; lastColor = key; }
      line += ".";
    }
    result += compressSpaces(line.replace(/\s+$/, ""));
  }
  return result;
}

export function convertImage(image: HTMLImageElement, options: LabelOptions): LabelResult {
  const width = Math.max(12, Math.min(500, Math.round(options.width))); const height = Math.max(1, Math.round((width / image.naturalWidth) * image.naturalHeight));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("当前浏览器无法创建图像画布");
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high"; context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height); const data = imageData.data;
  for (let offset = 0; offset < data.length; offset += 4) data[offset + 3] = data[offset + 3] < options.alphaThreshold ? 0 : 255;
  if (options.transparency === "auto") floodTransparent(data, width, height);
  const pixels: RGB[] = []; for (let offset = 0; offset < data.length; offset += 4) if (data[offset + 3]) pixels.push([data[offset], data[offset + 1], data[offset + 2]]);
  const wanted = Math.max(2, Math.min(10, options.colorCount));
  const palette = medianCut(pixels, wanted); if (!palette.length) palette.push([0, 0, 0]);
  processPixels(data, width, height, palette, options);
  if (options.transparency === "color" && palette.length) { const transparent = palette[Math.min(options.transparentColorIndex, palette.length - 1)]; for (let offset = 0; offset < data.length; offset += 4) if (keyOf([data[offset], data[offset + 1], data[offset + 2]]) === keyOf(transparent)) data[offset + 3] = 0; }
  context.putImageData(imageData, 0, 0);
  const colors = new Set<string>(); let visiblePixels = 0; for (let offset = 0; offset < data.length; offset += 4) if (data[offset + 3]) { visiblePixels += 1; colors.add(keyOf([data[offset], data[offset + 1], data[offset + 2]])); }
  const columns = Math.max(1, Math.min(4, Math.round(options.columns))); const rows = Math.max(1, Math.min(4, Math.round(options.rows))); const slices: LabelSlice[] = [];
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) { const x0 = Math.floor(width * column / columns); const x1 = Math.floor(width * (column + 1) / columns); const y0 = Math.floor(height * row / rows); const y1 = Math.floor(height * (row + 1) / rows); slices.push({ row: row + 1, column: column + 1, width: x1 - x0, height: y1 - y0, code: encodeRegion(data, width, x0, y0, x1, y1, palette) }); }
  const visiblePalette = palette.map(toHex);
  return { canvas, palette: visiblePalette, code: slices.map((slice) => slice.code).join("\n\n"), slices, width, height, visiblePixels, uniqueColors: colors.size };
}
