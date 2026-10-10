/* ============================================
   Emo Echo — Chat Logic
   ============================================ */

(function () {
  'use strict';

  // --- State ---
  let sessionId = _newSessionId();
  let history = [];
  let isSending = false;

  // --- DOM refs ---
  const messagesEl    = document.getElementById('echoMessages');
  const inputEl       = document.getElementById('echoInput');
  const sendBtn       = document.getElementById('echoSendBtn');
  const typingEl      = document.getElementById('echoTyping');
  const clearBtn      = document.getElementById('echoClearBtn');
  const historyBtn    = document.getElementById('echoHistoryBtn');
  const historyPanel  = document.getElementById('echoHistoryPanel');
  const historyClose  = document.getElementById('echoHistoryClose');
  const sessionListEl = document.getElementById('echoSessionList');

  // --- Init ---
  function init() {
    _showWelcome();
    sendBtn.addEventListener('click', _handleSend);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _handleSend();
      }
    });
    inputEl.addEventListener('input', _autoResize);
    clearBtn.addEventListener('click', _clearChat);
    historyBtn.addEventListener('click', _openHistory);
    historyClose.addEventListener('click', function () {
      historyPanel.style.display = 'none';
    });
  }

  function _showWelcome() {
    messagesEl.innerHTML = '';
    history = [];
    _appendBotMsg("Hi, I'm Emo Echo. Share what's on your mind—your emotions will find their echo.\n\nIs there anything you'd like to tell me?");
  }

  // --- Send message ---
  function _handleSend() {
    const text = inputEl.value.trim();
    if (!text || isSending) return;

    _appendUserMsg(text);
    inputEl.value = '';
    _autoResize();
    _setLoading(true);

    _sendToApi(text)
      .then(function (data) {
        const reply = data.reply;
        _setLoading(false);
        _appendBotMsg(reply);
        if (data.reply_source !== 'fallback') {
          history.push({ role: 'user', content: text });
          history.push({ role: 'assistant', content: reply });
        } else {
          console.warn('[emo_echo] fallback:', data.error_code);
        }
        if (history.length > 20) history = history.slice(-20);
      })
      .catch(function (err) {
        console.error('[emo_echo]', err);
        _setLoading(false);
        _appendBotMsg("I'm here with you, and I'm listening. Would you like to tell me a little more about what's on your mind?");
      });
  }

  function _getParticipantCode() {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (user && user.username) return user.username;
    try {
      const raw = localStorage.getItem('emomirror.participant');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.participant_code) return p.participant_code;
      }
    } catch (e) {}
    try { return localStorage.getItem('participant_code') || 'local'; } catch (e) { return 'local'; }
  }

  async function _sendToApi(message) {
    const token = typeof Auth !== 'undefined' ? Auth.getToken() : '';
    const participantCode = _getParticipantCode();

    const payload = {
      message: message,
      session_id: sessionId,
      history: history.slice(-10),
      participant_code: participantCode,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch('/api/emo-echo/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.detail || {};
      throw new Error(detail.message || (typeof detail === 'string' ? detail : 'API error ' + res.status));
    }
    const data = await res.json();
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Empty model response');
    return data;
  }

  // --- DOM helpers ---
  function _appendBotMsg(text) {
    const row = document.createElement('div');
    row.className = 'echo-msg is-bot';
    row.innerHTML =
      '<img class="echo-avatar-sm" src="/static/icon_chatbox.png" alt="" aria-hidden="true" />' +
      '<div>' +
        '<div class="echo-bubble">' + _escapeHtml(text) + '</div>' +
        '<div class="echo-time">' + _timeStr() + '</div>' +
      '</div>';
    messagesEl.appendChild(row);
    _scrollToBottom();
  }

  function _appendUserMsg(text) {
    const initial = _getUserInitial();
    const row = document.createElement('div');
    row.className = 'echo-msg is-user';
    row.innerHTML =
      '<div class="echo-user-avatar">' + _escapeHtml(initial) + '</div>' +
      '<div>' +
        '<div class="echo-bubble">' + _escapeHtml(text) + '</div>' +
        '<div class="echo-time">' + _timeStr() + '</div>' +
      '</div>';
    messagesEl.appendChild(row);
    _scrollToBottom();
  }

  function _setLoading(loading) {
    isSending = loading;
    sendBtn.disabled = loading;
    clearBtn.disabled = loading;
    historyBtn.disabled = loading;
    typingEl.style.display = loading ? 'flex' : 'none';
    if (loading) _scrollToBottom();
  }

  function _scrollToBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function _autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
  }

  function _clearChat() {
    if (isSending) return;
    sessionId = _newSessionId();
    history = [];
    messagesEl.innerHTML = '';
    _showWelcome();
    inputEl.focus();
  }

  // --- History ---
  function _openHistory() {
    historyPanel.style.display = 'block';
    sessionListEl.innerHTML = '<p class="echo-history-empty">' + _t('echo.historyLoading', 'Loading…') + '</p>';
    _loadHistory();
  }

  function _t(key, fallback) {
    return (typeof SharedI18N !== 'undefined') ? SharedI18N.t(key) : fallback;
  }

  async function _loadHistory() {
    const token = typeof Auth !== 'undefined' ? Auth.getToken() : '';
    const participantCode = _getParticipantCode();
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const url = '/api/emo-echo/sessions?participant_code=' + encodeURIComponent(participantCode);
    try {
      const res = await fetch(url, { headers: headers });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      _renderSessionList(data.sessions || []);
    } catch (e) {
      sessionListEl.innerHTML = '<p class="echo-history-empty">' + _t('echo.historyFail', '加载失败，请稍后重试。') + '</p>';
    }
  }

  function _renderSessionList(sessions) {
    if (!sessions.length) {
      sessionListEl.innerHTML = '<p class="echo-history-empty">' + _t('echo.historyEmpty', '还没有历史对话记录。') + '</p>';
      return;
    }
    const lang = (typeof SharedI18N !== 'undefined') ? SharedI18N.lang() : 'en';
    const locale = lang === 'en' ? 'en-US' : 'zh-CN';
    sessionListEl.innerHTML = '';
    sessions.forEach(function (s) {
      const d = new Date(s.last_active_at || s.created_at);
      const dateStr = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      const preview = s.preview || '(Empty chat)';
      const count = s.message_count || 0;
      const item = document.createElement('div');
      item.className = 'echo-session-item';
      item.innerHTML =
        '<div class="echo-session-preview">' + _escapeHtml(preview) + '</div>' +
        '<div class="echo-session-meta">' + _escapeHtml(dateStr + ' ' + timeStr) + ' · ' + count + ' ' + _t('echo.msgCount', '条消息') + '</div>';
      item.addEventListener('click', function () { _restoreSession(s); });
      sessionListEl.appendChild(item);
    });
  }

  function _restoreSession(s) {
    if (isSending) return;
    const msgs = s.messages || [];
    sessionId = s.session_uuid;
    messagesEl.innerHTML = '';
    history = msgs.slice(-20).map(function (m) {
      return { role: m.role, content: m.content };
    });
    if (!msgs.length) {
      _showWelcome();
    } else {
      msgs.forEach(function (m) {
        if (m.role === 'user') _appendUserMsg(m.content);
        else _appendBotMsg(m.content);
      });
    }
    historyPanel.style.display = 'none';
    inputEl.focus();
  }

  // --- Utils ---
  function _newSessionId() {
    return 'echo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function _getUserInitial() {
    const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (user) return (user.display_name || user.username || 'U').charAt(0).toUpperCase();
    try {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        const info = JSON.parse(raw);
        const name = info.display_name || info.username || '';
        if (name) return name.charAt(0).toUpperCase();
      }
    } catch (e) { /* ignore */ }
    return 'U';
  }

  function _timeStr() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
