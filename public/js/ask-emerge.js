/**
 * Ask Emerge — shared Ecosystem Copilot (MIAW) launcher.
 * Works on any Emerge marketing host. Configure via window.EMERGE_ASK or data attrs.
 *
 * window.EMERGE_ASK = {
 *   site: 'hub'|'future'|'vela'|'vault'|'pods',
 *   orgId, siteUrl, scrt2Url, deploymentName
 * }
 */
(function () {
  if (window.__EMERGE_ASK_BOOTED__) return;
  window.__EMERGE_ASK_BOOTED__ = true;

  var cfg = Object.assign(
    {
      site: 'hub',
      orgId: '',
      siteUrl: '',
      scrt2Url: '',
      deploymentName: 'Emerge_Ecosystem_Copilot_Public',
      label: 'Ask Emerge',
    },
    window.EMERGE_ASK || {}
  );

  var greetings = {
    hub: 'Ask about Crawl–Walk–Run, ROAI, or which spoke fits.',
    future: 'Ask how Emerge stands up governed Agentforce.',
    vela: 'Ask how Return on AI Investment is measured.',
    vault: 'Ask how VaultOS makes knowledge agent-ready.',
    pods: 'Ask how Dev Pods keep seniors on every merge.',
  };

  if (!cfg.orgId || !cfg.siteUrl || !cfg.scrt2Url) {
    console.info('[AskEmerge] inactive — missing orgId/siteUrl/scrt2Url');
    return;
  }

  var ready = false;
  var launching = false;
  var initFailed = false;

  var root = document.createElement('div');
  root.id = 'emerge-agentforce-launcher';
  root.setAttribute('data-site', cfg.site);
  root.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Lexend,system-ui,sans-serif;';

  var statusEl = document.createElement('p');
  statusEl.id = 'emerge-agentforce-status';
  statusEl.setAttribute('role', 'status');
  statusEl.style.cssText =
    'display:none;max-width:min(300px,85vw);margin:0;padding:8px 12px;border-radius:12px;border:1px solid rgba(0,194,199,0.25);background:#fff;color:#0A1F3D;font-size:12px;box-shadow:0 10px 30px rgba(10,31,61,0.12);';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'emerge-agentforce-open';
  btn.textContent = cfg.label;
  btn.disabled = true;
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-label', greetings[cfg.site] || greetings.hub);
  btn.style.cssText =
    'border:0;cursor:pointer;border-radius:999px;background:#0A1F3D;color:#fff;padding:12px 20px;font-size:14px;font-weight:500;box-shadow:0 10px 30px rgba(10,31,61,0.25);outline:1px solid rgba(0,194,199,0.4);font-family:inherit;';
  btn.onmouseenter = function () {
    if (!btn.disabled) btn.style.background = '#0d2a52';
  };
  btn.onmouseleave = function () {
    btn.style.background = '#0A1F3D';
  };

  root.appendChild(statusEl);
  root.appendChild(btn);
  document.body.appendChild(root);

  function setStatus(msg, isError) {
    if (!msg) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
      return;
    }
    statusEl.textContent = msg;
    statusEl.style.borderColor = isError ? '#fca5a5' : 'rgba(0,194,199,0.25)';
    statusEl.style.color = isError ? '#991b1b' : '#0A1F3D';
    statusEl.style.display = 'block';
  }

  function boot() {
    return window.embeddedservice_bootstrap;
  }

  function sfFab() {
    return document.getElementById('embeddedMessagingConversationButton');
  }

  function hasLaunchPath() {
    var api = boot() && boot().utilAPI;
    return (api && typeof api.launchChat === 'function') || !!sfFab();
  }

  function applySiteContext() {
    window.__EMERGE_SITE__ = cfg.site;
    try {
      var b = boot();
      if (b && b.prechatAPI && typeof b.prechatAPI.setHiddenPrechatFields === 'function') {
        b.prechatAPI.setHiddenPrechatFields({ Emerge_Site: cfg.site });
      }
    } catch (e) {
      /* optional */
    }
  }

  function markReady() {
    if (initFailed) return;
    ready = true;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    setStatus('');
    applySiteContext();
  }

  function markFailed(msg) {
    initFailed = true;
    ready = false;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';
    setStatus(msg || 'Chat failed to initialize on this host.', true);
  }

  function launch() {
    if (launching || initFailed) return;
    if (!ready && !hasLaunchPath()) {
      setStatus('Chat is still loading — try again in a moment.', true);
      return;
    }
    launching = true;
    btn.disabled = true;
    setStatus('Opening chat…');
    applySiteContext();

    var done = function () {
      launching = false;
      if (ready && !initFailed) btn.disabled = false;
      setStatus('');
    };
    var fail = function () {
      launching = false;
      if (ready && !initFailed) btn.disabled = false;
      setStatus(
        'Could not open chat. Confirm this host is HTTPS and on the Salesforce CORS / Domain allowlist.',
        true
      );
    };

    var api = boot() && boot().utilAPI;
    if (api && typeof api.launchChat === 'function') {
      Promise.resolve(api.launchChat())
        .then(done)
        .catch(function () {
          var fab = sfFab();
          if (fab) {
            try {
              fab.click();
              done();
            } catch (e) {
              fail();
            }
          } else fail();
        });
      return;
    }
    var fab = sfFab();
    if (fab) {
      try {
        fab.click();
        done();
      } catch (e) {
        fail();
      }
      return;
    }
    fail();
  }

  btn.addEventListener('click', launch);
  window.addEventListener('onEmbeddedMessagingReady', markReady);
  window.addEventListener('onEmbeddedMessagingButtonCreated', markReady);
  window.addEventListener('onEmbeddedMessagingInitError', function () {
    markFailed('Salesforce chat init error. Check CORS / deployment publish.');
  });

  function tryInit() {
    var b = boot();
    if (!b) {
      markFailed('Chat bootstrap missing after script load.');
      return;
    }
    try {
      b.settings.language = 'en_US';
      b.settings.hideChatButtonOnLoad = true;
      b.init(cfg.orgId, cfg.deploymentName, cfg.siteUrl, { scrt2URL: cfg.scrt2Url });
    } catch (e) {
      markFailed('Chat failed to initialize.');
      return;
    }

    var checks = 0;
    var iv = setInterval(function () {
      checks += 1;
      if (ready || initFailed) {
        clearInterval(iv);
        return;
      }
      if (hasLaunchPath()) {
        markReady();
        clearInterval(iv);
        return;
      }
      if (!boot() && !sfFab() && checks >= 4) {
        markFailed(
          'Chat init aborted (host not allowed or deployment not ready).'
        );
        clearInterval(iv);
        return;
      }
      if (checks >= 24) {
        if (hasLaunchPath()) markReady();
        else
          markFailed(
            'Chat timed out initializing. Confirm this host is on the Embedded Service domain allowlist.'
          );
        clearInterval(iv);
      }
    }, 500);
  }

  function start() {
    setStatus('Loading chat…');
    window.__EMERGE_SITE__ = cfg.site;
    if (boot()) {
      tryInit();
      return;
    }
    var s = document.createElement('script');
    s.src = String(cfg.siteUrl).replace(/\/$/, '') + '/assets/js/bootstrap.min.js';
    s.async = true;
    s.onload = tryInit;
    s.onerror = function () {
      markFailed('Failed to load Salesforce chat bootstrap script.');
    };
    document.body.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
