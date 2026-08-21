"use client";

import { DragEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./label.module.css";
import { convertImage, DitherMode, LabelOptions, LabelResult, TransparencyMode } from "./label-engine";

const initialOptions: LabelOptions = { width: 120, colorCount: 8, dither: "atkinson", alphaThreshold: 80, transparency: "auto", transparentColorIndex: 0, columns: 1, rows: 1 };
const ditherModes: { id: DitherMode; title: string; note: string }[] = [
  { id: "none", title: "纯色块", note: "LOGO / 文字" }, { id: "bayer", title: "BAYER", note: "规则渐变" },
  { id: "atkinson", title: "ATKINSON", note: "像素与插画" }, { id: "floyd", title: "FLOYD", note: "照片细节" },
];
function rateComplexity(characters: number) { return characters > 500000 ? "极高：建议增加分片或降低颜色" : characters > 150000 ? "较高：请留意游戏性能" : characters > 50000 ? "中等" : "轻量"; }

export default function LabelPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null); const [fileName, setFileName] = useState("");
  const [options, setOptions] = useState(initialOptions); const [result, setResult] = useState<LabelResult | null>(null);
  const [widthInput, setWidthInput] = useState(String(initialOptions.width));
  const [dragging, setDragging] = useState(false); const [error, setError] = useState(""); const [copied, setCopied] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(0); const [hoveredSlice, setHoveredSlice] = useState<number | null>(null); const [zoom, setZoom] = useState(1); const [pan, setPan] = useState({ x: 0, y: 0 });
  const previewCanvas = useRef<HTMLCanvasElement>(null); const previewStage = useRef<HTMLDivElement>(null);
  const pointer = useRef({ active: false, id: 0, x: 0, y: 0, originX: 0, originY: 0, moved: false });

  useEffect(() => { if (!image) return; const timer = window.setTimeout(() => { try { setResult(convertImage(image, options)); setSelectedSlice(0); setError(""); } catch (problem) { setError(problem instanceof Error ? problem.message : "图片转换失败"); } }, 90); return () => window.clearTimeout(timer); }, [image, options]);
  useEffect(() => { if (!result || !previewCanvas.current) return; const canvas = previewCanvas.current; canvas.width = result.width; canvas.height = result.height; canvas.getContext("2d")?.drawImage(result.canvas, 0, 0); }, [result]);
  useEffect(() => {
    const stage = previewStage.current; if (!stage) return;
    const wheel = (event: WheelEvent) => { event.preventDefault(); const rect = stage.getBoundingClientRect(); const pointX = event.clientX - rect.left - rect.width / 2; const pointY = event.clientY - rect.top - rect.height / 2; setZoom((current) => { const next = Math.max(.1, Math.min(128, current * Math.exp(-event.deltaY * .0015))); const ratio = next / current; setPan((position) => ({ x: pointX - (pointX - position.x) * ratio, y: pointY - (pointY - position.y) * ratio })); return next; }); };
    stage.addEventListener("wheel", wheel, { passive: false }); return () => stage.removeEventListener("wheel", wheel);
  }, []);

  const slice = result?.slices[Math.min(selectedSlice, Math.max(0, result.slices.length - 1))];
  const totalCharacters = useMemo(() => result?.slices.reduce((sum, item) => sum + item.code.length, 0) ?? 0, [result]);
  const largestSlice = useMemo(() => result?.slices.reduce<LabelResult["slices"][number] | null>((largest, item) => !largest || item.code.length > largest.code.length ? item : largest, null) ?? null, [result]);
  const maxSliceCharacters = largestSlice?.code.length ?? 0;
  const selectedSliceCharacters = slice?.code.length ?? 0;
  const maxComplexity = rateComplexity(maxSliceCharacters);
  const selectedComplexity = rateComplexity(selectedSliceCharacters);

  function loadFile(file?: File) { if (!file) return; if (!file.type.startsWith("image/")) { setError("请选择 PNG、JPG、WEBP 等图片文件"); return; } const url = URL.createObjectURL(file); const next = new Image(); next.onload = () => { setImage(next); setFileName(file.name); setError(""); setZoom(1); setPan({ x: 0, y: 0 }); URL.revokeObjectURL(url); }; next.onerror = () => { setError("无法读取这张图片"); URL.revokeObjectURL(url); }; next.src = url; }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0]); }
  function setOption<K extends keyof LabelOptions>(key: K, value: LabelOptions[K]) { setOptions((current) => ({ ...current, [key]: value })); }
  function setWidthOption(width: number) { setWidthInput(String(width)); setOption("width", width); }
  function applyPreset(width: number, colorCount: number) { setWidthInput(String(width)); setOptions((current) => ({ ...current, width, colorCount })); }
  function changeWidthInput(value: string) {
    setWidthInput(value);
    const parsed = Number(value);
    if (value.trim() && Number.isFinite(parsed) && parsed >= 12 && parsed <= 500) setOption("width", Math.round(parsed));
  }
  function commitWidthInput() {
    const parsed = Number(widthInput);
    if (!widthInput.trim() || !Number.isFinite(parsed)) { setWidthInput(String(options.width)); return; }
    const width = Math.max(12, Math.min(500, Math.round(parsed)));
    setWidthOption(width);
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }
  async function copyCode() { if (!slice) return; await navigator.clipboard.writeText(slice.code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  function saveText(text: string, suffix: string) { const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${fileName.replace(/\.[^.]+$/, "") || "juno-label"}${suffix}.txt`; anchor.click(); URL.revokeObjectURL(url); }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) { if (!result) return; pointer.current = { active: true, id: event.pointerId, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }
  function sliceAt(clientX: number, clientY: number) { if (!previewCanvas.current || !result) return null; const rect = previewCanvas.current.getBoundingClientRect(); if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null; const column = Math.min(options.columns - 1, Math.floor((clientX - rect.left) / rect.width * options.columns)); const row = Math.min(options.rows - 1, Math.floor((clientY - rect.top) / rect.height * options.rows)); return row * options.columns + column; }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) { setHoveredSlice(sliceAt(event.clientX, event.clientY)); const state = pointer.current; if (!state.active || state.id !== event.pointerId) return; const dx = event.clientX - state.x; const dy = event.clientY - state.y; if (Math.hypot(dx, dy) > 4) state.moved = true; setPan({ x: state.originX + dx, y: state.originY + dy }); }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) { const state = pointer.current; if (!state.active || state.id !== event.pointerId) return; pointer.current.active = false; event.currentTarget.releasePointerCapture(event.pointerId); if (state.moved) return; const index = sliceAt(event.clientX, event.clientY); if (index !== null) setSelectedSlice(index); }

  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.back} href="/"><span aria-hidden="true">←</span> 返回工具站</Link><Link className={styles.brand} href="/">JUNO / TOOL STATION</Link><span className={styles.status}>LABEL 2.2 · LOCAL</span></header>
    <section className={styles.intro}><div><p className={styles.eyebrow}>TOOL 01 / IMAGE ENCODER</p><h1>图片转 Label</h1></div><p className={styles.introText}>使用游戏可正常读取的 2–10 色调色板输出。图片不会上传，所有转换均在本机浏览器完成。</p></section>
    <section className={styles.workspace}>
      <aside className={styles.panel}><div className={styles.panelTitle}><span>INPUT / PARAMETERS</span><strong>转换设置</strong></div><div className={styles.controls}>
        <label className={`${styles.upload} ${dragging ? styles.uploadActive : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><input className={styles.hiddenInput} type="file" accept="image/*" onChange={(event) => loadFile(event.target.files?.[0])} /><span className={styles.uploadIcon}>＋</span><strong>{fileName || "选择或拖入图片"}</strong><small>{fileName ? "点击可重新选择" : "支持 PNG / JPG / WEBP"}</small></label>
        <div className={styles.presets}>{[[80, 6, "轻量"], [160, 8, "均衡"], [300, 10, "细节"], [500, 10, "极限"]].map(([width, colors, name]) => <button type="button" key={name} onClick={() => applyPreset(Number(width), Number(colors))}>{name}</button>)}</div>
        <div className={styles.control}><div className={styles.controlHead}><span>输出宽度</span><span className={styles.value}>{options.width} px</span></div><div className={styles.numberRange}><input className={styles.range} type="range" min="12" max="500" value={options.width} onChange={(event) => setWidthOption(Number(event.target.value))} /><input className={styles.numberInput} type="number" inputMode="numeric" min="12" max="500" step="1" value={widthInput} onChange={(event) => changeWidthInput(event.target.value)} onBlur={commitWidthInput} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div></div>
        <div className={styles.control}><div className={styles.controlHead}><span>游戏调色板颜色</span><span className={styles.value}>{Math.min(10, options.colorCount)} / 10</span></div><input className={styles.range} type="range" min="2" max="10" value={Math.min(10, options.colorCount)} onChange={(event) => setOption("colorCount", Number(event.target.value))} /></div>
        <div className={styles.control}><div className={styles.controlHead}><span>像素算法</span></div><div className={styles.ditherGrid}>{ditherModes.map((mode) => <button type="button" key={mode.id} className={options.dither === mode.id ? styles.choiceActive : ""} onClick={() => setOption("dither", mode.id)}><strong>{mode.title}</strong><small>{mode.note}</small></button>)}</div></div>
        <div className={styles.control}><div className={styles.controlHead}><span>背景透明</span></div><div className={styles.modes}>{(["none", "auto", "color"] as TransparencyMode[]).map((mode) => <button className={`${styles.mode} ${options.transparency === mode ? styles.modeActive : ""}`} type="button" key={mode} onClick={() => setOption("transparency", mode)}>{mode === "none" ? "关闭" : mode === "auto" ? "自动" : "指定色"}</button>)}</div></div>
        <div className={styles.control}><div className={styles.controlHead}><span>Label 分片</span><span className={styles.value}>{options.columns} 列 × {options.rows} 行</span></div><div className={styles.splitChooser}><div><span>列数</span><div>{[1, 2, 3, 4].map((value) => <button type="button" key={`column-${value}`} className={options.columns === value ? styles.splitActive : ""} onClick={() => setOption("columns", value)}>{value}</button>)}</div></div><div><span>行数</span><div>{[1, 2, 3, 4].map((value) => <button type="button" key={`row-${value}`} className={options.rows === value ? styles.splitActive : ""} onClick={() => setOption("rows", value)}>{value}</button>)}</div></div></div></div>
        {result && <div className={styles.control}><div className={styles.controlHead}><span>识别颜色</span><span className={styles.value}>{result.uniqueColors.toLocaleString()} COLORS</span></div><div className={styles.palette}>{result.palette.map((color, index) => <button type="button" title={color} aria-label={color} key={`${color}-${index}`} onClick={() => setOption("transparentColorIndex", index)} className={`${styles.swatch} ${options.transparency === "color" && options.transparentColorIndex === index ? styles.swatchSelected : ""}`} style={{ backgroundColor: color }} />)}</div></div>}
        {error && <p className={styles.error}>{error}</p>}
      </div></aside>
      <section className={styles.panel}><div className={styles.panelTitle}><span>PIXEL PREVIEW</span><strong>实时预览 · 可放大查看细节</strong></div><div className={styles.previewBody}>
        <div ref={previewStage} className={styles.canvasStage} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerLeave={() => setHoveredSlice(null)} onPointerCancel={() => { pointer.current.active = false; setHoveredSlice(null); }}>
          {result ? <div className={styles.canvasTransform} style={{ width: `min(100%, ${Math.max(300, Math.min(result.width * 4, 900))}px)`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><canvas ref={previewCanvas} aria-label="转换后的像素预览" /><div className={styles.sliceGrid} style={{ gridTemplateColumns: `repeat(${options.columns}, 1fr)`, gridTemplateRows: `repeat(${options.rows}, 1fr)` }}>{result.slices.map((item, index) => <div className={`${styles.sliceCell} ${hoveredSlice === index ? styles.sliceCellHover : ""}`} key={`preview-${item.row}-${item.column}`}><span>R{item.row}C{item.column}</span></div>)}</div></div> : <p className={styles.placeholder}><span>AWAITING IMAGE</span>上传图片后，这里会实时显示转换结果。可滚轮缩放，放大后按住左键或单指拖动。</p>}
        </div>
        <div className={styles.zoomBar}><span>滚轮缩放 · 拖动平移</span><div><button type="button" onClick={() => setZoom((value) => Math.max(.1, value / 1.25))}>−</button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>{Math.round(zoom * 100)}%</button><button type="button" onClick={() => setZoom((value) => Math.min(128, value * 1.25))}>＋</button><button type="button" onClick={resetView}>适应</button></div></div>
        <div className={styles.stats}><div className={styles.stat}><span>SIZE</span><strong>{result ? `${result.width} × ${result.height}` : "—"}</strong></div><div className={styles.stat}><span>COLORS</span><strong>{result?.uniqueColors.toLocaleString() ?? "—"}</strong></div><div className={styles.stat}><span>PIXELS</span><strong>{result?.visiblePixels.toLocaleString() ?? "—"}</strong></div><div className={styles.stat}><span>CHARS TOTAL</span><strong>{totalCharacters ? totalCharacters.toLocaleString() : "—"}</strong></div></div>
        {result && <><div className={`${styles.complexityBar} ${maxSliceCharacters > 150000 ? styles.complexityHigh : ""}`}><span>MAX SLICE LOAD</span><strong>{maxComplexity}</strong><small>{largestSlice ? `最大分片 · R${largestSlice.row}C${largestSlice.column}：${maxSliceCharacters.toLocaleString()} 字符。` : "按最大单片评估。"}</small></div><div className={`${styles.complexityBar} ${styles.complexitySelected} ${selectedSliceCharacters > 150000 ? styles.complexityHigh : ""}`}><span>SELECTED SLICE</span><strong>{selectedComplexity}</strong><small>{slice ? `当前选中 · R${slice.row}C${slice.column}：${selectedSliceCharacters.toLocaleString()} 字符。` : "选择一个分片查看评级。"}</small></div></>}
      </div></section>
      <section className={`${styles.panel} ${styles.codePanel}`}><div className={styles.panelTitle}><span>LABEL RICH TEXT</span><strong>{slice ? `R${slice.row}C${slice.column} · ${slice.code.length.toLocaleString()} 字符` : "输出代码"}</strong></div><div className={styles.codeBody}>
        {result && result.slices.length > 1 && <div className={styles.sliceList} style={{ gridTemplateColumns: `repeat(${options.columns}, minmax(0, 1fr))` }}>{result.slices.map((item, index) => <button type="button" key={`${item.row}-${item.column}`} className={selectedSlice === index ? styles.sliceActive : ""} onClick={() => setSelectedSlice(index)}>R{item.row}C{item.column}<small>{item.width}×{item.height}</small></button>)}</div>}
        <textarea className={styles.textarea} readOnly spellCheck={false} value={slice?.code ?? "上传图片后自动生成 Label 代码…"} aria-label="Label 输出代码" />
        <div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} type="button" disabled={!slice} onClick={copyCode}>{copied ? "已复制" : "复制当前"}</button><button className={styles.button} type="button" disabled={!slice} onClick={() => slice && saveText(slice.code, `-R${slice.row}C${slice.column}`)}>导出当前</button><button className={styles.button} type="button" disabled={!result} onClick={() => result && saveText(result.slices.map((item) => `--- R${item.row}C${item.column} ---\n${item.code}`).join("\n\n"), "-all")}>导出全部</button></div>
      </div></section>
    </section>
    <div className={styles.licenseFooter}>
      <span>SOURCE LICENSE / NONCOMMERCIAL</span>
      <a href="https://polyformproject.org/licenses/noncommercial/1.0.0" target="_blank" rel="license noreferrer">PolyForm Noncommercial 1.0.0 ↗</a>
      <small>源码公开，禁止未经授权的商业使用</small>
    </div>
  </main>;
}
