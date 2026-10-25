// Tabs: show the section that matches the URL hash
const panels = document.querySelectorAll('.panel');
const navLinks = document.querySelectorAll('nav a');

function showPanel() {
    const id = location.hash.slice(1) || 'home';
    const target = document.getElementById(id) || document.getElementById('home');
    panels.forEach((p) => p.classList.toggle('active', p === target));
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.tab === target.id));
    window.scrollTo(0, 0);
    if (target.id === 'chat') document.getElementById('chat-input').focus();
}
window.addEventListener('hashchange', showPanel);
showPanel();

// Game player
const player = document.getElementById('player');
const frame = document.getElementById('player-frame');

function openGame(url, title) {
    document.getElementById('player-title').textContent = title;
    frame.src = url;
    player.hidden = false;
    frame.focus();
}
function closeGame() {
    player.hidden = true;
    frame.src = 'about:blank';
    if (document.fullscreenElement) document.exitFullscreen();
}
document.getElementById('player-close').onclick = closeGame;
document.getElementById('player-fs').onclick = () => player.requestFullscreen?.();
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !player.hidden && !document.fullscreenElement) closeGame();
});

// AI chat
const messagesEl = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const STORAGE_KEY = 'supernova-chat';
let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Minimal markdown: code blocks, inline code, bold
function renderMarkdown(text) {
    return escapeHtml(text)
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => `<pre><code>${code}</code></pre>`)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
function addBubble(role, content) {
    document.getElementById('chat-empty')?.remove();
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.innerHTML = renderMarkdown(content);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
}
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
}

history.forEach((m) => addBubble(m.role, m.content));

async function send(text) {
    history.push({ role: 'user', content: text });
    addBubble('user', text);
    save();

    const bubble = addBubble('assistant', '');
    bubble.classList.add('typing');
    sendBtn.disabled = true;
    let reply = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
        });
        if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            reply += decoder.decode(value, { stream: true });
            bubble.innerHTML = renderMarkdown(reply);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        history.push({ role: 'assistant', content: reply });
        save();
    } catch (err) {
        bubble.textContent = 'Sorry, I couldn’t reach the AI right now. Please try again in a moment.';
        history.pop(); // drop the unanswered user message so it can be retried
        save();
    } finally {
        bubble.classList.remove('typing');
        sendBtn.disabled = false;
        input.focus();
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    input.style.height = '';
    send(text);
});
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
    }
});
input.addEventListener('input', () => {
    input.style.height = '';
    input.style.height = `${input.scrollHeight}px`;
});
document.querySelectorAll('.suggestions button').forEach((b) => {
    b.onclick = () => send(b.textContent);
});
document.getElementById('new-chat').onclick = () => {
    history = [];
    save();
    location.reload();
};
