/* ========================================
   MALAYSIA 2050: DIGITAL HEALTH TWIN
   Application Logic
   ======================================== */

// ==========================================
// PARTICLE BACKGROUND
// ==========================================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrame;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.5 ? 170 : 260;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 90%, 70%, ${this.opacity})`;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 140) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `hsla(170, 80%, 60%, ${0.06 * (1 - dist / 140)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    animFrame = requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// ==========================================
// HERO STAT COUNTER ANIMATION
// ==========================================
function animateCounters() {
    document.querySelectorAll('.stat-number[data-count]').forEach(el => {
        const target = parseInt(el.getAttribute('data-count'));
        const duration = 2000;
        const start = performance.now();
        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });
}

// ==========================================
// PAGE NAVIGATION
// ==========================================
const pages = {
    landing: document.getElementById('landing'),
    lifestyle: document.getElementById('lifestyle'),
    processing: document.getElementById('processing'),
    results: document.getElementById('results')
};

function showPage(name) {
    Object.values(pages).forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    const target = pages[name];
    target.style.display = 'flex';
    // Trigger reflow for animation
    void target.offsetHeight;
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Landing → Lifestyle
document.getElementById('startBtn').addEventListener('click', () => {
    showPage('lifestyle');
});

// Back to landing
document.getElementById('backToLanding').addEventListener('click', () => {
    showPage('landing');
});

// Restart
document.getElementById('restartBtn').addEventListener('click', () => {
    resetInputs();
    showPage('landing');
});

// Init counters on load
setTimeout(animateCounters, 500);

// ==========================================
// LIFESTYLE INPUT LOGIC
// ==========================================
const userInputs = {
    diet: 0,
    exercise: 0,
    sleep: 0,
    screen: 0,
    stress: 0,
    environment: 0
};

// Option button click handling
document.querySelectorAll('.option-group').forEach(group => {
    const name = group.getAttribute('data-name');
    group.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from siblings
            group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userInputs[name] = parseInt(btn.getAttribute('data-value'));
            // Mark card as selected
            btn.closest('.input-card').classList.add('selected');
            checkAllSelected();
        });
    });
});

function checkAllSelected() {
    const allAnswered = Object.values(userInputs).every(v => v > 0);
    document.getElementById('simulateBtn').disabled = !allAnswered;
}

function resetInputs() {
    Object.keys(userInputs).forEach(k => userInputs[k] = 0);
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.input-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('simulateBtn').disabled = true;
    document.getElementById('whatifSelect').value = '';
    document.getElementById('whatifResult').classList.remove('visible');
}

// ==========================================
// SCORING ENGINE
// ==========================================
function calculateScore(inputs) {
    // Weights: exercise 25%, sleep 20%, diet 20%, screen 15%, stress 20%
    // environment is bonus ±5 points
    const base = (
        (inputs.exercise / 3) * 25 +
        (inputs.sleep / 3) * 20 +
        (inputs.diet / 3) * 20 +
        (inputs.screen / 3) * 15 +
        (inputs.stress / 3) * 20
    );
    const envBonus = (inputs.environment - 2) * 3;
    return Math.round(Math.min(100, Math.max(0, base + envBonus)));
}

function getTier(score) {
    if (score >= 80) return { level: 'healthy', label: 'Thriving Future', color: '#00f5d4' };
    if (score >= 60) return { level: 'moderate', label: 'Moderate Risk', color: '#ffd166' };
    return { level: 'risky', label: 'High Risk', color: '#ff6b6b' };
}

let currentScore = 0;

// ==========================================
// SIMULATION
// ==========================================
function backToVR() {

  const diet = document.querySelector('[data-name="diet"] .option-btn.active')?.dataset.value;
  const exercise = document.querySelector('[data-name="exercise"] .option-btn.active')?.dataset.value;
  const sleep = document.querySelector('[data-name="sleep"] .option-btn.active')?.dataset.value;
  const screen = document.querySelector('[data-name="screen"] .option-btn.active')?.dataset.value;
  const stress = document.querySelector('[data-name="stress"] .option-btn.active')?.dataset.value;
  const environment = document.querySelector('[data-name="environment"] .option-btn.active')?.dataset.value;

  const url =
    `https://puterinurulsyahirah.github.io/LifeMirror-2050/?diet=${diet}&exercise=${exercise}&sleep=${sleep}&screen=${screen}&stress=${stress}&environment=${environment}`;

  console.log("Returning to VR:", url);

  window.location.href = url;
}

