/* ===========================
   LifeOS – AI Personal Growth Assistant (Shared Cloud Intelligence)
   =========================== */

let isAwaitingResponse = false;

function renderAssistant() {
  const user = Store.get('user') || {};
  const isVasanth = AuthManager?.currentUser?.isVasanth || (user.name && user.name.toLowerCase().includes('vasanth'));
  const chatHistory = Store.get('chatHistory') || [];

  return `
  <div class="page" id="assistantPage">
    <div class="page-header" style="margin-bottom:16px;">
      <div class="page-title-group">
        <h1 class="page-title">🤖 AI Personal Growth Assistant</h1>
        <p class="page-subtitle">${isVasanth ? 'Your dedicated 20+ LPA career architect, daily planner, and accountability mentor' : 'Your personal productivity coach, daily planner, and study mentor'}</p>
      </div>
      <div class="page-actions">
        <span class="badge badge-green"><i data-lucide="zap" style="width:12px; height:12px; margin-right:4px;"></i> Powered by Groq · Llama 3.3 70B (Active)</span>
        <button class="btn btn-sm btn-ghost" onclick="clearChatHistory()" title="Clear chat history">
          <i data-lucide="trash-2"></i> Clear Chat
        </button>
      </div>
    </div>

    <!-- Chat Container -->
    <div class="chat-container">
      <!-- Quick Prompts Pill Bar -->
      <div class="quick-prompts" style="padding-top:14px; border-bottom:1px solid var(--border-color); background:var(--bg-secondary);">
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('Plan my day for maximum productivity and college balance')">📅 Plan My Day</button>
        ${isVasanth ? `
          <button class="quick-prompt-btn" onclick="sendQuickPrompt('Review my current academic and skill progress towards 20+ LPA')">🎯 20+ LPA Placement Audit</button>
          <button class="quick-prompt-btn" onclick="sendQuickPrompt('Give me a high-yield Java roadmap practice plan for 8:30-9:30 PM')">☕ Java 8:30 PM Practice Drill</button>
        ` : `
          <button class="quick-prompt-btn" onclick="sendQuickPrompt('Help me create a smart daily study schedule')">⏰ Smart Study Routine</button>
          <button class="quick-prompt-btn" onclick="sendQuickPrompt('Break down my top goal into actionable steps')">🎯 Break Down My Goal</button>
        `}
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('How should I start freelancing as a college student in India?')">💼 Freelancing Starter</button>
        <button class="quick-prompt-btn" onclick="sendQuickPrompt('Analyze where I might be losing focus or consistency')">⚡ Accountability Check</button>
      </div>

      <!-- Messages Thread -->
      <div class="chat-messages" id="chatMessages">
        ${chatHistory.length === 0 ? `
          <div class="chat-message assistant">
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">
              <p><strong>Hello ${escapeHtml(user.name || 'there')}!</strong> I am your dedicated LifeOS AI Coach, powered by <strong>Groq (Llama 3.3 70B)</strong>.</p>
              ${isVasanth ? `
                <p style="margin-top:6px;">I have full context on your profile: <strong>2nd Year B.Tech CSE (AI & ML) at Vel Tech University</strong> with your <strong>9.1 CGPA</strong>, your core <strong>Java learning block (8:30 PM – 9:30 PM)</strong>, and your ambitious targets for a <strong>20+ LPA software engineering role</strong> and financial independence through freelancing.</p>
              ` : `
                <p style="margin-top:6px;">I am here to help you conquer your daily routine, break down your goals into actionable milestones, build consistent habits, and stay accountable every day.</p>
              `}
              <p style="margin-top:6px;">How can I help you conquer today's priorities?</p>
            </div>
          </div>
        ` : chatHistory.map(m => `
          <div class="chat-message ${m.role}">
            <div class="chat-avatar">${m.role === 'assistant' ? '🤖' : (user.name ? user.name.slice(0,2).toUpperCase() : 'ME')}</div>
            <div class="chat-bubble">
              ${formatMessageText(m.text)}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Input Bar -->
      <div class="chat-input-area">
        <textarea class="chat-input" id="chatInput" placeholder="Ask your AI coach to plan your day, solve study blockers, or analyze goals..." rows="1" onkeydown="handleChatKey(event)"></textarea>
        <button class="chat-send-btn" id="chatSendBtn" onclick="sendMessage()" title="Send Message">
          <i data-lucide="send"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = promptText;
    sendMessage();
  }
}

