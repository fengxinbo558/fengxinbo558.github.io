document.documentElement.classList.add('js');

(async () => {
  'use strict';

  const Content = window.PortfolioContent;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previewMode = new URLSearchParams(window.location.search).has('preview');
  const workspace = document.getElementById('workspace');
  const terminal = document.getElementById('terminal');
  const bootLog = document.getElementById('boot-log');
  const bootCta = document.getElementById('boot-cta');
  const enterButton = document.getElementById('enter-workspace');
  const skipButton = document.getElementById('skip-boot');
  const terminalBody = document.getElementById('terminal-body');
  let currentContent = null;
  let laneDescriptions = {};

  const text = (selector, value) => {
    const node = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (node && typeof value === 'string') node.textContent = value;
  };
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof value === 'string') node.textContent = value;
    return node;
  };
  const setSafeLink = (link, url, { hideWhenEmpty = false } = {}) => {
    if (!link) return;
    const safe = Content.isSafeUrl(url);
    link.classList.toggle('is-disabled', !safe);
    link.setAttribute('aria-disabled', String(!safe));
    link.toggleAttribute('hidden', hideWhenEmpty && !safe);
    if (safe) link.href = url.trim();
    else link.removeAttribute('href');
  };

  const renderDecisionSystem = (system) => {
    if (!system || !Array.isArray(system.lanes) || system.lanes.length !== 3) return;
    text('#decision-heading', system.heading);
    text('#decision-center-title', system.centerTitle);
    text('#decision-center-label', system.centerLabel);
    laneDescriptions = {};
    const buttons = [...document.querySelectorAll('.decision-lane')];
    system.lanes.forEach((lane, index) => {
      const button = buttons[index];
      if (!button) return;
      const id = Content.safeId(lane.id, `lane-${index + 1}`);
      button.dataset.lane = id;
      button.classList.toggle('lane-green', lane.tone === 'green');
      button.classList.toggle('lane-amber', lane.tone === 'amber');
      button.classList.toggle('is-selected', index === 0);
      button.setAttribute('aria-pressed', String(index === 0));
      const nodes = button.querySelectorAll('.map-node');
      text(nodes[0]?.querySelector('small'), lane.inputLabel);
      text(nodes[0]?.querySelector('strong'), lane.inputTitle);
      text(nodes[1]?.querySelector('small'), lane.outputLabel);
      text(nodes[1]?.querySelector('strong'), lane.outputTitle);
      laneDescriptions[id] = lane.description || '';
    });
    text('#decision-explainer span', laneDescriptions[buttons[0]?.dataset.lane] || '');
  };

  const renderProjects = (projects) => {
    if (!Array.isArray(projects)) return;
    const list = document.getElementById('work-list');
    const details = document.getElementById('work-details');
    if (!list || !details) return;
    list.textContent = '';
    details.textContent = '';
    if (!projects.length) {
      list.appendChild(element('p', 'content-empty', '项目正在整理中。'));
      return;
    }
    projects.forEach((project, index) => {
      const id = Content.safeId(project.id, `project-${index + 1}`);
      const selected = index === 0;
      const tab = element('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.dataset.project = id;
      tab.id = `project-tab-${id}`;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-controls', `project-${id}`);
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-selected', selected);
      tab.append(element('span', '', String(index + 1).padStart(2, '0')), element('strong', '', project.title || '未命名项目'), element('span', 'project-arrow', '→'));
      list.appendChild(tab);

      const panel = element('article', `project-panel${selected ? ' is-selected' : ''}`);
      panel.id = `project-${id}`;
      panel.dataset.projectPanel = id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = !selected;
      panel.append(element('p', 'work-meta', project.meta || 'PROJECT'), element('h2', '', project.title || '未命名项目'), element('p', '', project.description || ''));
      const link = element('a', 'project-link');
      link.target = '_blank';
      link.rel = 'noopener';
      link.append(element('span', '', project.buttonLabel || '查看项目'), element('span', '', '↗'));
      setSafeLink(link, project.url);
      panel.appendChild(link);
      const status = element('p', 'work-status');
      status.append(element('i'), document.createTextNode(project.status || '持续更新'));
      panel.appendChild(status);
      details.appendChild(panel);
    });
  };

  const renderArticles = (section) => {
    if (!section || !Array.isArray(section.articles)) return;
    const grid = document.getElementById('notes-grid');
    if (!grid) return;
    grid.textContent = '';
    if (!section.articles.length) {
      grid.appendChild(element('p', 'content-empty', section.emptyMessage || '文章整理中，欢迎稍后再来。'));
      return;
    }
    section.articles.forEach((article, index) => {
      const card = element('a', 'note-card');
      if (section.articles.length % 2 === 1 && index === section.articles.length - 1) card.classList.add('note-card-wide');
      card.target = '_blank';
      card.rel = 'noopener';
      setSafeLink(card, article.url);
      const tone = ['blue', 'green', 'amber'].includes(article.tone) ? article.tone : 'blue';
      const cover = element('span', `note-cover cover-${tone}`);
      cover.setAttribute('aria-hidden', 'true');
      cover.append(element('i', '', article.coverPrimary || 'PUBLIC NOTE'), element('b', '', article.coverSecondary || '→'));
      const body = element('span', 'note-card-body');
      const meta = `${String(index + 1).padStart(2, '0')} / ${article.category || '文章'}${article.date ? ` · ${article.date}` : ''}`;
      body.append(element('small', '', meta), element('strong', '', article.title || '未命名文章'), element('span', 'note-link', '阅读原文 ↗'));
      card.append(cover, body);
      grid.appendChild(card);
    });
  };

  const channelSymbols = { github: 'GH', wechat: '微', email: '@', website: '⌂', link: '↗' };
  const renderChannels = (section) => {
    if (!section || !Array.isArray(section.channels)) return;
    const channels = document.getElementById('contact-channels');
    const status = document.querySelector('.contact-status');
    if (!channels || !status) return;
    channels.textContent = '';
    status.querySelector('.contact-empty')?.remove();
    if (!section.channels.length) {
      channels.after(element('p', 'contact-empty', section.emptyMessage || '新的联系方式正在整理中。'));
      return;
    }
    section.channels.forEach((channel) => {
      const link = element('a');
      link.target = '_blank';
      link.rel = 'noopener';
      setSafeLink(link, channel.url);
      const icon = element('span', 'channel-icon channel-icon-text', channelSymbols[channel.type] || '↗');
      const copy = element('span');
      copy.append(element('small', '', channel.label || channel.type || 'LINK'), element('strong', '', channel.value || '未命名渠道'));
      link.append(icon, copy, element('span', 'channel-arrow', '↗'));
      channels.appendChild(link);
    });
  };

  const renderContent = (raw) => {
    const content = Content.normalizeContent(raw);
    currentContent = content;
    window.__PORTFOLIO_CONTENT__ = Content.clone(content);
    const { profile, assets, decisionSystem, workSection, notesSection, contactSection } = content;
    text('#site-handle', profile.handle);
    text('#footer-handle', `${profile.handle || 'portfolio'}@portfolio`);
    text('#profile-label', profile.profileLabel);
    text('#about-title', profile.name);
    text('#profile-role', profile.role);
    text('#profile-statement', profile.statement);
    text('#profile-skills', profile.skills);
    text('#work-action-label', profile.workActionLabel);
    text('#notes-action-label', profile.notesActionLabel);
    const formula = document.querySelectorAll('#profile-formula span');
    profile.formula.forEach((item, index) => text(formula[index], item));
    document.getElementById('profile-formula')?.setAttribute('aria-label', profile.formula.filter(Boolean).join('乘'));

    const avatar = document.getElementById('profile-avatar');
    const card = avatar?.closest('.portrait-card');
    card?.style.setProperty('--portrait-initial', JSON.stringify((profile.name || '冯').trim().slice(0, 1) || '冯'));
    if (avatar && typeof assets.avatar === 'string' && Content.isSafeAssetUrl(assets.avatar)) {
      card?.classList.remove('portrait-fallback');
      avatar.hidden = false;
      avatar.src = assets.avatar;
      avatar.alt = assets.avatarAlt || `${profile.name || ''}个人头像`;
    }
    text('#profile-avatar-caption', assets.avatarCaption);

    renderDecisionSystem(decisionSystem);
    text('#work-kicker', workSection.kicker);
    text('#work-title', workSection.title);
    text('#work-description', workSection.description);
    text('#work-overview-link span', workSection.overviewLabel);
    setSafeLink(document.getElementById('work-overview-link'), workSection.overviewUrl, { hideWhenEmpty: true });
    renderProjects(workSection.projects);
    text('#notes-kicker', notesSection.kicker);
    text('#notes-title', notesSection.title);
    text('#notes-description', notesSection.description);
    text('#notes-contact-label', notesSection.contactLabel);
    renderArticles(notesSection);
    text('#contact-kicker', contactSection.kicker);
    text('#contact-title', contactSection.title);
    text('#contact-description', contactSection.description);
    text('#contact-primary-label', contactSection.primaryLabel);
    setSafeLink(document.getElementById('contact-primary-link'), contactSection.primaryUrl, { hideWhenEmpty: true });
    text('#contact-status-label', contactSection.statusLabel);
    text('#contact-response-label', contactSection.responseLabel);
    text('#contact-response-text', contactSection.responseText);
    renderChannels(contactSection);

    const role = profile.roleEnglish || profile.role || '';
    document.title = `${profile.name || '个人主页'}${role ? ` · ${role}` : ''}`;
    const description = [profile.name, profile.role, profile.statement].filter(Boolean).join(' · ').replace(/\s+/g, ' ');
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    return content;
  };

  try {
    const response = await fetch('content.json?source=portfolio', { cache: 'no-store' });
    if (!response.ok) throw new Error(`内容读取失败 (${response.status})`);
    renderContent(await response.json());
  } catch (error) {
    console.warn('使用页面内置内容：', error.message);
  }

  text('#year', String(new Date().getFullYear()));
  requestAnimationFrame(() => workspace?.classList.add('is-primed'));
  const profile = currentContent?.profile || {};
  const handle = profile.handle || 'fengxinbo';
  const statement = (profile.statement || '把 AI 能力，变成人们每天用得上的产品').replace(/\s+/g, ' ');
  const skills = profile.skills || 'AI 产品拆解 × Agent 工作流 × 需求洞察';
  const bootLines = [
    [['term-prompt', `${handle}@portfolio:~$ `], ['term-command', `init ${handle}.portfolio`]],
    [['term-dim', '[01/04] '], ['term-output', '初始化个人工作区'], ['term-ok', '  OK']],
    [['term-dim', '[02/04] '], ['term-output', '加载产品内核 decision-core.ai'], ['term-ok', '  OK']],
    [['term-dim', '[03/04] '], ['term-output', '挂载 /insight 与 /agent-workflow'], ['term-ok', '  OK']],
    [['term-dim', '[04/04] '], ['term-output', '启动产品工作台 portfolio.app'], ['term-ok', '  OK']],
    [],
    [['term-name', `${profile.name || '冯新波'} · ${profile.roleEnglish || profile.role || 'AI Product Manager'}`]],
    [['term-output', statement]],
    [['term-prompt', 'echo '], ['term-command', `"${skills}"`]],
    [['term-gold', skills]],
    [],
    [['term-ready', 'SYSTEM READY']]
  ];
  let bootFinished = false;
  let workspaceEntered = false;
  const bootTimers = [];
  const appendBootLine = (parts) => {
    const line = element('p', 'term-line');
    if (!parts.length) line.innerHTML = '&nbsp;';
    parts.forEach(([className, value]) => line.appendChild(element('span', className, value)));
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
    if (reducedMotion.matches || previewMode) return renderBootImmediately();
    bootLines.forEach((line, index) => {
      bootTimers.push(window.setTimeout(() => {
        appendBootLine(line);
        if (index === bootLines.length - 1) finishBoot();
      }, 170 + index * 145));
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
      if (!previewMode) document.querySelector('.os-sidebar button.is-active')?.focus({ preventScroll: true });
    }, previewMode || reducedMotion.matches ? 0 : 680);
  };

  const navButtons = [...document.querySelectorAll('[data-view]')];
  const viewPanels = [...document.querySelectorAll('[data-view-panel]')];
  const viewLabels = { about: 'AI PRODUCT MANAGER / ABOUT', work: 'SELECTED PRODUCT WORK / WORK', notes: 'PUBLIC WRITING / NOTES', contact: 'OPEN CHANNEL / CONTACT' };
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
    text('#window-path', `~/portfolio/${view}`);
    text('#os-context', viewLabels[view]);
    text('#footer-command', `open ${view}`);
    if (moveFocus) navButtons.find((button) => button.dataset.view === view)?.focus({ preventScroll: true });
    if (!previewMode && window.innerWidth <= 900) document.querySelector('.main-window')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  };
  const selectLane = (lane) => {
    if (!laneDescriptions[lane]) return;
    document.querySelectorAll('[data-lane]').forEach((button) => {
      const selected = button.dataset.lane === lane;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    text('#decision-explainer span', laneDescriptions[lane]);
    const explainer = document.getElementById('decision-explainer');
    explainer?.classList.remove('is-changing');
    requestAnimationFrame(() => explainer?.classList.add('is-changing'));
  };
  const selectProject = (project, { moveFocus = false } = {}) => {
    document.querySelectorAll('[data-project]').forEach((tab) => {
      const selected = tab.dataset.project === project;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    document.querySelectorAll('[data-project-panel]').forEach((panel) => {
      const selected = panel.dataset.projectPanel === project;
      panel.classList.toggle('is-selected', selected);
      panel.hidden = !selected;
    });
  };

  startBoot();
  if (previewMode) enterWorkspace();
  skipButton?.addEventListener('click', renderBootImmediately);
  enterButton?.addEventListener('click', enterWorkspace);
  document.addEventListener('click', (event) => {
    const openView = event.target.closest('[data-open-view]');
    if (openView) showView(openView.dataset.openView);
    const nav = event.target.closest('[data-view]');
    if (nav) showView(nav.dataset.view);
    const lane = event.target.closest('[data-lane]');
    if (lane) selectLane(lane.dataset.lane);
    const project = event.target.closest('[data-project]');
    if (project) selectProject(project.dataset.project);
  });
  document.addEventListener('mouseover', (event) => {
    const lane = event.target.closest('[data-lane]');
    if (lane && !lane.contains(event.relatedTarget) && window.matchMedia('(min-width: 901px)').matches) selectLane(lane.dataset.lane);
  });
  document.addEventListener('keydown', (event) => {
    if (!workspaceEntered && bootFinished && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      enterWorkspace();
      return;
    }
    const nav = event.target.closest('[data-view]');
    if (nav && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const target = navButtons[(navButtons.indexOf(nav) + direction + navButtons.length) % navButtons.length];
      showView(target.dataset.view, { moveFocus: true });
      return;
    }
    const project = event.target.closest('[data-project]');
    if (project && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const tabs = [...document.querySelectorAll('[data-project]')];
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const target = tabs[(tabs.indexOf(project) + direction + tabs.length) % tabs.length];
      selectProject(target.dataset.project, { moveFocus: true });
    }
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
    setPortraitTransform(x, y, Math.max(-7, Math.min(7, x / 20)));
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

  if (previewMode) {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === 'portfolio-preview-content' && event.data.content) {
        try {
          renderContent(event.data.content);
          const previewAvatar = event.data.avatarPreview;
          if (typeof previewAvatar === 'string' && previewAvatar.startsWith(`blob:${window.location.origin}/`)) {
            const avatar = document.getElementById('profile-avatar');
            if (avatar) {
              avatar.hidden = false;
              avatar.src = previewAvatar;
              avatar.closest('.portrait-card')?.classList.remove('portrait-fallback');
            }
          }
          const firstLane = document.querySelector('[data-lane]')?.dataset.lane;
          const firstProject = document.querySelector('[data-project]')?.dataset.project;
          if (firstLane) selectLane(firstLane);
          if (firstProject) selectProject(firstProject);
        } catch (error) {
          console.warn('预览内容暂时不可用：', error.message);
        }
      }
      if (event.data?.type === 'portfolio-preview-view') showView(event.data.view);
    });
    window.parent.postMessage({ type: 'portfolio-preview-ready' }, window.location.origin);
  }
})();
