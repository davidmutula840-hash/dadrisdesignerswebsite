/* =========================================================
   DADRIS DESIGNERS — PWA Init Script
   Paste this as ONE script tag in every HTML page, just before </body>
   <script src="pwa-init.js"></script>
   ========================================================= */

(function () {

  // ---- Register Service Worker ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/dadrisdesignerswebsite/sw.js', {
        scope: '/dadrisdesignerswebsite/'
      }).then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope);
      }).catch(err => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    });
  }

  // ---- Install Prompt (Android Chrome) ----
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show custom install banner after 10 seconds if not already installed
    setTimeout(() => {
      if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        showInstallBanner();
      }
    }, 10000);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const banner = document.getElementById('dd-install-banner');
    if (banner) banner.remove();
    console.log('[PWA] App installed!');
  });

  // ---- Custom Install Banner ----
  function showInstallBanner() {
    if (document.getElementById('dd-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'dd-install-banner';
    banner.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(135deg, #0a1a0e, #1a3a12);
      padding: 16px 20px; display: flex; align-items: center; gap: 14px;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
      font-family: 'DM Sans', sans-serif;
      animation: dd-slide-up 0.4s cubic-bezier(.34,1.56,.64,1);
    `;

    const style = document.createElement('style');
    style.textContent = `@keyframes dd-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`;
    document.head.appendChild(style);

    banner.innerHTML = `
      <img src="/dadrisdesignerswebsite/images/logo.jpg"
           style="width:44px;height:44px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);flex-shrink:0;" />
      <div style="flex:1;">
        <div style="color:#fff;font-weight:700;font-size:0.9rem;">Add to Home Screen</div>
        <div style="color:rgba(255,255,255,0.6);font-size:0.75rem;margin-top:2px;">Install DADRIS DESIGNERS as an app</div>
      </div>
      <button id="dd-install-btn" style="
        background: #1a8c2e; color: #fff; border: none; border-radius: 50px;
        padding: 10px 20px; font-weight: 700; font-size: 0.82rem;
        cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap;
      ">Install</button>
      <button id="dd-install-close" style="
        background: none; border: none; color: rgba(255,255,255,0.5);
        font-size: 1.2rem; cursor: pointer; padding: 4px; line-height: 1;
      ">✕</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('dd-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.remove();
      console.log('[PWA] Install outcome:', outcome);
    });

    document.getElementById('dd-install-close').addEventListener('click', () => {
      banner.remove();
    });
  }

  // ---- iOS Install Hint (Safari doesn't support beforeinstallprompt) ----
  const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isInStandalone = window.navigator.standalone;
  const iosShown = sessionStorage.getItem('dd-ios-hint-shown');

  if (isIos && !isInStandalone && !iosShown) {
    sessionStorage.setItem('dd-ios-hint-shown', '1');
    setTimeout(() => {
      const hint = document.createElement('div');
      hint.id = 'dd-ios-hint';
      hint.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(10,26,14,0.95); color: #fff;
        padding: 14px 20px; border-radius: 16px; z-index: 99999;
        font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
        text-align: center; max-width: 300px; width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        border: 1px solid rgba(26,140,46,0.3);
        animation: dd-slide-up 0.4s ease;
      `;
      hint.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:#6ee87b;">📲 Install as App</div>
        <div style="color:rgba(255,255,255,0.75);line-height:1.5;">
          Tap <strong style="color:#fff;">Share</strong> 
          <span style="font-size:1rem;">⬆️</span> then 
          <strong style="color:#fff;">"Add to Home Screen"</strong> 
          to install DADRIS DESIGNERS
        </div>
        <button onclick="document.getElementById('dd-ios-hint').remove()" style="
          margin-top:12px;background:#1a8c2e;color:#fff;border:none;
          border-radius:50px;padding:8px 20px;font-weight:700;
          font-family:'DM Sans',sans-serif;cursor:pointer;font-size:0.8rem;
        ">Got it!</button>
      `;
      document.body.appendChild(hint);
      setTimeout(() => { if (document.getElementById('dd-ios-hint')) hint.remove(); }, 12000);
    }, 8000);
  }

})();
