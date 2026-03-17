/**
 * VocabMaster - 本地数据库模块
 * 使用 localStorage 模拟用户系统和数据持久化
 */
const DB = (() => {
  const KEY_USERS   = 'vm_users';
  const KEY_SESSION = 'vm_session';
  const KEY_DATA    = 'vm_data_'; // + username

  // ===== 初始化管理员 =====
  function init() {
    const users = getUsers();
    if (!users['admin']) {
      users['admin'] = {
        username: 'admin',
        password: btoa('admin888'),
        nickname: '管理员',
        role: 'admin',
        createdAt: Date.now(),
        disabled: false
      };
      saveUsers(users);
    }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(KEY_USERS) || '{}'); } catch(e) { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(KEY_USERS, JSON.stringify(u)); }

  // ===== 用户认证 =====
  function register(username, password, nickname) {
    const users = getUsers();
    if (users[username]) return { ok: false, msg: '用户名已存在' };
    users[username] = {
      username, nickname,
      password: btoa(password),
      role: 'user',
      createdAt: Date.now(),
      disabled: false
    };
    saveUsers(users);
    return { ok: true };
  }

  function login(username, password) {
    const users = getUsers();
    const u = users[username];
    if (!u) return { ok: false, msg: '用户名不存在' };
    if (u.disabled) return { ok: false, msg: '账号已被禁用，请联系管理员' };
    if (atob(u.password) !== password) return { ok: false, msg: '密码错误' };
    localStorage.setItem(KEY_SESSION, username);
    return { ok: true, user: u };
  }

  function logout() { localStorage.removeItem(KEY_SESSION); }

  function currentUser() {
    const username = localStorage.getItem(KEY_SESSION);
    if (!username) return null;
    const users = getUsers();
    return users[username] || null;
  }

  function requireLogin(adminOnly = false) {
    const u = currentUser();
    if (!u) { window.location.href = 'index.html'; return null; }
    if (adminOnly && u.role !== 'admin') { window.location.href = 'app.html'; return null; }
    return u;
  }

  // ===== 用户学习数据 =====
  function getUserData(username) {
    try {
      return JSON.parse(localStorage.getItem(KEY_DATA + username) || 'null') || newUserData();
    } catch(e) { return newUserData(); }
  }

  function saveUserData(username, data) {
    localStorage.setItem(KEY_DATA + username, JSON.stringify(data));
  }

  function newUserData() {
    return {
      selectedLevel: 'cet4',
      levelIndex: {},        // 每级别已学到第几个
      wordProgress: {},      // key -> {interval, nextReview, consecCorrect, errorCount, mastered}
      errorWords: [],        // [{w,m,p,pos,e,lvl,count,consecCorrect}]
      masterWords: [],       // [{w,m,p,pos,e,lvl,masteredAt}]
      totalCorrect: 0,
      totalWrong: 0,
      todayCount: 0,
      lastStudyDate: null,
      streak: 0,
      studyDates: []
    };
  }

  // ===== 管理员操作 =====
  function getAllUsers() {
    const users = getUsers();
    return Object.values(users).map(u => {
      const data = getUserData(u.username);
      return {
        ...u,
        totalCorrect: data.totalCorrect,
        totalWrong: data.totalWrong,
        todayCount: data.todayCount,
        streak: data.streak,
        masteredCount: data.masterWords.length,
        errorCount: data.errorWords.length
      };
    });
  }

  function toggleDisable(username) {
    const users = getUsers();
    if (!users[username] || username === 'admin') return false;
    users[username].disabled = !users[username].disabled;
    saveUsers(users);
    return true;
  }

  function deleteUser(username) {
    if (username === 'admin') return false;
    const users = getUsers();
    delete users[username];
    saveUsers(users);
    localStorage.removeItem(KEY_DATA + username);
    return true;
  }

  function resetPassword(username, newPass) {
    const users = getUsers();
    if (!users[username]) return false;
    users[username].password = btoa(newPass);
    saveUsers(users);
    return true;
  }

  init();
  return { register, login, logout, currentUser, requireLogin, getUserData, saveUserData, getAllUsers, toggleDisable, deleteUser, resetPassword };
})();
