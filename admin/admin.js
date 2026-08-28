(() => {
  'use strict';

  const Content = window.PortfolioContent;
  const OWNER = 'fengxinbo558';
  const REPO = 'fengxinbo558.github.io';
  const BRANCH = 'main';
  const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const LIVE_CONTENT_URL = 'https://fengxinbo558.github.io/content.json';
  const panelMeta = {
    profile: ['BASIC PROFILE', '基本资料', 'about'],
    decision: ['DECISION SYSTEM', '决策路径', 'about'],
    projects: ['SELECTED WORK', '项目', 'work'],
    articles: ['PUBLIC NOTES', '文章', 'notes'],
    contacts: ['OPEN CHANNEL', '联系方式', 'contact'],
    avatar: ['PROFILE IMAGE', '头像', 'about']
  };
  const state = {
    token: '',
    connected: false,
    remoteSha: '',
    baseline: null,
    draft: null,
    pendingAvatar: null,
    avatarPreviewUrl: '',
    dirty: false,
    publishing: false,
    activePanel: 'profile',
    previewReady: false,
    previewSize: 'desktop'
  };

  const $ = (selector) => document.querySelector(selector);
  const editorForm = $('#editor-form');
  const notice = $('#notice');
  const publishButton = $('#publish');
  const clearTokenButton = $('#clear-token');
  const previewFrame = $('#site-preview');
  const previewViewport = $('#preview-viewport');

  const recoveryContent = () => ({
    schemaVersion: 1,
    revision: new Date(0).toISOString(),
    profile: {
      handle: 'fengxinbo', name: '冯新波', englishName: 'FENG XINBO', role: 'AI 产品经理', roleEnglish: 'AI Product Manager',
      statement: '把 AI 能力，\n变成人们每天用得上的产品。', skills: 'AI 产品拆解 · Agent 工作流 · 需求洞察',
      formula: ['技术理解', '用户洞察', '商业判断'], profileLabel: 'PROFILE', workActionLabel: '查看产品案例', notesActionLabel: '阅读最新文章'
    },
    assets: { avatar: 'assets/profile-avatar.jpg', avatarAlt: '冯新波个人头像', avatarCaption: 'FENG XINBO / AI PM' },
    decisionSystem: {
      heading: 'PRODUCT DECISION SYSTEM', centerTitle: '产品定义', centerLabel: 'DECISION CORE',
      lanes: [
        { id: 'scene', tone: 'blue', inputLabel: 'INPUT 01', inputTitle: '用户场景', outputLabel: 'OUTPUT 01', outputTitle: '可用体验', description: '从真实场景出发，找到值得解决的问题。' },
        { id: 'agent', tone: 'green', inputLabel: 'INPUT 02', inputTitle: '模型能力', outputLabel: 'OUTPUT 02', outputTitle: 'Agent 工作流', description: '把任务拆进可观察、可恢复的工作流。' },
        { id: 'value', tone: 'amber', inputLabel: 'INPUT 03', inputTitle: '业务目标', outputLabel: 'OUTPUT 03', outputTitle: '可验证价值', description: '用可验证结果推动产品持续迭代。' }
      ]
    },
    workSection: { kicker: 'SELECTED WORK', title: '项目与持续实践', description: '', overviewLabel: '', overviewUrl: '', projects: [{ id: 'project-1', title: '我的项目', meta: 'PROJECT', description: '', buttonLabel: '查看项目', url: 'https://github.com/fengxinbo558', status: '持续更新' }] },
    notesSection: { kicker: 'PUBLIC NOTES', title: '公开笔记', description: '', contactLabel: '交流一个具体问题', emptyMessage: '文章整理中，欢迎稍后再来。', articles: [] },
    contactSection: { kicker: 'OPEN CHANNEL', title: '欢迎联系我', description: '', primaryLabel: '', primaryUrl: '', statusLabel: 'AVAILABLE FOR CONVERSATION', responseLabel: 'STATUS', responseText: '优先回复具体、清楚的问题', emptyMessage: '新的联系方式正在整理中。', channels: [] }
  });

  const showNotice = (message, type = '') => {
    notice.textContent = message;
    notice.className = `notice${type ? ` is-${type}` : ''}`;
  };

  const adminAssetUrl = (value) => {
    if (!Content.isSafeAssetUrl(value)) return '../avatar.svg';
    return value.trim().startsWith('https://') ? value.trim() : new URL(`../${value.trim()}`, document.baseURI).href;
  };

  const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[Number.isNaN(Number(key)) ? key : Number(key)], object);
  const setPath = (object, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((current, key) => current[Number.isNaN(Number(key)) ? key : Number(key)], object);
    target[Number.isNaN(Number(last)) ? last : Number(last)] = value;
  };

  const makeField = (label, path, options = {}) => {
    const wrapper = document.createElement('label');
    wrapper.className = `field${options.wide ? ' is-wide' : ''}`;
    const title = document.createElement('span');
    title.textContent = label;
    if (options.hint) {
      const hint = document.createElement('small');
      hint.textContent = options.hint;
      title.appendChild(hint);
    }
    let input;
    if (options.type === 'textarea') input = document.createElement('textarea');
    else if (options.type === 'select') {
      input = document.createElement('select');
      options.choices.forEach(([value, copy]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = copy;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = options.type || 'text';
    }
    input.dataset.path = path;
    input.value = getPath(state.draft, path) ?? '';
    input.maxLength = options.type === 'url' ? 2048 : options.type === 'textarea' ? 600 : 120;
    if (options.placeholder) input.placeholder = options.placeholder;
    wrapper.append(title, input);
    return wrapper;
  };

  const makeGroup = (title, description, fields) => {
    const group = document.createElement('section');
    group.className = 'form-group';
    const heading = document.createElement('div');
    heading.className = 'form-group-title';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = description;
    heading.append(h3, p);
    const grid = document.createElement('div');
    grid.className = 'field-grid';
    fields.forEach((field) => grid.appendChild(field));
    group.append(heading, grid);
    return group;
  };

  const actionButton = (label, action, collection, index, danger = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-button${danger ? ' is-danger' : ''}`;
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.collection = collection;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', label);
    return button;
  };

  const cardHeading = (title, collection, index, { deletable = true } = {}) => {
    const heading = document.createElement('div');
    heading.className = 'form-group-title';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(actionButton('↑', 'move-up', collection, index), actionButton('↓', 'move-down', collection, index));
    if (deletable) actions.appendChild(actionButton('删除', 'delete', collection, index, true));
    heading.append(h3, actions);
    return heading;
  };

  const renderProfile = (panel) => {
    panel.replaceChildren(
      makeGroup('身份信息', '首页 ABOUT 区域', [
        makeField('账号标识', 'profile.handle'), makeField('姓名', 'profile.name'),
        makeField('英文名', 'profile.englishName'), makeField('职业名称', 'profile.role'),
        makeField('英文职业名称', 'profile.roleEnglish'), makeField('头像区标签', 'profile.profileLabel'),
        makeField('首页主张', 'profile.statement', { type: 'textarea', wide: true, hint: '支持换行' }),
        makeField('能力概括', 'profile.skills', { wide: true }),
        makeField('能力公式 1', 'profile.formula.0'), makeField('能力公式 2', 'profile.formula.1'),
        makeField('能力公式 3', 'profile.formula.2'), makeField('项目按钮文字', 'profile.workActionLabel'),
        makeField('文章按钮文字', 'profile.notesActionLabel')
      ]),
      makeGroup('WORK 页面标题', '项目页左侧介绍', [
        makeField('小标签', 'workSection.kicker'), makeField('标题', 'workSection.title'),
        makeField('说明', 'workSection.description', { type: 'textarea', wide: true }),
        makeField('总入口文字', 'workSection.overviewLabel'), makeField('总入口链接', 'workSection.overviewUrl', { type: 'url' })
      ]),
      makeGroup('NOTES 页面标题', '文章页左侧介绍', [
        makeField('小标签', 'notesSection.kicker'), makeField('标题', 'notesSection.title'),
        makeField('说明', 'notesSection.description', { type: 'textarea', wide: true }),
        makeField('联系按钮文字', 'notesSection.contactLabel'), makeField('无文章时提示', 'notesSection.emptyMessage')
      ])
    );
  };

  const renderDecision = (panel) => {
    panel.replaceChildren(makeGroup('中心节点', '固定三条路径围绕中心节点展示', [
      makeField('图表标题', 'decisionSystem.heading', { wide: true }),
      makeField('中心标题', 'decisionSystem.centerTitle'), makeField('中心小标签', 'decisionSystem.centerLabel')
    ]));
    state.draft.decisionSystem.lanes.forEach((lane, index) => {
      const card = document.createElement('section');
      card.className = 'repeat-card';
      card.appendChild(cardHeading(`路径 ${index + 1} · ${lane.inputTitle || '未命名'}`, 'decisionSystem.lanes', index, { deletable: false }));
      const grid = document.createElement('div');
      grid.className = 'field-grid';
      grid.append(
        makeField('颜色', `decisionSystem.lanes.${index}.tone`, { type: 'select', choices: [['blue', '蓝色'], ['green', '绿色'], ['amber', '金色']] }),
        makeField('输入小标签', `decisionSystem.lanes.${index}.inputLabel`),
        makeField('输入节点', `decisionSystem.lanes.${index}.inputTitle`), makeField('输出小标签', `decisionSystem.lanes.${index}.outputLabel`),
        makeField('输出节点', `decisionSystem.lanes.${index}.outputTitle`),
        makeField('说明', `decisionSystem.lanes.${index}.description`, { type: 'textarea', wide: true })
      );
      card.appendChild(grid);
      panel.appendChild(card);
    });
  };

  const renderProjects = (panel) => {
    panel.textContent = '';
    state.draft.workSection.projects.forEach((project, index) => {
      const card = document.createElement('section');
      card.className = 'repeat-card';
      card.appendChild(cardHeading(`项目 ${index + 1} · ${project.title || '未命名'}`, 'workSection.projects', index));
      const grid = document.createElement('div');
      grid.className = 'field-grid';
      grid.append(
        makeField('标题', `workSection.projects.${index}.title`), makeField('类型标签', `workSection.projects.${index}.meta`),
        makeField('说明', `workSection.projects.${index}.description`, { type: 'textarea', wide: true }),
        makeField('按钮文字', `workSection.projects.${index}.buttonLabel`), makeField('项目链接', `workSection.projects.${index}.url`, { type: 'url' }),
        makeField('状态文字', `workSection.projects.${index}.status`, { wide: true })
      );
      card.appendChild(grid);
      panel.appendChild(card);
    });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'add-button'; add.textContent = '+ 新增项目'; add.dataset.action = 'add-project';
    panel.appendChild(add);
  };

  const renderArticles = (panel) => {
    panel.textContent = '';
    state.draft.notesSection.articles.forEach((article, index) => {
      const card = document.createElement('section');
      card.className = 'repeat-card';
      card.appendChild(cardHeading(`文章 ${index + 1} · ${article.title || '未命名'}`, 'notesSection.articles', index));
      const grid = document.createElement('div');
      grid.className = 'field-grid';
      grid.append(
        makeField('标题', `notesSection.articles.${index}.title`, { wide: true }),
        makeField('分类', `notesSection.articles.${index}.category`), makeField('日期', `notesSection.articles.${index}.date`, { placeholder: '2026.08' }),
        makeField('原文链接', `notesSection.articles.${index}.url`, { type: 'url', wide: true }),
        makeField('封面主文字', `notesSection.articles.${index}.coverPrimary`), makeField('封面副文字', `notesSection.articles.${index}.coverSecondary`),
        makeField('封面配色', `notesSection.articles.${index}.tone`, { type: 'select', choices: [['blue', '蓝色'], ['green', '绿色'], ['amber', '金色']], wide: true })
      );
      card.appendChild(grid);
      panel.appendChild(card);
    });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'add-button'; add.textContent = '+ 新增文章'; add.dataset.action = 'add-article';
    panel.appendChild(add);
  };

  const renderContacts = (panel) => {
    panel.replaceChildren(makeGroup('联系页介绍', 'CONTACT 页面与主要按钮', [
      makeField('小标签', 'contactSection.kicker'), makeField('标题', 'contactSection.title'),
      makeField('说明', 'contactSection.description', { type: 'textarea', wide: true }),
      makeField('主要按钮文字', 'contactSection.primaryLabel'), makeField('主要按钮链接', 'contactSection.primaryUrl', { type: 'url' }),
      makeField('状态标题', 'contactSection.statusLabel'), makeField('状态小标签', 'contactSection.responseLabel'),
      makeField('状态说明', 'contactSection.responseText'), makeField('无渠道时提示', 'contactSection.emptyMessage')
    ]));
    state.draft.contactSection.channels.forEach((channel, index) => {
      const card = document.createElement('section');
      card.className = 'repeat-card';
      card.appendChild(cardHeading(`渠道 ${index + 1} · ${channel.value || '未命名'}`, 'contactSection.channels', index));
      const grid = document.createElement('div');
      grid.className = 'field-grid';
      grid.append(
        makeField('图标', `contactSection.channels.${index}.type`, { type: 'select', choices: [['github', 'GitHub'], ['wechat', '微信'], ['email', '邮箱'], ['website', '网站'], ['link', '通用链接']] }),
        makeField('渠道名称', `contactSection.channels.${index}.label`),
        makeField('展示文字', `contactSection.channels.${index}.value`), makeField('链接', `contactSection.channels.${index}.url`, { type: 'url' })
      );
      card.appendChild(grid);
      panel.appendChild(card);
    });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'add-button'; add.textContent = '+ 新增联系方式'; add.dataset.action = 'add-contact';
    panel.appendChild(add);
  };

  const renderAvatar = (panel) => {
    panel.textContent = '';
    const group = document.createElement('section');
    group.className = 'form-group';
    const heading = document.createElement('div');
    heading.className = 'form-group-title';
    heading.innerHTML = '<h3>个人头像</h3><p>支持 JPG、PNG、WebP，最大 3 MB</p>';
    const editor = document.createElement('div');
    editor.className = 'avatar-editor';
    const image = document.createElement('img');
    image.id = 'avatar-local-preview';
    image.alt = '当前头像预览';
    image.src = state.avatarPreviewUrl || adminAssetUrl(state.draft.assets.avatar);
    const fileDrop = document.createElement('div');
    fileDrop.className = 'file-drop';
    fileDrop.append(
      makeField('头像路径', 'assets.avatar', { wide: true, hint: '仓库路径或 HTTPS 地址' }),
      makeField('图片替代文字', 'assets.avatarAlt', { wide: true }),
      makeField('头像卡署名', 'assets.avatarCaption', { wide: true })
    );
    const file = document.createElement('input');
    file.type = 'file'; file.id = 'avatar-file'; file.accept = 'image/jpeg,image/png,image/webp';
    const note = document.createElement('p');
    note.className = 'file-note'; note.textContent = state.pendingAvatar ? `待发布：${state.pendingAvatar.name}` : '选择新图片后会立即预览，点击“发布更新”才会上传。';
    fileDrop.append(file, note);
    editor.append(image, fileDrop);
    group.append(heading, editor);
    panel.appendChild(group);
  };

  const renderPanel = (name) => {
    const panel = document.querySelector(`[data-form-panel="${name}"]`);
    if (!panel || !state.draft) return;
    ({ profile: renderProfile, decision: renderDecision, projects: renderProjects, articles: renderArticles, contacts: renderContacts, avatar: renderAvatar })[name](panel);
    updateValidation();
  };

  const renderAll = () => Object.keys(panelMeta).forEach(renderPanel);

  const updateValidation = () => {
    if (!state.draft) return [];
    const errors = Content.validateContent(state.draft);
    const summary = $('#validation-summary');
    if (errors.length) {
      summary.hidden = false;
      summary.innerHTML = `<strong>发布前需要修正：</strong><ul>${errors.slice(0, 8).map((error) => `<li>${error.message}</li>`).join('')}</ul>`;
    } else {
      summary.hidden = true;
      summary.textContent = '';
    }
    editorForm.querySelectorAll('[data-path]').forEach((input) => {
      input.setAttribute('aria-invalid', String(errors.some((error) => error.path === input.dataset.path)));
    });
    $('#field-count').textContent = `${editorForm.querySelectorAll('[data-path]').length} 个字段`;
    updateControls(errors);
    return errors;
  };

  const updateDirty = () => {
    if (!state.draft || !state.baseline) return;
    state.dirty = Boolean(state.pendingAvatar) || JSON.stringify(state.draft) !== JSON.stringify(state.baseline);
    updateControls(Content.validateContent(state.draft));
  };

  const updateControls = (errors = []) => {
    publishButton.disabled = !state.connected || !state.dirty || errors.length > 0 || state.publishing;
    clearTokenButton.disabled = !state.connected || state.publishing;
    $('#connect').disabled = state.publishing;
    $('#save-state').textContent = state.publishing ? '正在发布…' : state.dirty ? '有未发布修改' : state.connected ? '内容已同步' : '尚未连接';
    document.body.classList.toggle('is-connected', state.connected);
  };

  let previewTimer = 0;
  const sendPreview = () => {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      if (!state.previewReady || !state.draft) return;
      previewFrame.contentWindow.postMessage({ type: 'portfolio-preview-content', content: state.draft, avatarPreview: state.avatarPreviewUrl }, window.location.origin);
      previewFrame.contentWindow.postMessage({ type: 'portfolio-preview-view', view: panelMeta[state.activePanel][2] }, window.location.origin);
    }, 50);
  };

  const switchPanel = (name) => {
    if (!panelMeta[name]) return;
    state.activePanel = name;
    document.querySelectorAll('[data-panel]').forEach((button) => button.classList.toggle('is-active', button.dataset.panel === name));
    document.querySelectorAll('[data-form-panel]').forEach((panel) => {
      const active = panel.dataset.formPanel === name;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    $('#editor-kicker').textContent = panelMeta[name][0];
    $('#editor-title').textContent = panelMeta[name][1];
    updateValidation();
    if (state.previewReady) previewFrame.contentWindow.postMessage({ type: 'portfolio-preview-view', view: panelMeta[name][2] }, window.location.origin);
  };

  const refreshAfterStructureChange = () => {
    state.draft = Content.normalizeContent(state.draft);
    renderPanel(state.activePanel);
    updateDirty();
    sendPreview();
  };

  const addItem = (type) => {
    const id = Date.now().toString(36);
    if (type === 'project') state.draft.workSection.projects.push({ id: `project-${id}`, title: '新项目', meta: 'PROJECT', description: '', buttonLabel: '查看项目', url: 'https://', status: '持续更新' });
    if (type === 'article') state.draft.notesSection.articles.push({ id: `article-${id}`, title: '新文章', category: '文章', date: '', url: 'https://', coverPrimary: 'PUBLIC NOTE', coverSecondary: '→', tone: 'blue' });
    if (type === 'contact') state.draft.contactSection.channels.push({ id: `channel-${id}`, type: 'link', label: 'LINK', value: '新联系方式', url: 'https://' });
    refreshAfterStructureChange();
  };

  const mutateCollection = (action, path, index) => {
    const collection = getPath(state.draft, path);
    if (!Array.isArray(collection)) return;
    if (action === 'delete') {
      if (path === 'workSection.projects' && collection.length === 1) return showNotice('至少要保留一个项目。', 'error');
      if (!window.confirm('确定删除这一项吗？')) return;
      collection.splice(index, 1);
    } else {
      const target = action === 'move-up' ? index - 1 : index + 1;
      if (target < 0 || target >= collection.length) return;
      [collection[index], collection[target]] = [collection[target], collection[index]];
    }
    refreshAfterStructureChange();
  };

  const githubHeaders = (token) => ({
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  });
  const apiPath = (path) => path.split('/').map(encodeURIComponent).join('/');
  const apiError = (status) => {
    const messages = {
      401: 'Token 无效或已经过期。', 403: 'Token 权限不足或 GitHub 暂时限制了请求。',
      404: '没有找到仓库内容，请确认 Token 已授权这个仓库。', 409: '线上内容刚刚被其他地方修改，请重新连接后再发布。',
      422: 'GitHub 拒绝了这次提交，请检查内容后重试。'
    };
    const error = new Error(messages[status] || `GitHub 请求失败（${status}）`);
    error.status = status;
    return error;
  };
  const getRepoFile = async (path, token, optional = false) => {
    const response = await fetch(`${API_ROOT}/contents/${apiPath(path)}?ref=${encodeURIComponent(BRANCH)}`, { headers: githubHeaders(token), cache: 'no-store' });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw apiError(response.status);
    return response.json();
  };
  const putRepoFile = async (path, token, { message, content, sha }) => {
    const body = { message, content, branch: BRANCH };
    if (sha) body.sha = sha;
    const response = await fetch(`${API_ROOT}/contents/${apiPath(path)}`, {
      method: 'PUT', headers: { ...githubHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) throw apiError(response.status);
    return response.json();
  };
  const decodeBase64Text = (value) => {
    const binary = atob(value.replace(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  };
  const encodeBytes = (bytes) => {
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    return btoa(binary);
  };
  const encodeText = (value) => encodeBytes(new TextEncoder().encode(value));

  const connect = async () => {
    const input = $('#github-token');
    const token = input.value.trim();
    if (!token) return showNotice('请先粘贴 GitHub Token。', 'error');
    $('#connect').disabled = true;
    showNotice('正在连接 GitHub 并读取线上内容…');
    try {
      const file = await getRepoFile('content.json', token);
      const content = Content.normalizeContent(JSON.parse(decodeBase64Text(file.content)));
      const canKeepDraft = state.dirty && state.baseline && JSON.stringify(content) === JSON.stringify(state.baseline);
      if (state.dirty && !canKeepDraft && !window.confirm('线上内容已经变化。连接后需要载入线上最新版，当前草稿会被替换。继续吗？')) {
        showNotice('已保留当前草稿，尚未连接 GitHub。');
        return;
      }
      state.token = token;
      state.connected = true;
      state.remoteSha = file.sha;
      input.value = '';
      if (!canKeepDraft) {
        state.baseline = Content.clone(content);
        state.draft = Content.clone(content);
        state.pendingAvatar = null;
        if (state.avatarPreviewUrl) URL.revokeObjectURL(state.avatarPreviewUrl);
        state.avatarPreviewUrl = '';
        state.dirty = false;
        renderAll();
        switchPanel(state.activePanel);
      }
      sendPreview();
      showNotice(canKeepDraft ? 'GitHub 已重新连接，当前草稿已保留，可以继续发布。' : 'GitHub 已连接，可以编辑并发布更新。', 'success');
    } catch (error) {
      state.token = '';
      state.connected = false;
      showNotice(error.message, 'error');
    } finally {
      $('#connect').disabled = false;
      updateControls(state.draft ? Content.validateContent(state.draft) : []);
    }
  };

  const clearToken = () => {
    state.token = '';
    state.connected = false;
    $('#github-token').value = '';
    updateControls(Content.validateContent(state.draft));
    showNotice('Token 已从当前页面清除；草稿仍保留在页面中。');
  };

  const openPublish = () => {
    if (publishButton.disabled) return;
    $('#publish-drawer').hidden = false;
    $('#drawer-backdrop').hidden = false;
    $('#commit-message').focus();
  };
  const closePublish = () => {
    $('#publish-drawer').hidden = true;
    $('#drawer-backdrop').hidden = true;
  };

  const monitorPublished = async (revision) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
      try {
        const response = await fetch(`${LIVE_CONTENT_URL}?revision=${encodeURIComponent(revision)}&t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok && (await response.json()).revision === revision) {
          showNotice('发布完成，线上主页已经同步最新内容。', 'success');
          return;
        }
      } catch {}
    }
    showNotice('内容已提交，GitHub Pages 仍在同步；稍后刷新主页即可看到。');
  };

  const publish = async () => {
    const errors = Content.validateContent(state.draft);
    if (errors.length) {
      closePublish();
      updateValidation();
      return showNotice('请先修正表单中的问题，再发布。', 'error');
    }
    if (!state.connected || !state.token) return showNotice('请重新连接 GitHub。', 'error');
    state.publishing = true;
    updateControls(errors);
    $('#confirm-publish').disabled = true;
    showNotice('正在检查线上版本并提交更新…');
    try {
      const latest = await getRepoFile('content.json', state.token);
      if (latest.sha !== state.remoteSha) throw apiError(409);
      const messageInput = $('#commit-message').value.trim();
      const message = messageInput || '更新个人主页内容';

      if (state.pendingAvatar) {
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[state.pendingAvatar.type];
        const path = `assets/profile-avatar.${extension}`;
        const existing = await getRepoFile(path, state.token, true);
        const bytes = new Uint8Array(await state.pendingAvatar.arrayBuffer());
        await putRepoFile(path, state.token, { message: `${message}（头像）`, content: encodeBytes(bytes), sha: existing?.sha });
        state.draft.assets.avatar = path;
      }

      const revision = new Date().toISOString();
      state.draft.revision = revision;
      const serialized = `${JSON.stringify(state.draft, null, 2)}\n`;
      const result = await putRepoFile('content.json', state.token, { message, content: encodeText(serialized), sha: state.remoteSha });
      state.remoteSha = result.content.sha;
      state.baseline = Content.clone(state.draft);
      state.pendingAvatar = null;
      if (state.avatarPreviewUrl) URL.revokeObjectURL(state.avatarPreviewUrl);
      state.avatarPreviewUrl = '';
      state.dirty = false;
      $('#commit-message').value = '';
      closePublish();
      renderPanel('avatar');
      updateControls([]);
      sendPreview();
      showNotice('更新已提交，正在等待线上主页同步…', 'success');
      monitorPublished(revision);
    } catch (error) {
      closePublish();
      showNotice(error.message, 'error');
    } finally {
      state.publishing = false;
      $('#confirm-publish').disabled = false;
      updateControls(Content.validateContent(state.draft));
    }
  };

  const setPreviewSize = (size) => {
    state.previewSize = size;
    document.querySelectorAll('[data-preview-size]').forEach((button) => button.classList.toggle('is-active', button.dataset.previewSize === size));
    const dimensions = size === 'mobile' ? [390, 844] : [1280, 760];
    previewFrame.style.width = `${dimensions[0]}px`;
    previewFrame.style.height = `${dimensions[1]}px`;
    const scale = Math.min(previewViewport.clientWidth / dimensions[0], previewViewport.clientHeight / dimensions[1], 1);
    previewFrame.style.transform = `scale(${scale})`;
    previewFrame.style.left = `${Math.max(0, (previewViewport.clientWidth - dimensions[0] * scale) / 2)}px`;
  };

  document.querySelectorAll('[data-panel]').forEach((button) => button.addEventListener('click', () => switchPanel(button.dataset.panel)));
  document.querySelectorAll('[data-preview-size]').forEach((button) => button.addEventListener('click', () => setPreviewSize(button.dataset.previewSize)));
  editorForm.addEventListener('input', (event) => {
    const input = event.target.closest('[data-path]');
    if (!input || !state.draft) return;
    setPath(state.draft, input.dataset.path, input.value);
    if (input.dataset.path === 'assets.avatar' && Content.isSafeAssetUrl(input.value)) {
      const localPreview = $('#avatar-local-preview');
      if (localPreview && !state.avatarPreviewUrl) localPreview.src = adminAssetUrl(input.value);
    }
    updateDirty();
    updateValidation();
    sendPreview();
  });
  editorForm.addEventListener('change', (event) => {
    if (event.target.id !== 'avatar-file') return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showNotice('头像只支持 JPG、PNG 或 WebP。', 'error');
    if (file.size > 3 * 1024 * 1024) return showNotice('头像不能超过 3 MB。', 'error');
    if (state.avatarPreviewUrl) URL.revokeObjectURL(state.avatarPreviewUrl);
    state.pendingAvatar = file;
    state.avatarPreviewUrl = URL.createObjectURL(file);
    renderPanel('avatar');
    updateDirty();
    sendPreview();
    showNotice('新头像已进入预览，发布后才会上传。', 'success');
  });
  editorForm.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'add-project') return addItem('project');
    if (button.dataset.action === 'add-article') return addItem('article');
    if (button.dataset.action === 'add-contact') return addItem('contact');
    mutateCollection(button.dataset.action, button.dataset.collection, Number(button.dataset.index));
  });

  $('#connect').addEventListener('click', connect);
  $('#github-token').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); connect(); } });
  clearTokenButton.addEventListener('click', clearToken);
  publishButton.addEventListener('click', openPublish);
  $('#cancel-publish').addEventListener('click', closePublish);
  $('#drawer-backdrop').addEventListener('click', closePublish);
  $('#confirm-publish').addEventListener('click', publish);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePublish(); });
  window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== previewFrame.contentWindow || event.data?.type !== 'portfolio-preview-ready') return;
    state.previewReady = true;
    sendPreview();
  });
  previewFrame.addEventListener('load', () => { state.previewReady = true; sendPreview(); });
  new ResizeObserver(() => setPreviewSize(state.previewSize)).observe(previewViewport);

  const initialize = async () => {
    try {
      const response = await fetch('../content.json?source=admin', { cache: 'no-store' });
      if (!response.ok) throw new Error('读取失败');
      state.draft = Content.normalizeContent(await response.json());
      state.baseline = Content.clone(state.draft);
      showNotice('你可以先编辑和预览；连接 GitHub 后才能发布。');
    } catch {
      state.draft = Content.normalizeContent(recoveryContent());
      state.baseline = Content.clone(state.draft);
      showNotice('线上内容暂时无法读取，已打开恢复模板；建议先连接 GitHub 获取最新版。', 'error');
    }
    renderAll();
    switchPanel('profile');
    setPreviewSize('desktop');
    updateControls(Content.validateContent(state.draft));
    sendPreview();
  };

  initialize();
})();