async function sendMessage() {
  if (isAwaitingResponse) return;
  const input = document.getElementById('chatInput');
  const text = input?.value.trim();
  if (!text) return;

  // Append user message
  appendMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  // Typing indicator
  isAwaitingResponse = true;
  showTypingIndicator();

  try {
    const reply = await callGroqAPI(text);
    removeTypingIndicator();
    appendMessage('assistant', reply);
  } catch (err) {
    console.error('AI error:', err);
    removeTypingIndicator();
    appendMessage('assistant', `⚠️ ${err.message || 'Could not reach the AI service. Please try again.'}`);
  } finally {
    isAwaitingResponse = false;
  }
}

function appendMessage(role, text) {
  const history = Store.get('chatHistory') || [];
  history.push({ role, text, timestamp: new Date().toISOString() });
  Store.set('chatHistory', history);

  const container = document.getElementById('chatMessages');
  if (!container) return;

  const user = Store.get('user') || {};
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}`;
  msgDiv.innerHTML = `
    <div class="chat-avatar">${role === 'assistant' ? '🤖' : (user.name ? user.name.slice(0,2).toUpperCase() : 'ME')}</div>
    <div class="chat-bubble">${formatMessageText(text)}</div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  lucide.createIcons();
}

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.className = 'chat-message assistant';
  div.innerHTML = `
    <div class="chat-avatar">🤖</div>
    <div class="chat-bubble" style="color:var(--text-muted); font-style:italic;">
      Thinking...
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function clearChatHistory() {
  if (!confirm('Clear all conversation history?')) return;
  Store.set('chatHistory', []);
  App.navigate('assistant');
  Toast.success('Conversation cleared');
}

function formatMessageText(text) {
  // Simple markdown to safe HTML conversion
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:var(--bg-input); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:12.5px;">$1</code>');
  formatted = formatted.replace(/\n\n/g, '</p><p style="margin-top:8px;">');
  formatted = formatted.replace(/\n- /g, '<br>• ');
  formatted = formatted.replace(/\n/g, '<br>');
  return `<p>${formatted}</p>`;
}

async function callGroqAPI(userMsg) {
  const user = Store.get('user') || {};
  const habits = HabitUtil.todayCompletion();
  const tasks = TaskUtil.todayTasks();
  const isVasanth = AuthManager?.currentUser?.isVasanth || (user.name && user.name.toLowerCase().includes('vasanth'));

  const userContext = isVasanth ? `
About Vasanth M:
- 2nd Year B.Tech CSE (AI & ML) student at Vel Tech University, India. Graduation 2029.
- Current CGPA: ${user.cgpa || 9.1}. Target package: 20+ LPA in top product-based software engineering roles.
- Learning priorities: 1. Core Java fundamentals, 2. Data Structures & Algorithms in Java, 3. Git/GitHub, 4. Web Dev (HTML, CSS, JS, React), 5. Spring Boot & Node.js, 6. SQL/DBMS, 7. CS Fundamentals (OS, Networks).
- Strict Routine Anchor: Java learning hour is locked from 8:30 PM to 9:30 PM daily.
- Ambition: Freelance web development during college for financial independence.
- Today's State: ${habits.done}/${habits.total} habits completed, ${tasks.filter(t=>t.done).length}/${tasks.length} tasks completed today.
` : `
About User (${user.name || 'Student'}):
- Degree / Education: ${user.degree || 'Engineering Student'} at ${user.university || 'University'}.
- Current Academic Year: ${user.year || 1}st/2nd Year.
- Target Ambition: ${user.targetPackage || 'Professional career goal'}.
- Primary Goal: ${user.goal || 'Continuous self-improvement'}.
- Today's State: ${habits.done}/${habits.total} habits completed, ${tasks.filter(t=>t.done).length}/${tasks.length} tasks completed today.
`;

  const systemInstruction = `
You are the personal AI Growth Architect and Mentor in the LifeOS productivity platform.
${userContext}
Your tone: Direct, highly practical, motivational, structured, concise, and supportive. Provide actionable bullet points. Never give generic boilerplate. Answer in the context of their actual life goals and daily routine.
`;

  // Build conversation context from saved history (the latest user message is already saved by appendMessage)
  const history = (Store.get('chatHistory') || [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim() && !m.text.startsWith('⚠️'))
    .slice(-12)
    .map(m => ({ role: m.role, content: m.text.slice(0, 4000) }));

  // Safety: make sure the current message is the last one
  if (!history.length || history[history.length - 1].role !== 'user') {
    history.push({ role: 'user', content: userMsg });
  }

  const messages = [{ role: 'system', content: systemInstruction.trim() }, ...history];

  let res;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });
  } catch (networkErr) {
    throw new Error('Could not reach the LifeOS AI server. Check your internet connection and try again.');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON response */ }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('AI endpoint /api/chat was not found. The chatbot only works on the deployed Vercel site (or via "vercel dev"), not by opening index.html directly.');
    }
    throw new Error(data?.error || `AI request failed (HTTP ${res.status}).`);
  }
  if (!data?.reply) throw new Error('The AI returned an empty response. Please try again.');
  return data.reply;
}

function getLocalAssistantResponse(msg) {
  const lower = msg.toLowerCase();
  const user = Store.get('user') || {};
  const habits = HabitUtil.todayCompletion();
  const tasks = TaskUtil.todayTasks();

  if (lower.includes('plan') || lower.includes('day') || lower.includes('schedule') || lower.includes('routine')) {
    return `**Strategic Daily Action Plan for Vasanth:**

