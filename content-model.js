(function (global) {
  'use strict';

  const TONES = new Set(['blue', 'green', 'amber']);
  const CHANNEL_TYPES = new Set(['github', 'wechat', 'email', 'website', 'link']);
  const URL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const stringValue = (value, fallback = '') => typeof value === 'string' ? value : fallback;

  const safeId = (value, fallback) => {
    const id = stringValue(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return id || fallback;
  };

  const isSafeUrl = (value, { allowRelative = false } = {}) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const input = value.trim();
    if (allowRelative && !input.includes('://') && !input.startsWith('//')) {
      return !input.startsWith('/') && !input.includes(':') && !input.includes('..') && !input.includes('\\') && /^[a-zA-Z0-9._/-]+$/.test(input);
    }
    try {
      return URL_PROTOCOLS.has(new URL(input).protocol);
    } catch {
      return false;
    }
  };

  const isSafeAssetUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const input = value.trim();
    if (!input.includes('://') && !input.startsWith('//')) return isSafeUrl(input, { allowRelative: true });
    try {
      return new URL(input).protocol === 'https:';
    } catch {
      return false;
    }
  };

  const uniqueId = (requested, prefix, used, index) => {
    const base = safeId(requested, `${prefix}-${index + 1}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  };

  const normalizeContent = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('内容文件格式不正确');
    const content = clone(raw);
    content.schemaVersion = 1;
    content.revision = stringValue(content.revision, new Date(0).toISOString());
    content.profile = content.profile && typeof content.profile === 'object' ? content.profile : {};
    content.assets = content.assets && typeof content.assets === 'object' ? content.assets : {};
    content.decisionSystem = content.decisionSystem && typeof content.decisionSystem === 'object' ? content.decisionSystem : {};
    content.workSection = content.workSection && typeof content.workSection === 'object' ? content.workSection : {};
    content.notesSection = content.notesSection && typeof content.notesSection === 'object' ? content.notesSection : {};
    content.contactSection = content.contactSection && typeof content.contactSection === 'object' ? content.contactSection : {};

    content.profile.formula = Array.isArray(content.profile.formula)
      ? content.profile.formula.slice(0, 3).map((item) => stringValue(item))
      : [];
    while (content.profile.formula.length < 3) content.profile.formula.push('');

    const laneIds = new Set();
    content.decisionSystem.lanes = Array.isArray(content.decisionSystem.lanes)
      ? content.decisionSystem.lanes.slice(0, 3).map((lane, index) => ({
          ...(lane && typeof lane === 'object' ? lane : {}),
          id: uniqueId(lane?.id, 'lane', laneIds, index),
          tone: TONES.has(lane?.tone) ? lane.tone : ['blue', 'green', 'amber'][index]
        }))
      : [];

    const projectIds = new Set();
    content.workSection.projects = Array.isArray(content.workSection.projects)
      ? content.workSection.projects.map((project, index) => ({
          ...(project && typeof project === 'object' ? project : {}),
          id: uniqueId(project?.id, 'project', projectIds, index)
        }))
      : [];

    const articleIds = new Set();
    content.notesSection.articles = Array.isArray(content.notesSection.articles)
      ? content.notesSection.articles.map((article, index) => ({
          ...(article && typeof article === 'object' ? article : {}),
          id: uniqueId(article?.id, 'article', articleIds, index),
          tone: TONES.has(article?.tone) ? article.tone : 'blue'
        }))
      : [];

    const channelIds = new Set();
    content.contactSection.channels = Array.isArray(content.contactSection.channels)
      ? content.contactSection.channels.map((channel, index) => ({
          ...(channel && typeof channel === 'object' ? channel : {}),
          id: uniqueId(channel?.id, 'channel', channelIds, index),
          type: CHANNEL_TYPES.has(channel?.type) ? channel.type : 'link'
        }))
      : [];

    return content;
  };

  const validateContent = (raw) => {
    const errors = [];
    let content;
    try {
      content = normalizeContent(raw);
    } catch (error) {
      return [{ path: 'content', message: error.message }];
    }

    const required = (path, value, label) => {
      if (!stringValue(value).trim()) errors.push({ path, message: `${label}不能为空` });
    };
    const textLimit = (path, value, label, limit) => {
      if (stringValue(value).length > limit) errors.push({ path, message: `${label}不能超过 ${limit} 个字符` });
    };
    const url = (path, value, label, optional = false) => {
      if (optional && !stringValue(value).trim()) return;
      if (!isSafeUrl(value)) errors.push({ path, message: `${label}需要填写 http、https 或 mailto 链接` });
      else textLimit(path, value, label, 2048);
    };

    required('profile.name', content.profile.name, '姓名');
    required('profile.role', content.profile.role, '职业名称');
    required('profile.statement', content.profile.statement, '首页主张');
    textLimit('profile.name', content.profile.name, '姓名', 120);
    textLimit('profile.role', content.profile.role, '职业名称', 120);
    textLimit('profile.statement', content.profile.statement, '首页主张', 600);

    if (content.decisionSystem.lanes.length !== 3) errors.push({ path: 'decisionSystem.lanes', message: '决策路径必须保留三条' });
    content.decisionSystem.lanes.forEach((lane, index) => {
      required(`decisionSystem.lanes.${index}.inputTitle`, lane.inputTitle, `第 ${index + 1} 条路径的输入`);
      required(`decisionSystem.lanes.${index}.outputTitle`, lane.outputTitle, `第 ${index + 1} 条路径的输出`);
      required(`decisionSystem.lanes.${index}.description`, lane.description, `第 ${index + 1} 条路径的说明`);
    });

    if (content.workSection.projects.length < 1) errors.push({ path: 'workSection.projects', message: '至少保留一个项目' });
    content.workSection.projects.forEach((project, index) => {
      required(`workSection.projects.${index}.title`, project.title, `项目 ${index + 1} 的标题`);
      url(`workSection.projects.${index}.url`, project.url, `项目 ${index + 1} 的链接`);
    });
    url('workSection.overviewUrl', content.workSection.overviewUrl, '项目总入口', true);

    content.notesSection.articles.forEach((article, index) => {
      required(`notesSection.articles.${index}.title`, article.title, `文章 ${index + 1} 的标题`);
      url(`notesSection.articles.${index}.url`, article.url, `文章 ${index + 1} 的链接`);
    });

    url('contactSection.primaryUrl', content.contactSection.primaryUrl, '主要联系方式', true);
    content.contactSection.channels.forEach((channel, index) => {
      required(`contactSection.channels.${index}.value`, channel.value, `联系方式 ${index + 1} 的展示文字`);
      url(`contactSection.channels.${index}.url`, channel.url, `联系方式 ${index + 1} 的链接`);
    });

    const avatar = stringValue(content.assets.avatar);
    if (avatar && !isSafeAssetUrl(avatar)) errors.push({ path: 'assets.avatar', message: '头像需要填写仓库内路径或 HTTPS 地址' });

    const walk = (value, path = '') => {
      if (typeof value === 'string' && !path.endsWith('Url') && !path.endsWith('.url') && !path.endsWith('avatar')) {
        textLimit(path, value, '文字', 600);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}.${index}`));
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => walk(item, path ? `${path}.${key}` : key));
      }
    };
    walk(content);

    return errors;
  };

  global.PortfolioContent = Object.freeze({
    CHANNEL_TYPES: [...CHANNEL_TYPES],
    TONES: [...TONES],
    clone,
    isSafeAssetUrl,
    isSafeUrl,
    normalizeContent,
    safeId,
    stringValue,
    validateContent
  });
})(window);
