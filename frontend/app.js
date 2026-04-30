// Configuration
const API_BASE = window.location.origin;
let currentUser = "gitmini_user";
let currentPass = "gitmini_password"; 

// State
let state = {
    view: 'repos',
    selectedRepo: null
};

// Utilities
const getAuthHeader = () => ({
    'Authorization': 'Basic ' + btoa(`${currentUser}:${currentPass}`)
});

async function api(path, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// Navigation
function showSection(section) {
    state.view = section;
    render();
}

// Renderers
async function render() {
    const area = document.getElementById('content-area');
    area.innerHTML = '<div class="loading">Fetching data from SQL...</div>';

    try {
        if (state.view === 'repos') {
            const repos = await api('/repos');
            area.innerHTML = `
                <div class="repo-grid">
                    ${repos.map(repo => `
                        <div class="card glass" onclick="openRepo('${repo.name}')">
                            <h3>${repo.name}</h3>
                            <p>${repo.description || 'No description'}</p>
                            <div class="meta" style="margin-top: 15px; color: var(--text-secondary); font-size: 13px;">
                                <span><i data-lucide="lock" style="width:14px"></i> ${repo.is_private ? 'Private' : 'Public'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (state.view === 'history') {
            const history = await api(`/repos/${state.selectedRepo}/history`);
            area.innerHTML = `
                <div class="history-list">
                    <div style="margin-bottom: 20px; display:flex; align-items:center; gap:20px">
                        <button class="btn-primary" onclick="showSection('repos')"><i data-lucide="arrow-left"></i></button>
                        <h2>History for ${state.selectedRepo}</h2>
                    </div>
                    ${history.map(item => `
                        <div class="history-item">
                            <div class="commit-card glass card" style="width: 100%">
                                <code style="color: var(--accent-blue)">${item.hash.substring(0, 7)}</code>
                                <p style="margin: 8px 0">${item.message}</p>
                                <span style="font-size: 12px; color: var(--text-secondary)">${new Date(item.date).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (state.view === 'issues') {
            const issues = await api('/issues'); 
            area.innerHTML = `
                <div style="padding:40px">
                    <h2>Global Issues Tracker</h2>
                    <div class="repo-grid">
                        ${issues.map(iss => `<div class="card glass"><h4>#${iss.id} ${iss.title}</h4><p>${iss.status}</p></div>`).join('')}
                    </div>
                </div>
            `;
        } else if (state.view === 'pulls') {
            area.innerHTML = `<div style="padding:40px"><h2>Pull Requests</h2><p>Feature coming soon...</p></div>`;
        }
        lucide.createIcons();
    } catch (err) {
        area.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
}

// Actions
function openRepo(name) {
    state.selectedRepo = name;
    state.view = 'history';
    render();
}

async function handleSearch(e) {
    if (e.key === 'Enter') {
        const q = e.target.value;
        if (!q) { render(); return; }
        
        const area = document.getElementById('content-area');
        area.innerHTML = '<div class="loading">Searching with GIN Index...</div>';
        
        try {
            const results = await api(`/repos/${state.selectedRepo || 'gitmini'}/search?q=${q}`);
            area.innerHTML = `
                <div style="padding: 40px">
                    <h2>Search Results for "${q}"</h2>
                    <div class="repo-grid">
                        ${results.map(r => `
                            <div class="card glass">
                                <h4>Issue: ${r.title}</h4>
                                <span class="badge" style="background:var(--accent-blue); padding:2px 8px; border-radius:4px; font-size:10px">${r.status}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            lucide.createIcons();
        } catch (err) {
            console.error(err);
            area.innerHTML = `<div class="error">Search failed: ${err.message}</div>`;
        }
    }
}

// Modal Logic
function openCreateRepo() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    content.innerHTML = `
        <h2>Create New Repository</h2>
        <div style="margin-top:20px">
            <input type="text" id="repo-name" placeholder="Repository Name" style="width:100%; padding:10px; margin-bottom:20px; border-radius:8px; border:1px solid var(--glass-border); background:var(--glass-bg); color:white">
            <button class="btn-primary" onclick="submitCreateRepo()">Create Now</button>
        </div>
    `;
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

async function submitCreateRepo() {
    const name = document.getElementById('repo-name').value;
    if (!name) return;
    try {
        await api('/repos', 'POST', { name, description: "New repo via Dashboard", is_private: false });
        closeModal();
        state.view = 'repos';
        render();
    } catch (err) {
        alert("Create failed: " + err.message);
    }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
    const userEl = document.getElementById('display-user');
    if(userEl) userEl.innerText = currentUser;
    render();
});