function runSimulation() {
    const ring = document.getElementById('ringProgress');
    const percentEl = document.getElementById('simPercent');
    const steps = [
        document.getElementById('proc1'),
        document.getElementById('proc2'),
        document.getElementById('proc3'),
        document.getElementById('proc4')
    ];

    // Add SVG gradient definition if not already present
    let defs = ring.closest('svg').querySelector('defs');
    if (!defs) {
        const ns = 'http://www.w3.org/2000/svg';
        defs = document.createElementNS(ns, 'defs');
        const grad = document.createElementNS(ns, 'linearGradient');
        grad.id = 'ringGrad';
        grad.setAttribute('x1', '0%');
        grad.setAttribute('y1', '0%');
        grad.setAttribute('x2', '100%');
        grad.setAttribute('y2', '100%');
        const stop1 = document.createElementNS(ns, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#00f5d4');
        const stop2 = document.createElementNS(ns, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#9b5de5');
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        ring.closest('svg').prepend(defs);
    }

    const circumference = 2 * Math.PI * 90; // r=90
    let progress = 0;
    const totalDuration = 3500;
    const startTime = performance.now();

    // Reset steps
    steps.forEach(s => { s.classList.remove('active', 'done'); });

    function updateProgress(now) {
        const elapsed = now - startTime;
        progress = Math.min(elapsed / totalDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const percent = Math.round(eased * 100);

        // Update ring
        ring.style.strokeDashoffset = circumference * (1 - eased);
        percentEl.textContent = percent + '%';

        // Activate steps
        const stepIndex = Math.floor(eased * 4);
        steps.forEach((s, i) => {
            if (i < stepIndex) { s.classList.remove('active'); s.classList.add('done'); }
            else if (i === stepIndex) { s.classList.add('active'); }
        });

        if (progress < 1) {
            requestAnimationFrame(updateProgress);
        } else {
            steps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
            setTimeout(() => {
                currentScore = calculateScore(userInputs);
                showPage('results');
                renderResults(currentScore);
            }, 400);
        }
    }
    requestAnimationFrame(updateProgress);
}

// ==========================================
// RESULTS RENDERING
// ==========================================
function renderResults(score) {
    const tier = getTier(score);

    // Background
    const bg = document.getElementById('resultsBg');
    bg.className = 'results-bg ' + tier.level;

    // Badge
    document.getElementById('resultBadge').textContent =
        tier.level === 'healthy' ? '✨ THRIVING FUTURE' :
            tier.level === 'moderate' ? '⚡ MODERATE RISK DETECTED' : '⚠️ HIGH RISK ALERT';

    // Score counter
    const scoreEl = document.getElementById('scoreValue');
    scoreEl.className = 'score-value ' + tier.level;
    animateNumber(scoreEl, 0, score, 1500);

    // Energy bar
    const energyPct = Math.min(100, score + Math.round(Math.random() * 5));
    setMetricBar('energyBar', 'energyValue', energyPct, tier.level);

    // Mental Wellbeing
    const mentalVal = Math.min(100, Math.round(
        (userInputs.stress / 3) * 40 + (userInputs.sleep / 3) * 30 + (userInputs.exercise / 3) * 30
    ));
    setMetricBar('mentalBar', 'mentalValue', mentalVal, getTier(mentalVal).level);

    // Cardiovascular Risk
    const cardioScore = (userInputs.exercise / 3) * 35 + (userInputs.diet / 3) * 35 + (userInputs.stress / 3) * 30;
    setRiskIndicator('cardioRisk', cardioScore >= 70 ? 'low' : cardioScore >= 45 ? 'medium' : 'high');

    // Healthcare Dependency
    setRiskIndicator('healthcareDep', score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high');

    // Strategies
    renderStrategies(score);

    // Projection chart
    setTimeout(() => drawProjectionChart(score), 500);
}

function animateNumber(el, from, to, duration) {
    const start = performance.now();
    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function setMetricBar(barId, valueId, pct, level) {
    const fill = document.querySelector(`#${barId} .metric-fill`);
    fill.className = 'metric-fill ' + level;
    setTimeout(() => { fill.style.width = pct + '%'; }, 300);
    const valEl = document.getElementById(valueId);
    setTimeout(() => animateNumber(valEl, 0, pct, 1200), 300);
    valEl.textContent = '0%';
    // Add % after animation
    setTimeout(() => {
        valEl.textContent = pct + '%';
    }, 1600);
}

function setRiskIndicator(id, level) {
    const container = document.getElementById(id);
    const dot = container.querySelector('.risk-dot');
    const label = container.querySelector('.risk-label');
    dot.className = 'risk-dot ' + level;
    const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
    label.textContent = labels[level];
    label.style.color = level === 'low' ? '#06d6a0' : level === 'medium' ? '#ffd166' : '#ff6b6b';
}

// ==========================================
// PREVENTIVE STRATEGIES
// ==========================================
const allStrategies = {
    diet: [
        { icon: '🥗', title: 'AI Nutrition Planner', desc: 'Personalized meal plans from your Digital Twin\'s metabolic data, delivered to your smart kitchen.' },
        { icon: '🍎', title: 'Smart Grocery Sync', desc: 'Wearable detects nutrient deficiencies and auto-suggests balanced food choices at checkout.' }
    ],
    exercise: [
        { icon: '🏋️', title: 'Adaptive Fitness AI', desc: 'Your Twin suggests optimal exercise routines based on joint health, stamina projections, and recovery rate.' },
        { icon: '🚴', title: 'Active Transport Credits', desc: 'Malaysia\'s 2050 Mobility Credit system rewards cycling and walking with healthcare subsidies.' }
    ],
    sleep: [
        { icon: '🛏️', title: 'Sleep Optimization Chamber', desc: 'Smart bedroom environments with adaptive temperature, light therapy, and REM cycle optimization.' },
        { icon: '🌙', title: 'Circadian AI Coach', desc: 'AI monitors your sleep architecture and provides personalized wind-down routines.' }
    ],
    screen: [
        { icon: '👓', title: 'Neural Fatigue Monitor', desc: 'Smart lenses detect eye strain and cognitive fatigue, prompting timely digital detox breaks.' },
        { icon: '🌿', title: 'Nature Immersion Rx', desc: 'Prescribed VR nature experiences that counteract digital overload and restore focus.' }
    ],
    stress: [
        { icon: '🧘', title: 'Biorhythm Harmonizer', desc: 'Wearable detects cortisol spikes and triggers personalized micro-meditation sessions.' },
        { icon: '🎵', title: 'Sonic Therapy AI', desc: 'Algorithmic music compositions tuned to your brainwave patterns for real-time stress relief.' }
    ],
    environment: [
        { icon: '🌱', title: 'Clean Air Navigator', desc: 'Real-time pollution routing gives you the healthiest path through the city.' },
        { icon: '🏡', title: 'Bio-Purified Living', desc: 'Smart home air filtration systems synced with outdoor pollution data for optimal indoor air quality.' }
    ]
};

function renderStrategies(score) {
    const grid = document.getElementById('strategiesGrid');
    grid.innerHTML = '';

    const weakAreas = Object.entries(userInputs)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([key]) => key);

    const strategies = [];
    weakAreas.forEach(area => {
        strategies.push(...allStrategies[area]);
    });

    strategies.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'strategy-card';
        card.style.animationDelay = `${i * 0.1}s`;
        card.innerHTML = `
            <span class="strategy-icon">${s.icon}</span>
            <div class="strategy-content">
                <h4>${s.title}</h4>
                <p>${s.desc}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// PROJECTION CHART (Canvas)
// ==========================================
function drawProjectionChart(score) {
    const canvas = document.getElementById('projectionChart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Chart config
    const padLeft = 50, padRight = 30, padTop = 20, padBottom = 40;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    // Year labels
    const years = [2024, 2030, 2035, 2040, 2045, 2050];
    ctx.font = '11px Inter';
    ctx.fillStyle = '#5a6380';
    ctx.textAlign = 'center';
    years.forEach((year, i) => {
        const x = padLeft + (i / (years.length - 1)) * chartW;
        ctx.fillText(year, x, H - 10);
        // grid line
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, H - padBottom);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Y-axis labels
    ctx.textAlign = 'right';
    [0, 25, 50, 75, 100].forEach(val => {
        const y = padTop + chartH * (1 - val / 100);
        ctx.fillText(val + '%', padLeft - 10, y + 4);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(W - padRight, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.stroke();
    });

    // Data lines (based on user score)
    const factor = score / 100;

    // Preventive Care Adoption (user's influence: higher score = faster adoption)
    const preventiveData = [15, 25 + factor * 10, 40 + factor * 15, 55 + factor * 15, 70 + factor * 15, 80 + factor * 15];
    // Chronic Disease Rate (inversely related)
    const chronicData = [45, 42 - factor * 5, 38 - factor * 8, 32 - factor * 10, 25 - factor * 10, 18 - factor * 10];
    // Healthcare Costs
    const costData = [60, 58 - factor * 3, 52 - factor * 5, 44 - factor * 8, 35 - factor * 10, 28 - factor * 12];

    function drawLine(data, color, glow) {
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = padLeft + (i / (data.length - 1)) * chartW;
            const y = padTop + chartH * (1 - Math.max(0, Math.min(100, val)) / 100);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw dots
        data.forEach((val, i) => {
            const x = padLeft + (i / (data.length - 1)) * chartW;
            const y = padTop + chartH * (1 - Math.max(0, Math.min(100, val)) / 100);
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });
    }

    drawLine(preventiveData, '#00f5d4', '#00f5d4');
    drawLine(chronicData, '#ff6b6b', '#ff6b6b');
    drawLine(costData, '#ffd166', '#ffd166');
}


// ==========================================
// WHAT IF MODE
// ==========================================
document.getElementById('whatifSelect').addEventListener('change', function () {
    const habit = this.value;
    const resultDiv = document.getElementById('whatifResult');

    if (!habit) {
        resultDiv.classList.remove('visible');
        return;
    }

    // Clone inputs and max out the selected habit
    const improved = { ...userInputs };
    improved[habit] = 3; // Set to best value

    const newScore = calculateScore(improved);
    const diff = newScore - currentScore;

    document.getElementById('whatifBefore').textContent = currentScore;
    document.getElementById('whatifAfter').textContent = newScore;

    const impactEl = document.getElementById('whatifImpact');
    const habitLabels = {
        diet: 'eating a healthy balanced diet',
        exercise: 'exercising 4+ times per week',
        sleep: 'getting 8+ hours of sleep',
        screen: 'reducing screen time to under 3 hours',
        stress: 'managing stress to low levels',
        environment: 'living in a cleaner environment'
    };

    if (diff > 0) {
        impactEl.innerHTML = `✨ By <strong>${habitLabels[habit]}</strong>, your health score improves by <strong>+${diff} points</strong>! This reduces your long-term disease risk and healthcare dependency significantly.`;
        impactEl.style.color = '#06d6a0';
        impactEl.style.background = 'rgba(6, 214, 160, 0.06)';
    } else {
        impactEl.innerHTML = `✅ Great news! You're already at optimal level for this habit. Try improving another area.`;
        impactEl.style.color = '#00bbf9';
        impactEl.style.background = 'rgba(0, 187, 249, 0.06)';
    }

    resultDiv.classList.add('visible');
});

// ==========================================
// AI HEALTH CHATBOT
// ==========================================
(function () {
    const widget = document.getElementById('chatbotWidget');
    const toggle = document.getElementById('chatbotToggle');
    const panel = document.getElementById('chatbotPanel');
    const minimize = document.getElementById('chatbotMinimize');
    const messagesContainer = document.getElementById('chatbotMessages');
    const input = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('chatbotSend');
    const suggestionsEl = document.getElementById('chatbotSuggestions');
    let chatOpened = false;

    // Show chatbot only on results page
    const origShowPage = showPage;
    showPage = function (name) {
        origShowPage(name);
        if (name === 'results') {
            widget.classList.add('visible');
        } else {
            widget.classList.remove('visible');
            widget.classList.remove('open');
        }
    };

    // Toggle chatbot
    toggle.addEventListener('click', () => {
        widget.classList.toggle('open');
        if (widget.classList.contains('open')) {
            if (!chatOpened) {
                chatOpened = true;
                setTimeout(() => addBotMessage(getWelcomeMessage()), 500);
            }
            setTimeout(() => input.focus(), 400);
        }
    });

    minimize.addEventListener('click', () => {
        widget.classList.remove('open');
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Suggestion chips
    suggestionsEl.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            addUserMessage(question);
            processQuestion(question);
            suggestionsEl.classList.add('hidden');
        });
    });

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        addUserMessage(text);
        processQuestion(text);
        suggestionsEl.classList.add('hidden');
    }

    function addUserMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'chat-message user';
        msg.innerHTML = `
            <div class="chat-msg-avatar">👤</div>
            <div class="chat-msg-bubble">${escapeHtml(text)}</div>
        `;
        messagesContainer.appendChild(msg);
        scrollToBottom();
    }

    function addBotMessage(html) {
        // Show typing indicator
        const typing = document.createElement('div');
        typing.className = 'chat-message bot';
        typing.innerHTML = `
            <div class="chat-msg-avatar">🤖</div>
            <div class="chat-msg-bubble">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typing);
        scrollToBottom();

        // Replace with actual message after delay
        const delay = 800 + Math.random() * 800;
        setTimeout(() => {
            typing.remove();
            const msg = document.createElement('div');
            msg.className = 'chat-message bot';
            msg.innerHTML = `
                <div class="chat-msg-avatar">🤖</div>
                <div class="chat-msg-bubble">${html}</div>
            `;
            messagesContainer.appendChild(msg);
            scrollToBottom();
        }, delay);
    }

    function scrollToBottom() {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // INTELLIGENT RESPONSE ENGINE
    // ==========================================
    function getInputLabels() {
        return {
            diet: { 1: 'Frequent Fast Food', 2: 'Mixed', 3: 'Healthy Balanced' },
            exercise: { 1: '0–1 times/week', 2: '2–3 times/week', 3: '4+ times/week' },
            sleep: { 1: 'Less than 5 hours', 2: '6–7 hours', 3: '8+ hours' },
            screen: { 1: '6+ hours', 2: '3–6 hours', 3: 'Under 3 hours' },
            stress: { 1: 'High', 2: 'Moderate', 3: 'Low' },
            environment: { 1: 'Industrial Area', 2: 'Urban', 3: 'Rural' }
        };
    }

    function getUserProfile() {
        const labels = getInputLabels();
        const score = currentScore;
        const tier = getTier(score);
        const weakAreas = Object.entries(userInputs)
            .filter(([, v]) => v > 0)
            .sort((a, b) => a[1] - b[1]);
        const strongAreas = [...weakAreas].reverse();
        return { score, tier, labels, weakAreas, strongAreas };
    }

    function getWelcomeMessage() {
        const { score, tier } = getUserProfile();
        const tierClass = tier.level;
        const scoreHtml = `<span class="chat-score-highlight ${tierClass}">${score}/100</span>`;

        if (score >= 80) {
            return `Hello! 🎉 I'm your <strong>AI Health Advisor</strong> from Malaysia 2050.<br><br>Wow, your health score is ${scoreHtml} — <strong>${tier.label}</strong>! You're on an excellent path. I'm here to help you maintain this momentum and explore what Malaysia 2050's healthcare can offer you.<br><br>Ask me anything about your score, health risks, or how to optimize your wellbeing! 💚`;
        } else if (score >= 60) {
            return `Hello! 👋 I'm your <strong>AI Health Advisor</strong> from Malaysia 2050.<br><br>Your health score is ${scoreHtml} — <strong>${tier.label}</strong>. You have a solid foundation, but there are a few areas where small changes could make a big difference by 2050.<br><br>Ask me what to improve first, or let me create a personalized wellness plan for you! 🌟`;
        } else {
            return `Hello! 🤝 I'm your <strong>AI Health Advisor</strong> from Malaysia 2050.<br><br>Your health score is ${scoreHtml} — <strong>${tier.label}</strong>. This is a critical alert, but don't worry — the future of preventive healthcare in Malaysia is designed specifically to help you turn things around.<br><br>Let me guide you. Ask me what your biggest risks are or how to start improving today! 💪`;
        }
    }

    function processQuestion(question) {
        const q = question.toLowerCase();
        let response;

        if (q.includes('score') && (q.includes('mean') || q.includes('explain') || q.includes('what'))) {
            response = explainScore();
        } else if (q.includes('improve first') || q.includes('should i improve') || q.includes('priority') || q.includes('focus')) {
            response = getImprovementPriority();
        } else if (q.includes('risk') || q.includes('danger') || q.includes('warning')) {
            response = getHealthRisks();
        } else if (q.includes('wellness plan') || q.includes('daily plan') || q.includes('routine') || q.includes('schedule')) {
            response = getDailyPlan();
        } else if (q.includes('malaysia') || q.includes('2050') && q.includes('healthcare')) {
            response = getMalaysia2050Info();
        } else if (q.includes('stress') || q.includes('anxiety') || q.includes('relax') || q.includes('calm')) {
            response = getStressAdvice();
        } else if (q.includes('diet') || q.includes('food') || q.includes('eat') || q.includes('nutrition')) {
            response = getDietAdvice();
        } else if (q.includes('exercise') || q.includes('workout') || q.includes('fitness') || q.includes('active')) {
            response = getExerciseAdvice();
        } else if (q.includes('sleep') || q.includes('insomnia') || q.includes('rest') || q.includes('tired')) {
            response = getSleepAdvice();
        } else if (q.includes('screen') || q.includes('phone') || q.includes('digital') || q.includes('eye')) {
            response = getScreenAdvice();
        } else if (q.includes('environment') || q.includes('pollution') || q.includes('air quality')) {
            response = getEnvironmentAdvice();
        } else if (q.includes('mental') || q.includes('mind') || q.includes('brain') || q.includes('cognitive')) {
            response = getMentalHealthAdvice();
        } else if (q.includes('thank') || q.includes('thanks')) {
            response = `You're most welcome! 😊 Remember, <strong>prevention is better than cure</strong> — especially by 2050. Your Digital Twin is always here to guide you. Stay healthy, stay ahead! 🌟`;
        } else if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
            response = `Hey there! 👋 I'm your AI Health Advisor. Ask me about your health score, risks, diet, exercise, sleep, or anything related to your 2050 health outlook! How can I help? 🚀`;
        } else {
            response = getGenericResponse(q);
        }

        addBotMessage(response);
    }

    function explainScore() {
        const { score, tier, labels, weakAreas } = getUserProfile();
        const tierClass = tier.level;
        const scoreHtml = `<span class="chat-score-highlight ${tierClass}">${score}/100</span>`;

        let explanation = `Your health score is ${scoreHtml} — <strong>${tier.label}</strong>.<br><br>`;
        explanation += `Here's how it's calculated:<br>`;
        explanation += `• <strong>Exercise</strong> (25% weight): ${labels.exercise[userInputs.exercise] || 'Not set'}<br>`;
        explanation += `• <strong>Sleep</strong> (20% weight): ${labels.sleep[userInputs.sleep] || 'Not set'}<br>`;
        explanation += `• <strong>Diet</strong> (20% weight): ${labels.diet[userInputs.diet] || 'Not set'}<br>`;
        explanation += `• <strong>Stress</strong> (20% weight): ${labels.stress[userInputs.stress] || 'Not set'}<br>`;
        explanation += `• <strong>Screen Time</strong> (15% weight): ${labels.screen[userInputs.screen] || 'Not set'}<br>`;
        explanation += `• <strong>Environment</strong> (±bonus): ${labels.environment[userInputs.environment] || 'Not set'}<br><br>`;

        if (score >= 80) {
            explanation += `🟢 Your lifestyle choices are <strong>excellent</strong>. You're projected to have a thriving, independent future with minimal healthcare dependency by 2050.`;
        } else if (score >= 60) {
            explanation += `🟡 You're on a <em>moderate path</em>. Some areas need attention to avoid chronic conditions by 2050. The good news? Small changes NOW can shift your trajectory significantly.`;
        } else {
            explanation += `🔴 Your current patterns put you at <em>elevated risk</em> for chronic health issues by 2050. But awareness is the first step — and Malaysia's preventive care systems are built to help you course-correct. Let me show you how!`;
        }

        return explanation;
    }

    function getImprovementPriority() {
        const { labels, weakAreas, score } = getUserProfile();
        const top3 = weakAreas.slice(0, 3);
        const areaNames = {
            diet: '🍔 Diet', exercise: '🏃 Exercise', sleep: '😴 Sleep',
            screen: '📱 Screen Time', stress: '😰 Stress', environment: '🌏 Environment'
        };
        const improvementImpact = {
            exercise: 25, sleep: 20, diet: 20, stress: 20, screen: 15, environment: 5
        };

        let response = `Based on your profile, here's your <strong>priority improvement plan</strong>:<br><br>`;

        top3.forEach(([key, val], i) => {
            const potential = improvementImpact[key] * ((3 - val) / 3);
            response += `<strong>${i + 1}. ${areaNames[key]}</strong> — Currently: <em>${labels[key][val]}</em><br>`;
            response += `↳ Potential score boost: <strong>+${Math.round(potential)} points</strong><br><br>`;
        });

        response += `💡 <strong>Start with #1</strong> — it offers the highest return on investment for your health. Even one step up in that area can significantly change your 2050 outlook!`;

        return response;
    }

    function getHealthRisks() {
        const { score } = getUserProfile();
        let response = `Based on your lifestyle profile, here are your <strong>key health risk projections</strong> for 2050:<br><br>`;

        // Cardiovascular
        const cardioScore = (userInputs.exercise / 3) * 35 + (userInputs.diet / 3) * 35 + (userInputs.stress / 3) * 30;
        if (cardioScore < 45) {
            response += `❤️ <strong>Cardiovascular Risk: HIGH</strong><br>Your exercise & diet patterns increase heart disease risk. By 2050, early intervention with AI-driven cardiac monitoring can help.<br><br>`;
        } else if (cardioScore < 70) {
            response += `💛 <strong>Cardiovascular Risk: MEDIUM</strong><br>Manageable, but improvement in diet or exercise would lower this significantly.<br><br>`;
        } else {
            response += `💚 <strong>Cardiovascular Risk: LOW</strong><br>Your active lifestyle and diet habits protect your heart well!<br><br>`;
        }

        // Mental Health
        const mentalVal = (userInputs.stress / 3) * 40 + (userInputs.sleep / 3) * 30 + (userInputs.exercise / 3) * 30;
        if (mentalVal < 45) {
            response += `🧠 <strong>Mental Wellbeing: AT RISK</strong><br>High stress combined with poor sleep creates a compounding negative effect. Prioritize stress management and sleep hygiene.<br><br>`;
        } else if (mentalVal < 70) {
            response += `🧠 <strong>Mental Wellbeing: MODERATE</strong><br>Room for improvement — better sleep and stress management would boost cognitive resilience.<br><br>`;
        } else {
            response += `🧠 <strong>Mental Wellbeing: STRONG</strong><br>Your sleep and stress management are supporting good brain health!<br><br>`;
        }

        // Screen
        if (userInputs.screen <= 1) {
            response += `👁️ <strong>Digital Eye Strain: HIGH</strong><br>Extended screen time (6+ hours) increases risk of digital fatigue, myopia progression, and sleep disruption.<br><br>`;
        }

        // Healthcare Dependency
        if (score < 60) {
            response += `🏥 <strong>Healthcare Dependency 2050: HIGH</strong><br>Without changes, you may require frequent medical intervention by 2050. Preventive action now can dramatically reduce this.`;
        } else if (score < 80) {
            response += `🏥 <strong>Healthcare Dependency 2050: MODERATE</strong><br>Some proactive changes would help ensure you stay independent and thriving.`;
        } else {
            response += `🏥 <strong>Healthcare Dependency 2050: LOW</strong><br>You're projected to remain highly independent with minimal medical needs. Keep it up!`;
        }

        return response;
    }

    function getDailyPlan() {
        const { score } = getUserProfile();
        let plan = `Here's your <strong>personalized daily wellness plan</strong> based on your Digital Twin analysis:<br><br>`;

        plan += `☀️ <strong>Morning (6:00-9:00 AM)</strong><br>`;
        if (userInputs.exercise <= 2) {
            plan += `• 20-minute morning walk or stretching routine<br>`;
        } else {
            plan += `• Continue your great exercise routine! Try adding variety.<br>`;
        }
        if (userInputs.sleep <= 2) {
            plan += `• Wake at a consistent time — helps reset circadian rhythm<br>`;
        }
        plan += `• Hydrate with a glass of water before breakfast<br><br>`;

        plan += `🌤️ <strong>Midday (12:00-2:00 PM)</strong><br>`;
        if (userInputs.diet <= 2) {
            plan += `• Swap processed lunch for a balanced meal (protein + greens + whole grains)<br>`;
        } else {
            plan += `• Maintain your balanced eating — add colorful vegetables!<br>`;
        }
        if (userInputs.screen <= 2) {
            plan += `• Take a 10-minute screen break — look at distant objects<br>`;
        }
        plan += `• 5-minute mindful breathing or micro-meditation<br><br>`;

        plan += `🌙 <strong>Evening (6:00-10:00 PM)</strong><br>`;
        if (userInputs.stress <= 2) {
            plan += `• 15-minute guided meditation or journaling for stress release<br>`;
        }
        if (userInputs.screen <= 2) {
            plan += `• Enable blue light filter 2 hours before bed, avoid screens 1 hour before sleep<br>`;
        }
        if (userInputs.sleep <= 2) {
            plan += `• Target bedtime: 10:00 PM — aim for 7-8 hours of quality sleep<br>`;
        } else {
            plan += `• Your sleep habits are great — maintain consistent sleep times<br>`;
        }
        plan += `<br>📊 Following this plan consistently could boost your score by <strong>+10 to +20 points</strong> over time!`;

        return plan;
    }

    function getMalaysia2050Info() {
        return `🌏 <strong>Malaysia 2050 Health Infrastructure</strong> — Here's what's coming:<br><br>` +
            `🏥 <strong>AI Hospital Automation</strong><br>500+ fully automated diagnostic centers with AI triage and robotic surgery across all states. Your Digital Twin will connect directly to these systems for seamless care.<br><br>` +
            `⌚ <strong>Smart Wearable Integration</strong><br>Government-subsidized health wearables syncing real-time biometrics with your Digital Twin — 98% adoption rate projected. Continuous health monitoring, 24/7.<br><br>` +
            `📡 <strong>National Health Network</strong><br>A decentralized health data mesh connecting every Rakyat to predictive care systems — 35 million Digital Twins active by 2050.<br><br>` +
            `🧬 <strong>Personalized Genome Medicine</strong><br>AI-driven gene therapy and precision medicine tailored to your unique genomic profile.<br><br>` +
            `💡 The shift from <em>treatment to prevention</em> means your lifestyle choices today directly shape how these systems serve you in 2050!`;
    }

    function getStressAdvice() {
        const stressLevel = userInputs.stress;
        const labels = getInputLabels();
        let response = `Your current stress level: <em>${labels.stress[stressLevel]}</em><br><br>`;

        if (stressLevel <= 1) {
            response += `⚠️ High stress is a <strong>major risk factor</strong> that compounds all other health issues. Here's your personalized stress-reduction protocol:<br><br>`;
            response += `1. 🧘 <strong>Box Breathing</strong> — Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Do this 3x daily.<br>`;
            response += `2. 📝 <strong>Worry Dump</strong> — Write down all worries for 10 min before bed. It reduces rumination by 40%.<br>`;
            response += `3. 🚶 <strong>Green Time</strong> — Spend 20 min in nature daily. Even urban parks count!<br>`;
            response += `4. 🎵 <strong>Binaural Beats</strong> — Listen to 432Hz or alpha wave music during work.<br>`;
            response += `5. 📱 <strong>Digital Sabbath</strong> — One screen-free hour per day.<br><br>`;
            response += `By 2050, Malaysia's <strong>Biorhythm Harmonizer</strong> wearables will detect cortisol spikes and auto-trigger personalized de-stress protocols. Start building good habits now! 🌿`;
        } else if (stressLevel === 2) {
            response += `Your stress is moderate — manageable but worth addressing. Try incorporating <strong>daily mindfulness practices</strong>:<br><br>`;
            response += `• 5-minute morning meditation<br>• Progressive muscle relaxation before bed<br>• Weekly nature walks of 30+ minutes<br>• Limiting news consumption to specific times<br><br>`;
            response += `These habits can reduce your stress from <em>moderate to low</em>, boosting your overall score! 💚`;
        } else {
            response += `Great job managing your stress! 🎉 You're already at optimal levels. To maintain this:<br><br>`;
            response += `• Continue whatever practices work for you<br>• Consider adding gratitude journaling<br>• Share your strategies with others! Teaching reinforces personal habits.<br><br>`;
            response += `Your low stress is contributing positively to your 2050 mental wellbeing projection. Keep it up! ✨`;
        }

        return response;
    }

    function getDietAdvice() {
        const dietLevel = userInputs.diet;
        const labels = getInputLabels();
        let response = `Your current diet: <em>${labels.diet[dietLevel]}</em><br><br>`;

        if (dietLevel <= 1) {
            response += `🔴 Frequent fast food significantly impacts your 2050 health projection. Here's a realistic improvement plan:<br><br>`;
            response += `<strong>Week 1-2: Small Swaps</strong><br>`;
            response += `• Replace soft drinks with water or unsweetened teh tarik<br>`;
            response += `• Add one vegetable serving per meal<br><br>`;
            response += `<strong>Week 3-4: Meal Planning</strong><br>`;
            response += `• Cook 2 healthy Malaysian meals at home per week (nasi campur with extra veggies!)<br>`;
            response += `• Choose grilled over fried options<br><br>`;
            response += `<strong>Month 2+: Sustainable Habits</strong><br>`;
            response += `• Follow a balanced plate model: ½ vegetables, ¼ protein, ¼ carbs<br>`;
            response += `• Try traditional Malaysian superfoods: ulam, tempeh, turmeric<br><br>`;
            response += `This could boost your score by <strong>+7-13 points</strong>! 🥗`;
        } else if (dietLevel === 2) {
            response += `Your diet is mixed — a good foundation! To level up:<br><br>`;
            response += `• Add more colorful vegetables and fruits (Malaysian choices: papaya, dragon fruit, kangkung)<br>`;
            response += `• Reduce processed food to 2-3 times per week max<br>`;
            response += `• Try meal prepping on weekends — saves time AND improves nutrition<br><br>`;
            response += `Your Digital Twin projects a <strong>+5-7 point improvement</strong> from better diet consistency! 🍎`;
        } else {
            response += `👏 Excellent dietary habits! You're already at optimal level. To maintain your edge:<br><br>`;
            response += `• Explore functional foods and adaptogens<br>`;
            response += `• Consider seasonal eating aligned with Malaysian harvest cycles<br>`;
            response += `• By 2050, AI Nutrition Planners will personalize your meals based on real-time metabolic data from your Digital Twin!<br><br>`;
            response += `Your healthy diet is a major contributor to your positive 2050 projection! 🌟`;
        }

        return response;
    }

    function getExerciseAdvice() {
        const exLevel = userInputs.exercise;
        const labels = getInputLabels();
        let response = `Your exercise frequency: <em>${labels.exercise[exLevel]}</em><br><br>`;

        if (exLevel <= 1) {
            response += `Exercise carries the <strong>highest weight (25%)</strong> in your health score. Here's a beginner-friendly plan:<br><br>`;
            response += `<strong>🚶 Week 1: Movement Foundation</strong><br>`;
            response += `• 15-min daily walk (morning or evening)<br>`;
            response += `• Simple stretching before bed (5 min)<br><br>`;
            response += `<strong>🏃 Week 2-3: Build Stamina</strong><br>`;
            response += `• Increase walks to 30 min, 3x per week<br>`;
            response += `• Add bodyweight exercises (squats, push-ups, 10 reps each)<br><br>`;
            response += `<strong>💪 Month 2+: Consistency</strong><br>`;
            response += `• Mix cardio + strength training<br>`;
            response += `• Join a community sports group (badminton, futsal, hiking — very popular in Malaysia!)<br><br>`;
            response += `This single change could improve your score by <strong>+8-17 points</strong>! That's the biggest single impact you can make. 🔥`;
        } else if (exLevel === 2) {
            response += `Good baseline activity! To maximize benefits:<br><br>`;
            response += `• Aim for <strong>4-5 sessions per week</strong> with varied activities<br>`;
            response += `• Include both cardiovascular AND resistance training<br>`;
            response += `• Try HIIT workouts (20 min = powerful results)<br>`;
            response += `• Explore Malaysia's outdoor options: jungle trekking, cycling trails<br><br>`;
            response += `Moving to 4+ times/week adds <strong>+4-8 points</strong> to your projection! 🎯`;
        } else {
            response += `Outstanding! 💪 You're at peak exercise levels. Advanced tips:<br><br>`;
            response += `• Ensure adequate recovery days to prevent overtraining<br>`;
            response += `• Consider periodization (varying intensity across weeks)<br>`;
            response += `• By 2050, Adaptive Fitness AI will optimize routines based on joint health, stamina, and recovery data from your Digital Twin<br><br>`;
            response += `Your exercise habit is the single biggest positive factor in your health projection! Keep inspiring others! 🌟`;
        }

        return response;
    }

    function getSleepAdvice() {
        const sleepLevel = userInputs.sleep;
        const labels = getInputLabels();
        let response = `Your current sleep: <em>${labels.sleep[sleepLevel]}</em><br><br>`;

        if (sleepLevel <= 1) {
            response += `⚠️ Less than 5 hours of sleep is a <strong>critical health risk</strong>. It affects virtually every body system. Priority actions:<br><br>`;
            response += `1. 🕙 <strong>Set a non-negotiable bedtime</strong> — same time every night, even weekends<br>`;
            response += `2. 📵 <strong>Screen curfew</strong> — no devices 1 hour before bed<br>`;
            response += `3. 🌡️ <strong>Cool room</strong> — ideal sleeping temperature is 18-22°C<br>`;
            response += `4. ☕ <strong>Caffeine curfew</strong> — no caffeine after 2 PM (including teh tarik!)<br>`;
            response += `5. 🧘 <strong>Wind-down ritual</strong> — reading, gentle stretching, or guided sleep meditation<br><br>`;
            response += `By 2050, <strong>Sleep Optimization Chambers</strong> with adaptive temperature and light therapy will be standard in Malaysian homes. Start building good sleep habits now!`;
        } else if (sleepLevel === 2) {
            response += `6-7 hours is okay but not optimal. For maximum health benefits:<br><br>`;
            response += `• Try to add <strong>30-60 minutes</strong> more sleep per night<br>`;
            response += `• Focus on <strong>sleep quality</strong>: dark room, consistent schedule, minimal disruptions<br>`;
            response += `• Track your sleep cycles — waking during light sleep feels more refreshing<br><br>`;
            response += `Improving to 8+ hours could boost your score by <strong>+3-7 points</strong>! 🌙`;
        } else {
            response += `Perfect sleep habits! 😊 You're getting optimal rest. Maintenance tips:<br><br>`;
            response += `• Keep your consistent schedule — it's your superpower<br>`;
            response += `• By 2050, Circadian AI Coaches will fine-tune your sleep based on biorhythm data<br>`;
            response += `• Your good sleep is supporting strong mental wellbeing and cognitive function projections!<br><br>`;
            response += `Sleep is the foundation of health — and you've nailed it! ✨`;
        }

        return response;
    }

    function getScreenAdvice() {
        const screenLevel = userInputs.screen;
        const labels = getInputLabels();
        let response = `Your daily screen time: <em>${labels.screen[screenLevel]}</em><br><br>`;

        if (screenLevel <= 1) {
            response += `🔴 6+ hours of non-work screen time significantly impacts your health. Here's a digital wellness strategy:<br><br>`;
            response += `• <strong>20-20-20 Rule</strong>: Every 20 min, look at something 20 feet away for 20 seconds<br>`;
            response += `• <strong>App timers</strong>: Set daily limits on social media (start with 50% reduction)<br>`;
            response += `• <strong>Replace, don't remove</strong>: Swap 1 hour of scrolling for a physical hobby<br>`;
            response += `• <strong>Blue light filtering</strong>: Enable night mode after 7 PM<br><br>`;
            response += `By 2050, <strong>Neural Fatigue Monitors</strong> in smart lenses will auto-detect eye strain and cognitive fatigue. Start protecting your vision now! 👓`;
        } else if (screenLevel === 2) {
            response += `3-6 hours is moderate. To optimize further:<br><br>`;
            response += `• Set intentional screen-free zones (bedroom, dinner table)<br>`;
            response += `• Try a "digital sunset" — no screens 1 hour before bed<br>`;
            response += `• Replace some screen time with nature exposure or social interaction<br><br>`;
            response += `Reducing to under 3 hours offers a <strong>+3-5 point improvement</strong>! 📖`;
        } else {
            response += `👏 Excellent screen discipline! Under 3 hours is ideal. You're protecting both your vision and mental health.<br><br>`;
            response += `• Your low screen time supports better sleep quality and reduced stress<br>`;
            response += `• By 2050, Nature Immersion VR will offer screen experiences that actually <em>improve</em> health! 🌿`;
        }

        return response;
    }

    function getEnvironmentAdvice() {
        const envLevel = userInputs.environment;
        const labels = getInputLabels();
        let response = `Your living environment: <em>${labels.environment[envLevel]}</em><br><br>`;

        if (envLevel <= 1) {
            response += `Living in an industrial area adds health challenges, but there are ways to mitigate:<br><br>`;
            response += `• <strong>Air purifier</strong>: Essential for indoor air quality (HEPA filter recommended)<br>`;
            response += `• <strong>Indoor plants</strong>: Snake plants, spider plants, and peace lilies filter toxins naturally<br>`;
            response += `• <strong>Mask usage</strong>: On high-pollution days, use N95 masks outdoors<br>`;
            response += `• <strong>Weekend retreats</strong>: Regular trips to green spaces (Cameron Highlands, Taman Negara)<br><br>`;
            response += `By 2050, Malaysia's <strong>Bio-Purified Living</strong> systems will provide smart home air filtration synced with outdoor pollution data! 🏡`;
        } else if (envLevel === 2) {
            response += `Urban living offers access to healthcare but comes with pollution trade-offs:<br><br>`;
            response += `• Use <strong>Clean Air Navigator</strong> features in health apps to find low-pollution routes<br>`;
            response += `• Spend time in urban green spaces (parks, botanical gardens)<br>`;
            response += `• Consider indoor air quality improvements for long-term health<br><br>`;
            response += `By 2050, Malaysian cities will have AI-optimized green corridors reducing urban pollution by 60%! 🏙️`;
        } else {
            response += `Rural living provides excellent air quality and natural environment benefits! 🌾<br><br>`;
            response += `• Your environment positively impacts your health score<br>`;
            response += `• Continue enjoying outdoor activities and natural surroundings<br>`;
            response += `• By 2050, rural areas will have full digital health infrastructure connectivity, bringing the best of both worlds 🌿`;
        }

        return response;
    }

    function getMentalHealthAdvice() {
        const mentalVal = Math.round(
            (userInputs.stress / 3) * 40 + (userInputs.sleep / 3) * 30 + (userInputs.exercise / 3) * 30
        );
        let response = `🧠 Your <strong>Mental Wellbeing Index</strong>: ${mentalVal}%<br><br>`;

        if (mentalVal < 45) {
            response += `Your mental wellbeing needs attention. Key factors affecting it:<br><br>`;
            response += `• <strong>Stress</strong> (40% influence) — Your stress level is a major contributor<br>`;
            response += `• <strong>Sleep</strong> (30% influence) — Poor sleep compounds stress effects<br>`;
            response += `• <strong>Exercise</strong> (30% influence) — Physical activity is a natural antidepressant<br><br>`;
            response += `<strong>Action Plan:</strong><br>`;
            response += `1. Start with a 10-min daily meditation (apps like Calm or Headspace)<br>`;
            response += `2. Prioritize sleep improvement (biggest quick win)<br>`;
            response += `3. Add any form of enjoyable physical movement daily<br><br>`;
            response += `By 2050, Malaysia's <strong>Sonic Therapy AI</strong> will create real-time stress-relief music tuned to your brainwave patterns! 🎵`;
        } else if (mentalVal < 70) {
            response += `Your mental health is moderate — with room to thrive. Focus on:<br><br>`;
            response += `• Consistent stress management practices<br>`;
            response += `• Quality social connections (even 10 min of meaningful conversation daily helps!)<br>`;
            response += `• Regular mindfulness or gratitude practice<br><br>`;
            response += `Small improvements here ripple across your entire health projection! 💫`;
        } else {
            response += `Your mental wellbeing is strong! 💚 You have excellent foundations in stress management, sleep, and activity. Tips to maintain:<br><br>`;
            response += `• Continue practices that work for you<br>`;
            response += `• Consider learning new skills — keeps cognitive function sharp<br>`;
            response += `• Share your positive habits with your community<br><br>`;
            response += `Your strong mental health is a pillar of your thriving 2050 projection! 🌟`;
        }

        return response;
    }

    function getGenericResponse(q) {
        const { score, tier } = getUserProfile();
        const topics = [
            `I'd be happy to help you with health advice! Here are some things I can tell you about:<br><br>`,
            `• <strong>"What does my score mean?"</strong> — Detailed breakdown of your ${score}/100<br>`,
            `• <strong>"What should I improve first?"</strong> — Priority actions ranked by impact<br>`,
            `• <strong>"What are my health risks?"</strong> — Cardiovascular, mental, and other projections<br>`,
            `• <strong>"Give me a daily wellness plan"</strong> — Personalized routine<br>`,
            `• <strong>"Tell me about diet/exercise/sleep/stress"</strong> — Category-specific advice<br>`,
            `• <strong>"How will Malaysia 2050 help?"</strong> — Future healthcare infrastructure<br><br>`,
            `Just ask, and I'll tailor the advice to your Digital Twin data! 🤖`
        ];
        return topics.join('');
    }
})();




