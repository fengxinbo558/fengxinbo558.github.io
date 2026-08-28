document.documentElement.classList.add('js');

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const workspace = document.getElementById('workspace');
  const terminal = document.getElementById('terminal');
  const bootLog = document.getElementById('boot-log');
  const bootCta = document.getElementById('boot-cta');
  const enterButton = document.getElementById('enter-workspace');
  const skipButton = document.getElementById('skip-boot');
  const terminalBody = document.getElementById('terminal-body');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();
  requestAnimationFrame(() => workspace?.classList.add('is-primed'));

  const bootLines = [
    [['term-prompt', 'fengxinbo@portfolio:~$ '], ['term-command', 'init fengxinbo.portfolio']],
    [['term-dim', '[01/04] '], ['term-output', '初始化个人工作区'], ['term-ok', '  OK']],
    [['term-dim', '[02/04] '], ['term-output', '加载产品内核 decision-core.ai'], ['term-ok', '  OK']],
    [['term-dim', '[03/04] '], ['term-output', '挂载 /insight 与 /agent-workflow'], ['term-ok', '  OK']],
    [['term-dim', '[04/04] '], ['term-output', '启动产品工作台 portfolio.app'], ['term-ok', '  OK']],
    [],
    [['term-name', '冯新波 · AI Product Manager']],
    [['term-output', '把 AI 能力，变成人们每天用得上的产品']],
    [['term-prompt', 'echo '], ['term-command', '"AI 产品拆解 × Agent 工作流 × 需求洞察"']],
    [['term-gold', 'AI 产品拆解 × Agent 工作流 × 需求洞察']],
    [],
    [['term-ready', 'SYSTEM READY']]
  ];

  let bootFinished = false;
  let workspaceEntered = false;
  const bootTimers = [];

  const appendBootLine = (parts) => {
    const line = document.createElement('p');
    line.className = 'term-line';
    if (parts.length === 0) line.innerHTML = '&nbsp;';
    parts.forEach(([className, text]) => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      line.appendChild(span);
    });
    bootLog?.appendChild(line);
    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
  };

  const finishBoot = () => {
    if (bootFinished) return;
    bootFinished = true;
    bootTimers.forEach(window.clearTimeout);
    bootCta?.classList.add('is-ready');
    skipButton?.setAttribute('hidden', '');
  };

  const renderBootImmediately = () => {
    if (bootLog && bootLog.children.length < bootLines.length) {
      bootLog.textContent = '';
      bootLines.forEach(appendBootLine);
    }
    finishBoot();
  };

  const startBoot = () => {
    if (reducedMotion.matches) {
      renderBootImmediately();
      return;
    }
    bootLines.forEach((line, index) => {
      const timer = window.setTimeout(() => {
        appendBootLine(line);
        if (index === bootLines.length - 1) finishBoot();
      }, 170 + index * 145);
      bootTimers.push(timer);
    });
  };

  const enterWorkspace = () => {
    if (workspaceEntered) return;
    workspaceEntered = true;
    if (!bootFinished) renderBootImmediately();
    workspace?.classList.add('is-live');
    terminal?.classList.add('is-leaving');
    window.setTimeout(() => {
      terminal?.classList.add('is-gone');
      document.querySelector('.os-sidebar button.is-active')?.focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 680);
  };

  startBoot();
  skipButton?.addEventListener('click', renderBootImmediately);
  enterButton?.addEventListener('click', enterWorkspace);
  document.addEventListener('keydown', (event) => {
    if (!workspaceEntered && bootFinished && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      enterWorkspace();
    }
  });

  const navButtons = [...document.querySelectorAll('[data-view]')];
  const viewPanels = [...document.querySelectorAll('[data-view-panel]')];
  const windowPath = document.getElementById('window-path');
  const osContext = document.getElementById('os-context');
  const footerCommand = document.getElementById('footer-command');
  const viewLabels = {
    about: 'AI PRODUCT MANAGER / ABOUT',
    work: 'SELECTED PRODUCT WORK / WORK',
    notes: 'PUBLIC WRITING / NOTES',
    contact: 'OPEN CHANNEL / CONTACT'
  };

  const showView = (view, { moveFocus = false } = {}) => {
    if (!viewLabels[view]) return;
    navButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    viewPanels.forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (windowPath) windowPath.textContent = `~/portfolio/${view}`;
    if (osContext) osContext.textContent = viewLabels[view];
    if (footerCommand) footerCommand.textContent = `open ${view}`;
    if (moveFocus) navButtons.find((button) => button.dataset.view === view)?.focus({ preventScroll: true });
    if (window.innerWidth <= 900) document.querySelector('.main-window')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  };

  navButtons.forEach((button, index) => {
    button.addEventListener('click', () => showView(button.dataset.view));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const target = navButtons[(index + direction + navButtons.length) % navButtons.length];
      showView(target.dataset.view, { moveFocus: true });
    });
  });
  document.querySelectorAll('[data-open-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.openView, { moveFocus: false })));

  const laneDescriptions = {
    scene: '从真实场景出发，找到值得解决的问题，再定义用户能理解、能控制的体验。',
    agent: '先判断模型能力与边界，再把任务拆进可观察、可恢复的 Agent 工作流。',
    value: '连接用户价值、实现成本与业务节奏，用可验证结果推动产品持续迭代。'
  };
  const decisionLanes = [...document.querySelectorAll('[data-lane]')];
  const decisionExplainer = document.getElementById('decision-explainer');

  const selectLane = (lane) => {
    decisionLanes.forEach((button) => {
      const selected = button.dataset.lane === lane;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const text = decisionExplainer?.querySelector('span');
    if (text) text.textContent = laneDescriptions[lane];
    decisionExplainer?.classList.remove('is-changing');
    requestAnimationFrame(() => decisionExplainer?.classList.add('is-changing'));
  };

  decisionLanes.forEach((button) => {
    button.addEventListener('click', () => selectLane(button.dataset.lane));
    button.addEventListener('mouseenter', () => {
      if (window.matchMedia('(min-width: 901px)').matches) selectLane(button.dataset.lane);
    });
  });

  const projectTabs = [...document.querySelectorAll('[data-project]')];
  const projectPanels = [...document.querySelectorAll('[data-project-panel]')];
  const selectProject = (project, { moveFocus = false } = {}) => {
    projectTabs.forEach((tab) => {
      const selected = tab.dataset.project === project;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    projectPanels.forEach((panel) => {
      const selected = panel.dataset.projectPanel === project;
      panel.classList.toggle('is-selected', selected);
      panel.hidden = !selected;
    });
  };

  projectTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectProject(tab.dataset.project));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const target = projectTabs[(index + direction + projectTabs.length) % projectTabs.length];
      selectProject(target.dataset.project, { moveFocus: true });
    });
  });

  const portrait = document.getElementById('portrait-drag-layer');
  const portraitCard = portrait?.querySelector('.portrait-card');
  const portraitImage = portrait?.querySelector('img');
  let drag = null;

  const setPortraitTransform = (x, y, rotation) => {
    portrait?.style.setProperty('--portrait-x', `${x}px`);
    portrait?.style.setProperty('--portrait-y', `${y}px`);
    portrait?.style.setProperty('--portrait-rotation', `${rotation}deg`);
  };

  portrait?.addEventListener('pointerdown', (event) => {
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY };
    portrait.setPointerCapture(event.pointerId);
    portrait.classList.add('is-dragging');
  });
  portrait?.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const maxX = Math.min(150, window.innerWidth * .22);
    const x = Math.max(-maxX, Math.min(maxX, event.clientX - drag.startX));
    const y = Math.max(-38, Math.min(150, event.clientY - drag.startY));
    const rotation = Math.max(-7, Math.min(7, x / 20));
    setPortraitTransform(x, y, rotation);
  });
  const releasePortrait = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    portrait.classList.remove('is-dragging');
    if (portrait.hasPointerCapture(event.pointerId)) portrait.releasePointerCapture(event.pointerId);
    drag = null;
    setPortraitTransform(0, 0, 0);
  };
  portrait?.addEventListener('pointerup', releasePortrait);
  portrait?.addEventListener('pointercancel', releasePortrait);

  portraitImage?.addEventListener('error', () => {
    portraitImage.hidden = true;
    portraitCard?.classList.add('portrait-fallback');
  });
})();
