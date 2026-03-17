/**
 * VocabMaster - 词库动态加载模块
 * 支持按需加载大型词库文件（5万+词汇）
 */
const WordLoader = (() => {
  // 词库配置：key -> 文件路径 + 元信息
  const LEVELS = {
    middle:   { file: 'words/middle.json',   name: '初中',      color: '#4ade80', count: 3223  },
    high:     { file: 'words/high.json',     name: '高中',      color: '#60a5fa', count: 6008  },
    cet4:     { file: 'words/cet4.json',     name: 'CET-4',     color: '#22d3ee', count: 7508  },
    cet6:     { file: 'words/cet6.json',     name: 'CET-6',     color: '#f472b6', count: 5651  },
    postgrad: { file: 'words/postgrad.json', name: '考研',      color: '#a78bfa', count: 9602  },
    toefl:    { file: 'words/toefl.json',    name: 'TOEFL',     color: '#34d399', count: 13477 },
    sat:      { file: 'words/sat.json',      name: 'SAT',       color: '#fb923c', count: 8887  }
  };

  // 内存缓存（已加载的词库）
  const _cache = {};
  // 加载状态
  const _loading = {};
  // 干扰选项缓冲池（各级别随机采样的含义）
  const _decoysPool = {};

  /**
   * 加载某个级别的词库
   * @returns Promise<Array>
   */
  function load(levelKey) {
    if (_cache[levelKey]) return Promise.resolve(_cache[levelKey]);
    if (_loading[levelKey]) return _loading[levelKey];

    const cfg = LEVELS[levelKey];
    if (!cfg) return Promise.reject(new Error('未知词库: ' + levelKey));

    // 优先尝试从内嵌词库加载（离线可用）
    if (typeof WORD_BANK_EMBEDDED !== 'undefined' && WORD_BANK_EMBEDDED[levelKey]) {
      const embeddedData = WORD_BANK_EMBEDDED[levelKey];
      _cache[levelKey] = embeddedData;
      _buildDecoysPool(levelKey, embeddedData);
      console.log('[WordLoader] ' + cfg.name + ' 从内嵌词库加载，共 ' + embeddedData.length + ' 词');
      return Promise.resolve(embeddedData);
    }

    // fallback 到网络加载
    _loading[levelKey] = fetch(cfg.file)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        _cache[levelKey] = data;
        // 预热干扰选项池（随机抽200个含义）
        _buildDecoysPool(levelKey, data);
        delete _loading[levelKey];
        console.log('[WordLoader] ' + cfg.name + ' 词库加载完成，共 ' + data.length + ' 词');
        return data;
      });

    return _loading[levelKey];
  }

  /**
   * 预加载多个级别
   */
  function preload(keys) {
    return Promise.all(keys.map(k => load(k).catch(() => [])));
  }

  /**
   * 获取已缓存的词库（同步）
   */
  function get(levelKey) {
    return _cache[levelKey] || null;
  }

  /**
   * 获取某条词（同步，已加载时用）
   */
  function getWord(levelKey, idx) {
    const bank = _cache[levelKey];
    if (!bank) return null;
    return bank[idx] || null;
  }

  /**
   * 构建干扰选项池（每个级别随机取200个不重复含义）
   */
  function _buildDecoysPool(levelKey, data) {
    const pool = [];
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    for (const w of shuffled) {
      if (w.m && pool.length < 300) pool.push(w.m);
    }
    _decoysPool[levelKey] = pool;
  }

  /**
   * 获取干扰选项（排除正确答案）
   */
  function getDecoys(correct, count = 3) {
    // 汇总所有已加载级别的干扰池
    const all = [];
    for (const key of Object.keys(_decoysPool)) {
      all.push(..._decoysPool[key]);
    }
    // 如果池子不够，从缓存随机取
    if (all.length < 50) {
      for (const key of Object.keys(_cache)) {
        const bank = _cache[key];
        for (let i = 0; i < Math.min(50, bank.length); i++) {
          const r = bank[Math.floor(Math.random() * bank.length)];
          if (r.m) all.push(r.m);
        }
      }
    }

    const result = [];
    const used = new Set([correct]);
    // 打乱后取不重复的
    const shuffled = all.sort(() => Math.random() - 0.5);
    for (const m of shuffled) {
      if (!used.has(m)) {
        result.push(m);
        used.add(m);
        if (result.length >= count) break;
      }
    }
    // 兜底：如果还不够，生成占位
    while (result.length < count) {
      result.push('（无效选项）');
    }
    return result;
  }

  /**
   * 获取词库配置信息
   */
  function getLevelInfo(key) {
    return LEVELS[key] || null;
  }

  function getAllLevels() {
    return LEVELS;
  }

  function isLoaded(key) {
    return !!_cache[key];
  }

  return { load, preload, get, getWord, getDecoys, getLevelInfo, getAllLevels, isLoaded };
})();
