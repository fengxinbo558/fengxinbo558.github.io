// ============ NAXE 博客 — 交互与动效 ============
(function () {
  'use strict';

  // ---------- 加载页 ----------
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader && loader.classList.add('done'), 350);
  });
  // 兜底：万一 load 已过
  setTimeout(() => loader && loader.classList.add('done'), 2500);

  // ---------- 逐字母拆分（标题显现） ----------
  const splitText = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((word) => {
            if (!word) return;
            if (/^\s+$/.test(word)) {
              const s = document.createElement('span');
              s.className = 'space';
              s.textContent = ' ';
              frag.appendChild(s);
            } else {
              const w = document.createElement('span');
              w.className = 'word';
              [...word].forEach((ch) => {
                const l = document.createElement('span');
                l.className = 'letter';
                l.textContent = ch;
                w.appendChild(l);
              });
              frag.appendChild(w);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    // 交错延迟
    [...el.querySelectorAll('.letter')].forEach((l, i) => {
      l.style.transitionDelay = (i * 24) + 'ms';
    });
  };
  document.querySelectorAll('.split-text').forEach(splitText);

  // ---------- 字母上翻 hover（blink-text） ----------
  const blinkText = (el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch) => {
      const c = document.createElement('span');
      c.className = 'bchar';
      const safe = ch === ' ' ? '\u00A0' : ch;
      c.innerHTML = '<span class="out">' + safe + '</span><span class="in">' + safe + '</span>';
      el.appendChild(c);
    });
  };
  document.querySelectorAll('.blink-text').forEach(blinkText);

  // ---------- 滚动显现 ----------
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // 交错：同类兄弟元素逐个延迟
          const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
          const idx = siblings.indexOf(el);
          el.style.transitionDelay = (idx % 4) * 90 + 'ms';
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // ---------- 标题显现 ----------
  const splitObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          splitObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  document.querySelectorAll('.split-text').forEach((el) => splitObserver.observe(el));

  // ---------- 数字递增 ----------
  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

  // ---------- 技能进度条 ----------
  const skillObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bar = entry.target.querySelector('.skill-bar > div');
          if (bar) bar.style.width = bar.dataset.width;
          skillObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  document.querySelectorAll('.skill').forEach((el) => skillObserver.observe(el));

  // ---------- 跑马灯（复制一份实现无缝循环） ----------
  const track = document.querySelector('.marquee-track');
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  // ---------- 顶栏 + 全屏菜单 ----------
  const header = document.getElementById('header');
  const menu = document.getElementById('menu');
  const hamburger = document.getElementById('hamburger');

  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  hamburger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // ---------- 专栏切换 ----------
  const seriesItems = document.querySelectorAll('.series-item');
  const seriesPanels = document.querySelectorAll('.series-panel');
  seriesItems.forEach((item) => {
    item.addEventListener('click', () => {
      seriesItems.forEach((i) => i.classList.remove('is-active'));
      seriesPanels.forEach((p) => p.classList.remove('is-active'));
      item.classList.add('is-active');
      const idx = item.dataset.index;
      seriesPanels.forEach((p) => {
        if (p.dataset.index === idx) p.classList.add('is-active');
      });
    });
    item.addEventListener('mouseenter', () => {
      if (window.innerWidth <= 960) return;
      item.click();
    });
  });

  // ---------- FAQ 手风琴 ----------
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((o) => {
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = '0px';
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ---------- 读者说轮播 ----------
  const quoteTrack = document.getElementById('quoteTrack');
  const slides = quoteTrack ? quoteTrack.querySelectorAll('.quote-slide') : [];
  let qi = 0;
  const goQuote = (n) => {
    qi = (n + slides.length) % slides.length;
    quoteTrack.style.transform = 'translateX(-' + qi * 100 + '%)';
  };
  document.getElementById('quotePrev') && document.getElementById('quotePrev').addEventListener('click', () => goQuote(qi - 1));
  document.getElementById('quoteNext') && document.getElementById('quoteNext').addEventListener('click', () => goQuote(qi + 1));

  // ---------- 回到顶部 ----------
  document.getElementById('scrollTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------- 视差 + 顶栏状态（rAF 合帧） ----------
  const rellaxEls = document.querySelectorAll('.rellax');
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    if (y > 20) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    rellaxEls.forEach((el, i) => {
      el.style.transform = 'translateY(' + y * (0.08 + i * 0.02) + 'px)';
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  update();

  // ---------- 年份 ----------
  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- 复制微信号 + Toast ----------
  const copyText = (text) => {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  };
  const showToast = (msg) => {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 1500);
  };
  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => {
      copyText(el.dataset.copy);
      showToast('已复制');
    });
  });
})();
