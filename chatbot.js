/* =========================================================
   DADRIS DESIGNERS — AI Chatbot Widget
   Drop this script at the bottom of any page, just before </body>
   ========================================================= */

(function () {

  const BRAND = {
    green: '#1a8c2e',
    greenLight: '#22a838',
    dark: '#0a1a0e',
    yellow: '#f4b400',
    red: '#e53935',
    blue: '#1565c0',
  };

  const SYSTEM_PROMPT = `You are Aida, the friendly and professional AI assistant for DADRIS DESIGNERS — a creative graphic and web design studio based in Kenya.

Your job is to help website visitors learn about our services, pricing, portfolio, and how to get started. You are warm, enthusiastic, and knowledgeable.

ABOUT DADRIS DESIGNERS:
- Business: DADRIS DESIGNERS
- Tagline: "Designs. Define Dadris"
- Location: Kenya
- Phone/WhatsApp: 0745365756
- Email: dadrisdesigners@gmail.com

SERVICES WE OFFER:
1. Logo Design — Custom logos that define your brand identity
2. Graphic Design — Flyers, posters, banners, social media graphics
3. Web Design — Modern, responsive websites for businesses
4. Branding & Identity — Full brand packages including colors, fonts, style guides
5. Social Media Design — Consistent, engaging content for all platforms
6. Print & Packaging — Business cards, letterheads, packaging design

PORTFOLIO HIGHLIGHTS:
- CJPD Kakamega Diocese website
- Dadris Designers Academy website
- Glorious Gospel Church flyers and branding
- Hotel social media posters
- Various billboard and rollup banner designs
- Logo and brand identity projects for multiple businesses

HOW TO GET STARTED:
- Clients can contact us via WhatsApp: 0745365756
- Email: dadrisdesigners@gmail.com
- Fill out the contact form on our website
- Existing clients can log into their portal to track projects

PRICING:
- Pricing varies by project scope and complexity
- We offer competitive rates for Kenyan businesses
- Contact us for a free quote
- We accept payment via M-Pesa and bank transfer

RESPONSE STYLE:
- Be concise — keep answers to 2-4 sentences unless more detail is needed
- Be warm and encouraging
- Always end with a helpful next step or call to action when relevant
- If asked something you don't know, suggest they contact us directly via WhatsApp
- Never make up specific prices — tell them to contact for a quote
- Sign off messages with warmth but don't overdo it`;

  // ---- Inject CSS ----
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');

    #dd-chat-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }

    #dd-chat-bubble {
      position: fixed; bottom: 28px; left: 28px; z-index: 9999;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, #0a1a0e, #1a8c2e);
      box-shadow: 0 6px 24px rgba(26,140,46,0.45);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
      border: none; outline: none;
    }
    #dd-chat-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(26,140,46,0.6); }
    #dd-chat-bubble svg { width: 26px; height: 26px; transition: opacity 0.2s, transform 0.2s; }
    #dd-chat-bubble .icon-chat { opacity: 1; position: absolute; }
    #dd-chat-bubble .icon-close { opacity: 0; position: absolute; transform: rotate(-90deg); }
    #dd-chat-bubble.open .icon-chat { opacity: 0; transform: rotate(90deg); }
    #dd-chat-bubble.open .icon-close { opacity: 1; transform: rotate(0deg); }

    #dd-chat-pulse {
      position: fixed; bottom: 24px; left: 24px; z-index: 9998;
      width: 66px; height: 66px; border-radius: 50%;
      background: rgba(26,140,46,0.25);
      animation: dd-pulse 2.5s infinite;
      pointer-events: none;
    }
    @keyframes dd-pulse {
      0% { transform: scale(1); opacity: 0.8; }
      70% { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    #dd-chat-panel {
      position: fixed; bottom: 100px; left: 28px; z-index: 9998;
      width: 370px; max-height: 580px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(0.85) translateY(20px); opacity: 0;
      transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
      pointer-events: none; transform-origin: bottom left;
    }
    #dd-chat-panel.open {
      transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
    }

    #dd-chat-header {
      background: linear-gradient(135deg, #0a1a0e 0%, #1a3a12 60%, #1a8c2e 100%);
      padding: 18px 20px; display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #dd-chat-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #1a8c2e, #f4b400);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: #fff; font-size: 1rem;
      border: 2px solid rgba(255,255,255,0.25); flex-shrink: 0;
      font-family: 'Playfair Display', serif;
    }
    #dd-chat-header-info { flex: 1; }
    #dd-chat-header-name { color: #fff; font-weight: 700; font-size: 0.95rem; }
    #dd-chat-header-status { color: rgba(255,255,255,0.6); font-size: 0.72rem; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    .dd-status-dot { width: 7px; height: 7px; background: #6ee87b; border-radius: 50%; animation: dd-blink 2s infinite; }
    @keyframes dd-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    #dd-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #dd-chat-messages::-webkit-scrollbar { width: 4px; }
    #dd-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #dd-chat-messages::-webkit-scrollbar-thumb { background: #e2e8e4; border-radius: 4px; }

    .dd-msg { display: flex; gap: 8px; animation: dd-msg-in 0.3s ease; }
    @keyframes dd-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .dd-msg.user { flex-direction: row-reverse; }
    .dd-msg-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
    .dd-msg-avatar.bot { background: linear-gradient(135deg, #1a8c2e, #22a838); color: #fff; font-family: 'Playfair Display', serif; }
    .dd-msg-avatar.user { background: linear-gradient(135deg, #1565c0, #1976d2); color: #fff; }
    .dd-msg-bubble { max-width: 80%; padding: 11px 14px; border-radius: 16px; font-size: 0.86rem; line-height: 1.6; }
    .dd-msg.bot .dd-msg-bubble { background: #f0f7f1; color: #1a1a1a; border-bottom-left-radius: 4px; }
    .dd-msg.user .dd-msg-bubble { background: linear-gradient(135deg, #1a8c2e, #22a838); color: #fff; border-bottom-right-radius: 4px; }

    .dd-typing { display: flex; align-items: center; gap: 4px; padding: 12px 14px; }
    .dd-typing span { width: 7px; height: 7px; background: #aaa; border-radius: 50%; animation: dd-bounce 1.2s infinite; }
    .dd-typing span:nth-child(2) { animation-delay: 0.2s; }
    .dd-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dd-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

    #dd-chat-suggestions { padding: 0 14px 12px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
    .dd-suggestion {
      background: #f0f7f1; border: 1px solid #c8e6c9; color: #1a8c2e;
      border-radius: 50px; padding: 6px 14px; font-size: 0.75rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
    }
    .dd-suggestion:hover { background: #1a8c2e; color: #fff; border-color: #1a8c2e; }

    #dd-chat-input-area {
      border-top: 1px solid #e2e8e4; padding: 12px 14px; display: flex; gap: 8px; flex-shrink: 0;
      background: #fafcfa;
    }
    #dd-chat-input {
      flex: 1; border: 1.5px solid #e2e8e4; border-radius: 50px;
      padding: 10px 16px; font-size: 0.85rem; outline: none;
      font-family: 'DM Sans', sans-serif; color: #1a1a1a; background: #fff;
      transition: border-color 0.2s;
    }
    #dd-chat-input:focus { border-color: #1a8c2e; }
    #dd-chat-input::placeholder { color: #aaa; }
    #dd-chat-send {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #1a8c2e, #22a838);
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0;
    }
    #dd-chat-send:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(26,140,46,0.4); }
    #dd-chat-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    #dd-chat-send svg { width: 16px; height: 16px; }

    #dd-chat-footer { padding: 6px 14px 10px; text-align: center; font-size: 0.65rem; color: #aaa; flex-shrink: 0; }
    #dd-chat-footer a { color: #1a8c2e; text-decoration: none; font-weight: 600; }

    @media (max-width: 420px) {
      #dd-chat-panel { width: calc(100vw - 24px); left: 12px; bottom: 90px; }
      #dd-chat-bubble { bottom: 20px; left: 16px; }
      #dd-chat-pulse  { bottom: 16px; left: 12px; }
    }
  `;
  document.head.appendChild(style);

  // ---- Inject HTML ----
  const widget = document.createElement('div');
  widget.id = 'dd-chat-widget';
  widget.innerHTML = `
    <div id="dd-chat-pulse"></div>
    <button id="dd-chat-bubble" aria-label="Chat with Aida">
      <svg class="icon-chat" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    <div id="dd-chat-panel">
      <div id="dd-chat-header">
        <div id="dd-chat-avatar">A</div>
        <div id="dd-chat-header-info">
          <div id="dd-chat-header-name">Aida — Dadris AI</div>
          <div id="dd-chat-header-status">
            <span class="dd-status-dot"></span> Online · Replies instantly
          </div>
        </div>
      </div>
      <div id="dd-chat-messages"></div>
      <div id="dd-chat-suggestions">
        <button class="dd-suggestion" onclick="ddSuggest('What services do you offer?')">🎨 Services</button>
        <button class="dd-suggestion" onclick="ddSuggest('How much does a logo cost?')">💰 Pricing</button>
        <button class="dd-suggestion" onclick="ddSuggest('How do I get started?')">🚀 Get Started</button>
        <button class="dd-suggestion" onclick="ddSuggest('Show me your portfolio')">🖼️ Portfolio</button>
      </div>
      <div id="dd-chat-input-area">
        <input id="dd-chat-input" type="text" placeholder="Ask Aida anything..." maxlength="500" />
        <button id="dd-chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div id="dd-chat-footer">Powered by <a href="https://anthropic.com" target="_blank">Claude AI</a> · DADRIS DESIGNERS</div>
    </div>
  `;
  document.body.appendChild(widget);

  // ---- Notification Badge CSS ----
  const extraStyle = document.createElement('style');
  extraStyle.textContent = `
    #dd-chat-notif-badge {
      position: absolute; top: -4px; left: -4px;
      width: 20px; height: 20px; background: #e53935;
      border-radius: 50%; color: #fff; font-size: 0.65rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      animation: dd-badge-pop 0.4s cubic-bezier(.34,1.56,.64,1);
      font-family: 'DM Sans', sans-serif;
    }
    @keyframes dd-badge-pop { from { transform: scale(0); } to { transform: scale(1); } }
    #dd-chat-bubble { position: relative; }

    #dd-chat-preview {
      position: fixed; bottom: 100px; left: 28px; z-index: 9997;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      padding: 14px 16px; max-width: 280px;
      display: flex; align-items: flex-start; gap: 10px;
      animation: dd-preview-in 0.4s cubic-bezier(.34,1.56,.64,1);
      cursor: pointer; border: 1px solid #e8f5e9;
    }
    @keyframes dd-preview-in { from { opacity:0; transform: translateY(10px) scale(0.95); } to { opacity:1; transform: translateY(0) scale(1); } }
    #dd-chat-preview .prev-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #1a8c2e, #22a838);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 0.85rem;
      font-family: 'Playfair Display', serif;
    }
    #dd-chat-preview .prev-body { flex: 1; }
    #dd-chat-preview .prev-name { font-size: 0.72rem; font-weight: 700; color: #1a8c2e; margin-bottom: 3px; }
    #dd-chat-preview .prev-text { font-size: 0.82rem; color: #333; line-height: 1.4; }
    #dd-chat-preview .prev-close {
      background: none; border: none; color: #aaa; cursor: pointer;
      font-size: 1rem; padding: 0; flex-shrink: 0; line-height: 1;
    }
    #dd-chat-preview .prev-close:hover { color: #e53935; }

    @media(max-width:420px) {
      #dd-chat-preview { left: 12px; max-width: calc(100vw - 90px); }
    }
  `;
  document.head.appendChild(extraStyle);
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];
  let greeted = false;
  let notifShown = false;

  const bubble  = document.getElementById('dd-chat-bubble');
  const panel   = document.getElementById('dd-chat-panel');
  const msgs    = document.getElementById('dd-chat-messages');
  const input   = document.getElementById('dd-chat-input');
  const sendBtn = document.getElementById('dd-chat-send');
  const pulse   = document.getElementById('dd-chat-pulse');

  // ---- Notification Sound (Web Audio API — no file needed) ----
  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const tones = [
        { freq: 880,  start: 0,    duration: 0.12 },
        { freq: 1100, start: 0.18, duration: 0.14 },
      ];
      tones.forEach(({ freq, start, duration }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      });
    } catch (e) { /* silently skip if audio blocked */ }
  }

  // ---- Badge ----
  function showBadge() {
    if (document.getElementById('dd-chat-notif-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'dd-chat-notif-badge';
    badge.textContent = '1';
    bubble.style.position = 'fixed';
    bubble.appendChild(badge);
  }
  function removeBadge() {
    const b = document.getElementById('dd-chat-notif-badge');
    if (b) b.remove();
  }

  // ---- Preview Popup ----
  function showPreviewPopup() {
    if (document.getElementById('dd-chat-preview') || isOpen) return;
    const prev = document.createElement('div');
    prev.id = 'dd-chat-preview';
    prev.innerHTML = `
      <div class="prev-avatar">A</div>
      <div class="prev-body">
        <div class="prev-name">Aida — Dadris AI</div>
        <div class="prev-text">👋 Hi! Need help with design services? I'm here to help!</div>
      </div>
      <button class="prev-close">✕</button>
    `;
    prev.querySelector('.prev-close').addEventListener('click', (e) => {
      e.stopPropagation(); prev.remove();
    });
    prev.addEventListener('click', () => { prev.remove(); bubble.click(); });
    document.body.appendChild(prev);
    setTimeout(() => { if (document.getElementById('dd-chat-preview')) prev.remove(); }, 8000);
  }

  // ---- Auto-trigger after 4 seconds ----
  setTimeout(() => {
    if (!isOpen && !notifShown) {
      notifShown = true;
      playNotifSound();
      showBadge();
      showPreviewPopup();
    }
  }, 4000);

  // ---- Toggle ----
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    bubble.classList.toggle('open', isOpen);
    panel.classList.toggle('open', isOpen);
    pulse.style.display = 'none';
    removeBadge();
    const prev = document.getElementById('dd-chat-preview');
    if (prev) prev.remove();

    if (isOpen && !greeted) {
      greeted = true;
      setTimeout(() => addBotMessage("👋 Hi there! I'm **Aida**, the AI assistant for **Dadris Designers**.\n\nI can tell you about our services, pricing, portfolio, and how to get started. What would you like to know?"), 400);
    }
    if (isOpen) setTimeout(() => input.focus(), 400);
  });

  // ---- Send ----
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  window.ddSuggest = function(text) {
    input.value = text;
    sendMessage();
  };

  function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    addUserMessage(text);
    getAIResponse(text);
  }

  // ---- Add messages ----
  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'dd-msg user';
    div.innerHTML = `
      <div class="dd-msg-avatar user">You</div>
      <div class="dd-msg-bubble">${escapeHtml(text)}</div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  function addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'dd-msg bot';
    div.innerHTML = `
      <div class="dd-msg-avatar bot">A</div>
      <div class="dd-msg-bubble">${formatText(text)}</div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'dd-msg bot';
    div.id = 'dd-typing-indicator';
    div.innerHTML = `
      <div class="dd-msg-avatar bot">A</div>
      <div class="dd-msg-bubble dd-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    scrollBottom();
  }

  function removeTyping() {
    const t = document.getElementById('dd-typing-indicator');
    if (t) t.remove();
  }

  // ---- AI Call ----
  async function getAIResponse(userText) {
    isLoading = true;
    sendBtn.disabled = true;
    input.disabled = true;
    showTyping();

    conversationHistory.push({ role: 'user', content: userText });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: conversationHistory,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'm sorry, I couldn't get a response. Please try again or contact us on WhatsApp: 0745365756";

      conversationHistory.push({ role: 'assistant', content: reply });

      removeTyping();
      addBotMessage(reply);
    } catch (err) {
      removeTyping();
      addBotMessage("Sorry, I'm having trouble connecting right now. Please reach us directly on WhatsApp: **0745365756** or email **dadrisdesigners@gmail.com** 😊");
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }

  // ---- Helpers ----
  function scrollBottom() {
    setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
  }

  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

})();