1. **Morning Routine (6:00 – 7:30 AM):** Quick physical workout + review 5 English vocabulary terms to sharpen communication.
2. **College Hours (8:00 AM – 5:00 PM):** Active listening in CS301 (DSA) & CS302 (OOP). Protect your 9.1 CGPA.
3. **Evening Focus (6:00 – 7:30 PM):** Solve 1 LeetCode problem in Java (focus on Arrays/HashMap).
4. **Core Anchor (8:30 – 9:30 PM):** **Java Deep Work.** Do not skip this block. Master OOP concepts, Collections framework, or Exception Handling.
5. **Night Review (9:45 – 10:15 PM):** Check off habits, update your LifeOS streak, and plan top 3 missions for tomorrow.`;
  }

  if (lower.includes('java') || lower.includes('dsa') || lower.includes('8:30')) {
    return `**Java & DSA Mastery Blueprint (Target: 20+ LPA):**

- **Today's 8:30 PM Focus:** Dedicate the full hour to hands-on coding, not passive video watching.
- **Key Focus Areas:**
  • Java OOP: Abstract classes, Interface contracts, and Method Overriding.
  • Collections: Deeply understand \`ArrayList\` vs \`LinkedList\`, \`HashMap\` internal bucket hashing, and \`PriorityQueue\`.
  • DSA Pattern: Sliding Window & Two Pointers on arrays/strings.
- **Action Item:** Code 1 clean Java solution with time & space complexity analysis documented in your GitHub repo!`;
  }

  if (lower.includes('placement') || lower.includes('20') || lower.includes('lpa') || lower.includes('package') || lower.includes('interview')) {
    return `**20+ LPA Placement Readiness Roadmap (Graduation 2029):**

1. **Academic Pillar:** Protect your 9.1 CGPA. Top product companies (Amazon, Microsoft, Google, Atlassian, Uber) require an 8.5+ cutoff for direct shortlisting.
2. **DSA Mastery:** Complete 250+ curated LeetCode problems in Java across Arrays, Trees, Graphs, and DP by 3rd year.
3. **System & Backend:** Learn Spring Boot + MySQL + Redis to build 2 standout production-grade projects.
4. **Communication:** Practice concise technical explanation. Being able to explain your time complexity clearly in English is what clinches the final round.`;
  }

  if (lower.includes('freelance') || lower.includes('money') || lower.includes('financial') || lower.includes('client')) {
    return `**College Freelancing Launch Strategy:**

1. **Skill Sweet Spot:** HTML, CSS, JavaScript, and Tailwind landing pages for local Indian businesses, restaurants, or clinics.
2. **Portfolio First:** Build 3 mock client sites and host them for free on Vercel or GitHub Pages.
3. **Outreach:** Send personalized 2-minute video pitches or direct LinkedIn/WhatsApp messages showing how you improved their current website.
4. **Financial Target:** Aim for ₹5,000 for your first delivery, then scale to ₹15,000+ per client project as your delivery speed improves.`;
  }

  if (lower.includes('habit') || lower.includes('focus') || lower.includes('procrastinat') || lower.includes('discipline')) {
    return `**Discipline & Consistency Assessment:**

- **Current Status:** You have checked off **${habits.done} of ${habits.total} habits** today (${habits.pct}% completion).
- **Rule of Thumb:** Never miss twice. If college fatigue hit you today, still complete the **8:30 PM Java session** for just 30 minutes. Keeping the chain unbroken protects your momentum.
- **Tip:** Put your phone in another room between 8:25 PM and 9:35 PM. Zero distractions.`;
  }

  return `**Strategic Insight for Vasanth:**

You have set clear, high-standard ambitions: a **9.1+ CGPA**, a **20+ LPA software engineering placement**, and **freelancing financial independence**.

Every small decision you make today either brings you closer to that 20+ LPA offer or pushes it away.
- Focus on your **8:30 PM Java learning hour**.
- Check off your daily habit targets.
- Solve one technical blocker every single day.

What specific problem or task can we break down right now?`;
}
