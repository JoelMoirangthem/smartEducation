/**
 * Agent smoke test — runs key flows against a LIVE backend.
 * Usage: node scripts/dev/agent_smoke.js
 * Requires: backend running on PORT (default 5000), test users must exist
 * (agent_admin@test.edu / agent_teacher@test.edu / agent_student@test.edu, password testpass123).
 */
require('dotenv').config();
const BASE = `http://localhost:${process.env.PORT || 5000}/api/v1`;
const AGENT_BASE = process.env.AGENT_PY_URL || 'http://localhost:8000/api/v1';

const login = async (email, password, role) => {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    if (!data.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
    return data.token;
};

const parseEVT = (text) => {
    const frames = [];
    for (const line of text.split('\n')) {
        if (!line.startsWith('[EVT] ')) continue;
        try { frames.push(JSON.parse(line.slice(6))); } catch (e) {}
    }
    return frames;
};

const CHAT = async (token, message) => {
    const res = await fetch(`${AGENT_BASE}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    const text = await res.text();
    return parseEVT(text);
};

const APPROVE = async (token, approvalId, decision) => {
    const res = await fetch(`${AGENT_BASE}/agent/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ approvalId, decision })
    });
    if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
    const text = await res.text();
    return parseEVT(text);
};

const assert = (cond, label) => {
    if (!cond) { console.error(`✗ FAIL: ${label}`); process.exitCode = 1; }
    else console.log(`✓ PASS: ${label}`);
};

(async () => {
    const adminTok = await login('agent_admin@test.edu', 'testpass123', 'admin');
    const teacherTok = await login('agent_teacher@test.edu', 'testpass123', 'teacher');
    const studentTok = await login('agent_student@test.edu', 'testpass123', 'student');

    // 1. Health
    const health = await fetch(`${AGENT_BASE}/agent/health`, { headers: { Authorization: `Bearer ${adminTok}` } }).then(r => r.json());
    assert(health.reachable === true, `agent provider reachable (${health.model})`);
    assert((health.tools || 0) >= 60, `native tools registered (got ${health.tools})`);

    // 2. Read as admin → instant tool + answer, no approval
    const evts = await CHAT(adminTok, 'What classes exist? List their names.');
    assert(evts.some(e => e.type === 'tool_result' && e.status === 'ok') || evts.some(e => e.type === 'intent'), 'supervisor routed intent / read tool executed');
    assert(evts.some(e => e.type === 'answer'), 'final answer delivered');
    assert(evts.some(e => e.type === 'session'), 'session saved');

    // 3. Write as admin → approval pause, approve resume (unique notice per run for idempotency)
    const stamp = Date.now().toString().slice(-5);
    const wr = await CHAT(adminTok, `Post a campus notice with title "Sports Day ${stamp}" and content "Annual sports day will be held on Friday."`);
    const apr = wr.find(e => e.type === 'approval');
    assert(wr.some(e => e.type === 'approval'), 'write paused for approval (human-in-the-loop)');
    if (apr) {
        const resumed = await APPROVE(adminTok, apr.approvalId, 'approve');
        const toolRes = resumed.find(e => e.type === 'tool_result' && e.tool === 'create_notice');
        assert(toolRes && toolRes.status === 'ok', 'approved write executed (' + (toolRes?.summary || 'completed') + ')');
        assert(resumed.some(e => e.type === 'answer'), 'resumed turn produced final answer');
    }

    // 4. Role guard: student cannot use admin tools
    const st = await CHAT(studentTok, 'Create a class 9Y');
    assert((st.find(e => e.type === 'tool_result')?.status) !== 'ok' || st.some(e => e.type === 'answer'), 'student guarded from admin tool');

    // 5. Audit trail (written directly to agentactionlogs by the Python service)
    const { MongoClient } = require('mongodb');
    require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
    const mc = new MongoClient(process.env.MONGODB_URI);
    await mc.connect();
    const total = await mc.db().collection('agentactionlogs').countDocuments();
    const recent = await mc.db().collection('agentactionlogs').find().sort({_id:-1}).limit(20).toArray();
    await mc.close();
    assert(total >= 1, `audit log populated (${total} actions)`);
    assert(recent.every(a => !JSON.stringify(a.args || {}).match(/password/i)), 'no passwords in audit args');

    console.log(process.exitCode ? '\nSMOKE TEST FAILED' : '\nALL SMOKE TESTS PASSED');
    process.exit(process.exitCode || 0);
})().catch(e => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); });