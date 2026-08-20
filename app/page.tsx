"use client";

import { useEffect, useState } from "react";

const tools = [
  { code: "LBL", title: "图片转 Label", description: "将图像量化、压缩并转换为 Juno Label 可用的富文本代码。", meta: "像素量化 / 调色板 / 代码压缩", status: "立即使用", accent: "cyan", href: "/label" },
  { code: "DV", title: "Δv 计算器", description: "按级计算质量比、比冲、推重比与整船速度增量。", meta: "多级火箭 / 发动机库 / 单位换算", status: "计划中", accent: "amber" },
  { code: "ORB", title: "轨道规划", description: "可视化规划转移轨道、节点机动和星际任务窗口。", meta: "3D 轨道 / 霍曼转移 / 机动节点", status: "计划中", accent: "violet" },
  { code: "MFD", title: "MFD 设计器", description: "拖拽编排仪表、文本与图形，生成可复用的显示页面。", meta: "实时预览 / 图层 / 模板导出", status: "计划中", accent: "lime" },
];

const milestones = [
  { number: "01", name: "工具站框架", phase: "已完成", status: "ONLINE", description: "统一承载 Juno 工具的网页工作台，提供响应式界面、本地文件处理和模块化工具入口。", features: ["统一视觉与导航", "桌面和移动端适配", "本地优先的数据处理"] },
  { number: "02", name: "Label 转换器 2.2", phase: "当前", status: "ONLINE", description: "把图片转换为 Juno Label 富文本像素代码，使用游戏可正常读取并可在载具中换色的 2–10 色调色板。", features: ["四种量化与抖动算法", "最多 4 × 4 自定义分片", "预览缩放、拖动和独立导出"], href: "/label" },
  { number: "03", name: "飞船解析与 Δv", phase: "下一步", status: "PLANNED", description: "读取飞船文件，重建零件结构并计算质量、分级、推重比和速度增量。", features: ["飞船 XML 本地解析", "程序化三维结构预览", "分级 Δv 与性能分析"] },
  { number: "04", name: "轨道规划与 MFD", phase: "远期", status: "PLANNED", description: "把飞船性能继续带入轨道任务规划，并提供可视化 MFD 页面设计与导出能力。", features: ["轨道与机动节点规划", "任务窗口计算", "MFD 图层与模板系统"] },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  const [selectedMilestone, setSelectedMilestone] = useState<(typeof milestones)[number] | null>(null);

  useEffect(() => {
    if (!selectedMilestone) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedMilestone(null); };
    document.addEventListener("keydown", close);
    document.body.classList.add("modal-open");
    return () => { document.removeEventListener("keydown", close); document.body.classList.remove("modal-open"); };
  }, [selectedMilestone]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Juno Tool 首页">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-type"><strong>JUNO</strong><small>TOOL STATION</small></span>
        </a>
        <nav className="main-nav" aria-label="主导航">
          <a href="#tools">工具</a><a href="#roadmap">路线</a><a href="#about">关于</a><a href="https://juno.foxbridge.team" target="_blank" rel="noreferrer">教程站</a>
        </nav>
        <div className="header-status"><span className="status-dot" /><span>PUBLIC ALPHA</span></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>MISSION UTILITY / 001</span></p>
          <h1>为朱诺：新起源<br /><em>建立任务工具链</em></h1>
          <p className="hero-lead">从一张图到一个 Label，从一次点火到一条星际轨道。把分散的计算、设计与文件分析，收进同一个工作台。</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#tools">探索工具 <ArrowIcon /></a>
            <a className="button button-ghost" href="#roadmap">查看开发路线</a>
          </div>
          <div className="coordinate-line" aria-label="站点信息">
            <span>TOOL.JUNO.FOXBRIDGE.TEAM</span><span>CN / EN</span><span>WEB APP</span>
          </div>
        </div>

        <div className="orbit-panel" aria-label="轨道任务示意图">
          <div className="panel-bar"><span>ORBITAL OVERVIEW</span><span>LIVE SIMULATION</span></div>
          <div className="orbit-stage">
            <div className="grid-lines" />
            <div className="orbit orbit-one"><span className="satellite" /></div>
            <div className="orbit orbit-two"><span className="node node-a" /><span className="node node-b" /></div>
            <div className="planet"><span>JUNO</span><small>R 1,274 km</small></div>
            <div className="vector vector-a"><span>AP</span><strong>168.4 km</strong></div>
            <div className="vector vector-b"><span>PE</span><strong>82.1 km</strong></div>
            <div className="burn-tag"><i /> BURN · T−00:18:42</div>
          </div>
          <div className="telemetry">
            <div><span>VELOCITY</span><strong>2,846<small> m/s</small></strong></div>
            <div><span>INCLINATION</span><strong>04.2<small>°</small></strong></div>
            <div><span>Δv REMAIN</span><strong>6,312<small> m/s</small></strong></div>
          </div>
        </div>
      </section>

      <section className="tools-section" id="tools">
        <div className="section-heading">
          <div><p className="section-index">01 / TOOL DECK</p><h2>任务需要的工具，<br /><span>全部集中在这里。</span></h2></div>
          <p>每个工具都以独立模块运行，同时共享统一的数据格式。飞船文件、发动机参数与轨道结果可以在工具之间继续使用。</p>
        </div>
        <div className="tool-grid">
          {tools.map((tool, index) => {
            const ToolTag = tool.href ? "a" : "article";
            return (
            <ToolTag className={`tool-card accent-${tool.accent}`} key={tool.code} href={tool.href} aria-label={tool.href ? `打开${tool.title}` : undefined}>
              <div className="tool-card-top"><span className="tool-number">0{index + 1}</span><span className="tool-status">{tool.status}</span></div>
              <div className="tool-symbol" aria-hidden="true">{tool.code}</div>
              <h3>{tool.title}</h3><p>{tool.description}</p>
              <div className="tool-footer"><span>{tool.meta}</span><span className="card-arrow"><ArrowIcon /></span></div>
            </ToolTag>
          )})}
        </div>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="roadmap-intro">
          <p className="section-index">02 / FLIGHT PLAN</p><h2>不是工具列表，<br />而是一条完整工作流。</h2>
          <p>第一阶段先完成图像转 Label。后续逐步接入飞船文件读取、Δv 计算、三维轨道规划与 MFD 设计。</p>
        </div>
        <div className="milestones">
          {milestones.map((milestone, index) => (
            <button className={`milestone ${index === 1 ? "active" : ""}`} key={milestone.number} type="button" onClick={() => setSelectedMilestone(milestone)} aria-haspopup="dialog">
              <span className="milestone-number">{milestone.number}</span><strong>{milestone.name}</strong><small>{milestone.phase}</small><span className="milestone-line"><i /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="manifesto" id="about">
        <p className="section-index">03 / DESIGN PRINCIPLE</p>
        <blockquote>少一点重复试算，<br />多一点真正的<span>任务设计。</span></blockquote>
        <div className="manifesto-note"><span>LOCAL FIRST</span><p>计算和文件处理优先在你的浏览器内完成。无需上传飞船文件，结果可随时导出。</p></div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark" aria-hidden="true"><span /></span><span className="brand-type"><strong>JUNO</strong><small>TOOL STATION</small></span></a>
        <p>面向 Juno: New Origins 玩家与创作者的开放工具站。</p>
        <div className="footer-meta"><span>TOOL.JUNO.FOXBRIDGE.TEAM</span><span>© 2026 FOXBRIDGE</span></div>
      </footer>

      {selectedMilestone && (
        <div className="roadmap-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMilestone(null); }}>
          <section className="roadmap-modal" role="dialog" aria-modal="true" aria-labelledby="roadmap-modal-title">
            <div className="roadmap-modal-top"><span>{selectedMilestone.number} / {selectedMilestone.status}</span><button type="button" onClick={() => setSelectedMilestone(null)} aria-label="关闭弹窗">×</button></div>
            <p className="roadmap-modal-phase">{selectedMilestone.phase}</p>
            <h2 id="roadmap-modal-title">{selectedMilestone.name}</h2>
            <p className="roadmap-modal-description">{selectedMilestone.description}</p>
            <ul>{selectedMilestone.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <div className="roadmap-modal-actions">
              {selectedMilestone.href ? <a className="button button-primary" href={selectedMilestone.href}>进入工具 <ArrowIcon /></a> : <span>该阶段尚在规划中</span>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
