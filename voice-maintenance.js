(function () {
  'use strict';

  var MESSAGE = 'Технические работы, пока можете пользоваться чатом';
  var VOICE_PATHS = ['/voice', '/voice-lawyer', '/voice-live', '/audio-call'];
  var overlayId = 'voice-maintenance-overlay';
  var adminId = 'voice-maintenance-admin-control';
  var renderedAdminState = null;

  function isVoicePage() {
    return VOICE_PATHS.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + '/') === 0;
    });
  }

  function isAdminPage() {
    return location.pathname === '/admin' || location.pathname.indexOf('/admin/') === 0;
  }

  function request(url, options) {
    return fetch(url, Object.assign({ cache: 'no-store' }, options || {})).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function removeElement(id) {
    var element = document.getElementById(id);
    if (element) element.remove();
  }

  function showVoiceMaintenance(message) {
    removeElement(overlayId);

    var overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.setAttribute('role', 'status');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:24px',
      'background:linear-gradient(145deg,#f8fff9 0%,#eef9f0 100%)',
      'font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#17251a',
      'text-align:center'
    ].join(';');

    overlay.innerHTML =
      '<div style="width:min(100%,520px);padding:40px 28px;border:1px solid rgba(30,152,58,.18);' +
      'border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(20,80,34,.12)">' +
      '<div style="width:64px;height:64px;margin:0 auto 22px;border-radius:50%;display:grid;place-items:center;' +
      'background:#eaf8ed;color:#1e983a;font-size:30px">🛠</div>' +
      '<h1 style="margin:0 0 12px;font-size:clamp(24px,5vw,34px);line-height:1.15">Технические работы</h1>' +
      '<p style="margin:0 auto 28px;max-width:420px;color:#526257;font-size:17px;line-height:1.55">' +
      escapeHtml(message || MESSAGE) + '</p>' +
      '<a href="/chat" style="display:inline-flex;align-items:center;justify-content:center;min-height:48px;' +
      'padding:0 24px;border-radius:12px;background:#1e983a;color:#fff;text-decoration:none;font-weight:700">' +
      'Перейти в чат</a></div>';

    document.body.appendChild(overlay);
  }

  function escapeHtml(value) {
    var element = document.createElement('div');
    element.textContent = String(value || '');
    return element.innerHTML;
  }

  function refreshVoicePage() {
    if (!isVoicePage()) {
      removeElement(overlayId);
      return;
    }

    request('/api/voice/status')
      .then(function (status) {
        if (status.enabled) showVoiceMaintenance(status.message);
        else removeElement(overlayId);
      })
      .catch(function () {
        // При недоступности status API не блокируем обычный интерфейс.
      });
  }

  function getAdminHeaders() {
    var token = localStorage.getItem('galina-admin-token') || localStorage.getItem('galina-token');
    return token ? {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    } : null;
  }

  function renderAdminControl(status) {
    removeElement(adminId);
    renderedAdminState = String(status.enabled);

    var panel = document.createElement('section');
    panel.id = adminId;
    panel.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'z-index:2147483000',
      'width:min(360px,calc(100vw - 40px))',
      'padding:18px',
      'border:1px solid #dce8df',
      'border-radius:16px',
      'background:#fff',
      'box-shadow:0 16px 45px rgba(20,60,28,.18)',
      'font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#17251a'
    ].join(';');

    panel.innerHTML =
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">' +
      '<div><strong style="display:block;font-size:16px">Голосовой режим</strong>' +
      '<span data-maintenance-label style="display:block;margin-top:5px;color:#667369;font-size:13px">' +
      (status.enabled ? 'Технические работы включены' : 'Работает для пользователей') +
      '</span></div>' +
      '<button type="button" data-maintenance-toggle style="border:0;border-radius:10px;padding:10px 14px;' +
      'cursor:pointer;font-weight:700;color:#fff;background:' + (status.enabled ? '#b42318' : '#1e983a') + '">' +
      (status.enabled ? 'Выключить' : 'Включить') + '</button></div>' +
      '<p style="margin:14px 0 0;color:#667369;font-size:13px;line-height:1.45">' + MESSAGE + '</p>';

    var button = panel.querySelector('[data-maintenance-toggle]');
    button.addEventListener('click', function () {
      var headers = getAdminHeaders();
      if (!headers) return;

      button.disabled = true;
      button.textContent = 'Сохраняю…';
      request('/api/admin/voice-maintenance', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ enabled: !status.enabled, message: MESSAGE })
      }).then(renderAdminControl).catch(function () {
        button.disabled = false;
        button.textContent = 'Ошибка — повторить';
      });
    });

    document.body.appendChild(panel);
  }

  function refreshAdminPage() {
    if (!isAdminPage()) {
      removeElement(adminId);
      renderedAdminState = null;
      return;
    }

    var headers = getAdminHeaders();
    if (!headers) {
      removeElement(adminId);
      renderedAdminState = null;
      return;
    }

    request('/api/admin/voice-maintenance', { headers: headers })
      .then(function (status) {
        var signature = String(status.enabled);
        if (document.getElementById(adminId) && renderedAdminState === signature) return;

        renderedAdminState = signature;
        renderAdminControl(status);
      })
      .catch(function () {
        removeElement(adminId);
        renderedAdminState = null;
      });
  }

  function refresh() {
    refreshVoicePage();
    refreshAdminPage();
  }

  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      window.dispatchEvent(new Event('app:navigation'));
      return result;
    };
  });

  window.addEventListener('popstate', refresh);
  window.addEventListener('app:navigation', refresh);
  // Вход в админку и рендер голосового экрана происходят без смены URL.
  setInterval(refresh, 4000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
