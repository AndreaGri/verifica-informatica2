// js/app.js

// =====================
// STATO GLOBALE
// =====================
let currentUser = JSON.parse(localStorage.getItem("user")) || null;

// =====================
// AUTH & HEADER
// =====================
function logout() {
    localStorage.removeItem("user");
    currentUser = null;
    navigateTo("/");
    renderHeader();
}

function renderHeader() {
    const nav = document.querySelector(".nav");
    if (currentUser) {
        nav.innerHTML = `
            <span>Ciao, ${currentUser.username} (${currentUser.role})</span>
            <a href="/" data-link>Home</a>
            <a href="/upload" data-link>Carica</a>
            ${currentUser.role === 'admin' ? '<a href="/stats" data-link>Stats</a>' : ''}
            <a href="#" onclick="logout()">Logout</a>
        `;
    } else {
        nav.innerHTML = `
            <a href="/" data-link>Home</a>
            <a href="/login" data-link>Login</a>
            <a href="/register" data-link>Registrati</a>
        `;
    }
}

// =====================
// VISTE
// =====================

// 1. HOME
async function renderHome() {
    const app = document.getElementById("app");
    
    // Disegna la struttura statica (Titolo + Filtri + Contenitore Lista)
    app.innerHTML = `
        <h1>Catalogo Torrent</h1>
        <div class="filters-box">
            <input type="text" id="searchTxt" placeholder="Cerca titolo..." style="flex:2">
            <select id="searchCat" style="flex:1">
                <option value="">Tutte le Categorie</option>
                <option value="Film">Film</option>
                <option value="Software">Software</option>
                <option value="Musica">Musica</option>
                <option value="Giochi">Giochi</option>
            </select>
             <select id="sortOrder" style="flex:1">
                <option value="created_at">Data</option>
                <option value="size">Dimensione</option>
            </select>
            <select id="sortDir" style="flex:1">
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
            </select>
            <button onclick="loadTorrents()" style="flex:0.5">Cerca</button>
        </div>
        <div id="torrentList" class="torrent-list">
            <div class="loading">Caricamento dati...</div>
        </div>
    `;

    // Carica i dati nel contenitore
    await loadTorrents();
}

async function loadTorrents() {
    const txt = document.getElementById("searchTxt")?.value || "";
    const cat = document.getElementById("searchCat")?.value || "";
    const sort = document.getElementById("sortOrder")?.value || "created_at";
    const dir = document.getElementById("sortDir")?.value || "desc";

    const listDiv = document.getElementById("torrentList");
    listDiv.innerHTML = '<div class="loading">Aggiornamento...</div>';

    try {
        const url = `/torrents?q=${txt}&cat=${cat}&sort_by=${sort}&order=${dir}`;
        const torrents = await apiGet(url);

        if (torrents.error) {
            listDiv.innerHTML = `<p style="color:red">${torrents.error}</p>`;
            return;
        }

        if (torrents.length === 0) {
            listDiv.innerHTML = `<p>Nessun torrent trovato.</p>`;
            return;
        }

        listDiv.innerHTML = torrents.map(t => `
            <li>
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <a href="/torrent/${t._id}" data-link style="font-weight:bold; font-size:1.1rem">${t.title}</a>
                    <small>${new Date(t.created_at).toLocaleDateString()}</small>
                </div>
                <div style="margin-top:5px; color:#555">
                    <span class="category-tag">${t.categories.join(", ")}</span>
                    <span> • ${(t.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            </li>
        `).join("");
    } catch (err) {
        console.error(err);
        listDiv.innerHTML = `<p style="color:red">Errore connessione server (Porta 5001).</p>`;
    }
}

// 2. DETTAGLIO
async function renderTorrent(id) {
    const app = document.getElementById("app");
    app.innerHTML = '<div class="loading">Caricamento dettagli...</div>';
    
    try {
        const t = await apiGet(`/torrents/${id}`);
        if(t.error) return renderNotFound();

        let downloadBtn = `<button disabled style="background:#ccc; cursor:not-allowed">Effettua il login per scaricare</button>`;
        if (currentUser) {
            downloadBtn = `<button onclick="doDownload('${t._id}')">⬇ SCARICA TORRENT</button>`;
        }

        app.innerHTML = `
            <button onclick="navigateTo('/')" style="margin-bottom:15px; background:#666">← Torna alla lista</button>
            <h1 class="torrent-title">${t.title}</h1>
            
            <div class="info-box">
                <p style="margin-bottom:10px">${t.description}</p>
                <hr style="margin:10px 0; border:0; border-top:1px solid #ccc">
                <p><strong>Dimensione:</strong> ${(t.size/1024/1024).toFixed(2)} MB</p>
                <p><strong>Download totali:</strong> ${t.total_downloads}</p>
                <p><strong>Categorie:</strong> ${t.categories.map(c => `<span class="category-tag">${c}</span>`).join("")}</p>
            </div>

            <div style="margin:25px 0">${downloadBtn}</div>

            <h3>Commenti e Valutazioni</h3>
            <div id="commentsSection">
                ${currentUser ? `
                <div class="filters-box" style="flex-direction:column; gap:10px">
                    <textarea id="commentTxt" rows="3" placeholder="Scrivi la tua recensione..."></textarea>
                    <div style="display:flex; gap:10px">
                        <select id="commentRating" style="width:auto">
                            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                            <option value="4">⭐⭐⭐⭐ (4)</option>
                            <option value="3">⭐⭐⭐ (3)</option>
                            <option value="2">⭐⭐ (2)</option>
                            <option value="1">⭐ (1)</option>
                        </select>
                        <button onclick="postComment('${t._id}')">Invia Commento</button>
                    </div>
                </div>` : '<p><em>Loggati per commentare.</em></p>'}
                
                <div id="commentsList" style="margin-top:20px"></div>
            </div>
        `;
        loadComments(id);
    } catch (e) {
        app.innerHTML = "Errore nel caricamento del torrent.";
    }
}

async function doDownload(id) {
    const res = await apiPost(`/torrents/${id}/download`, { user_id: currentUser.user_id });
    if (res.file_url) alert("Download avviato (Simulato)!");
    else alert(res.error);
}

// In js/app.js, dentro loadComments(id)

// ==========================================
// SOSTITUISCI loadComments CON QUESTA
// ==========================================
async function loadComments(id) {
    const comments = await apiGet(`/torrents/${id}/comments`);
    const div = document.getElementById("commentsList");
    
    if(comments.length === 0) {
        div.innerHTML = "<p>Nessun commento presente.</p>";
        return;
    }

    div.innerHTML = comments.map(c => {
        // Logica per i bottoni Mod
        let modActions = "";
        if (currentUser && (currentUser.role === 'moderator' || currentUser.role === 'admin')) {
            if (c.is_banned) {
                // Se è già bannato, mostriamo SBANNA (Verde)
                modActions = `<button onclick="unbanUser('${c.user_id}')" style="background:green; margin-left:10px; font-size:0.7rem">✅ SBANNA</button>`;
            } else {
                // Se è attivo, mostriamo BANNA (Nero/Rosso)
                modActions = `<button onclick="banUser('${c.user_id}')" style="background:black; margin-left:10px; font-size:0.7rem">🚫 BANNA</button>`;
            }
        }

        // Stile diverso se l'utente è bannato
        const userStyle = c.is_banned ? "text-decoration:line-through; color:red;" : "";

        return `
        <div class="comment-box" style="background:#f9f9f9; padding:10px; margin-bottom:10px; border:1px solid #eee">
            <div style="display:flex; justify-content:space-between">
                <div>
                    <strong style="${userStyle}">${c.username}</strong> 
                    ${c.is_banned ? '<small style="color:red">(BANNATO)</small>' : ''}
                    ${modActions}
                </div>
                <span>${"⭐".repeat(c.rating)}</span>
            </div>
            <p style="margin:5px 0">${c.text}</p>
            <small style="color:#888">${new Date(c.created_at).toLocaleString()}</small>
        </div>
        `;
    }).join("");
}

// ==========================================
// AGGIUNGI QUESTA FUNZIONE IN FONDO AL FILE
// ==========================================
async function unbanUser(userId) {
    if(!confirm("Vuoi riammettere questo utente?")) return;
    
    const res = await apiPost("/mod/unban_user", { 
        user_id_to_unban: userId 
    });
    
    alert(res.message);
    // Ricarica la pagina corrente per aggiornare i bottoni
    router(); 
}

// Aggiungi questa funzione in fondo a app.js
async function banUser(userIdToBan) {
    if(!confirm("Sei sicuro di voler bannare questo utente?")) return;
    
    const res = await apiPost("/mod/ban_user", { 
        user_id_to_ban: userIdToBan 
    });
    
    alert(res.message);
}
async function postComment(id) {
    const txt = document.getElementById("commentTxt").value;
    const rate = document.getElementById("commentRating").value;
    if(!txt) return alert("Scrivi qualcosa!");
    
    await apiPost(`/torrents/${id}/comments`, {
        user_id: currentUser.user_id,
        text: txt,
        rating: rate
    });
    loadComments(id); // Ricarica commenti
    document.getElementById("commentTxt").value = "";
}

async function deleteComment(cid, tid) {
    if(!confirm("Sicuro di voler eliminare?")) return;
    // Nota: API Delete non implementata in apiPost helper, usiamo fetch diretto
    await fetch(`${API_BASE}/comments/${cid}`, { method: 'DELETE' });
    loadComments(tid);
}

// 3. UPLOAD
function renderUpload() {
    if (!currentUser) return navigateTo("/login");
    const app = document.getElementById("app");
    app.innerHTML = `
        <h1>Carica Nuovo Torrent</h1>
        <form id="uploadForm" class="info-box" style="background:white; border:1px solid #ddd">
            <label>Titolo</label>
            <input type="text" id="uTitle" required>
            
            <label>Descrizione (Max 160)</label>
            <textarea id="uDesc" maxlength="160" required></textarea>
            
            <label>Dimensione (Bytes)</label>
            <input type="number" id="uSize" required>
            
            <label>Categorie (separate da virgola)</label>
            <input type="text" id="uCat" placeholder="es: Film, Horror, 2025">
            
            <button type="submit" style="margin-top:10px">Carica Torrent</button>
        </form>
    `;

    document.getElementById("uploadForm").onsubmit = async (e) => {
        e.preventDefault();
        const cats = document.getElementById("uCat").value.split(",").map(s => s.trim()).filter(x => x);
        const res = await apiPost("/torrents", {
            title: document.getElementById("uTitle").value,
            description: document.getElementById("uDesc").value,
            size: document.getElementById("uSize").value,
            categories: cats,
            author_id: currentUser.user_id,
            file_path: "simulated.torrent"
        });
        if(res.id) { 
            alert("Caricamento completato!"); 
            navigateTo("/"); 
        } else { 
            alert(res.error || "Errore upload"); 
        }
    };
}

// 4. LOGIN & REGISTER
function renderLogin() {
    document.getElementById("app").innerHTML = `
        <h1>Accedi</h1>
        <form id="loginForm" style="max-width:400px; margin:0 auto">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="pass" placeholder="Password" required>
            <button type="submit">Login</button>
            <p style="margin-top:10px; text-align:center">Non hai un account? <a href="/register" data-link>Registrati</a></p>
        </form>
    `;
    document.getElementById("loginForm").onsubmit = async (e) => {
        e.preventDefault();
        const res = await apiPost("/login", {
            email: document.getElementById("email").value,
            password: document.getElementById("pass").value
        });
        if (res.user_id) {
            localStorage.setItem("user", JSON.stringify(res));
            currentUser = res;
            navigateTo("/");
        } else {
            alert(res.error);
        }
    };
}

function renderRegister() {
    document.getElementById("app").innerHTML = `
        <h1>Registrazione</h1>
        <form id="regForm" style="max-width:400px; margin:0 auto">
            <input type="text" id="rUser" placeholder="Username" required>
            <input type="email" id="rEmail" placeholder="Email" required>
            <input type="password" id="rPass" placeholder="Password" required>
            <button type="submit">Registrati</button>
            <p style="margin-top:10px; text-align:center">Hai già un account? <a href="/login" data-link>Accedi</a></p>
        </form>
    `;
    document.getElementById("regForm").onsubmit = async (e) => {
        e.preventDefault();
        const res = await apiPost("/register", {
            username: document.getElementById("rUser").value,
            email: document.getElementById("rEmail").value,
            password: document.getElementById("rPass").value
        });
        if (res.user_id) {
            alert("Registrazione OK! Ora fai il login.");
            navigateTo("/login");
        } else {
            alert(res.error);
        }
    };
}

function renderNotFound() {
    document.getElementById("app").innerHTML = `
        <div style="text-align:center; padding:50px">
            <h1>404</h1>
            <p>Pagina non trovata</p>
            <button onclick="navigateTo('/')">Torna alla Home</button>
        </div>
    `;
}

// =====================
// ROUTER CORE
// =====================
// =====================
// ROUTER CORE
// =====================
const routes = [
    { path: "/", view: renderHome },
    { path: "/upload", view: renderUpload },
    { path: "/login", view: renderLogin },
    { path: "/register", view: renderRegister },
    
    // AGGIUNGI QUESTA RIGA QUI SOTTO:
    { path: "/stats", view: renderStats } 
];

async function router() {
    renderHeader(); // Aggiorna header (mostra/nascondi link login)
    
    const path = window.location.pathname;
    
    // Route dinamica per torrent detail
    if (path.startsWith("/torrent/")) {
        const id = path.split("/")[2];
        if (id) {
            await renderTorrent(id);
            return;
        }
    }

    const match = routes.find(r => r.path === path);
    if (match) {
        await match.view();
    } else {
        renderNotFound();
    }
}

function navigateTo(url) {
    history.pushState(null, null, url);
    router();
}

window.addEventListener("popstate", router);
// ==========================================
// PAGINA STATISTICHE (SOLO ADMIN)
// ==========================================
async function renderStats() {
    // 1. Protezione: Se non sei admin, ti rimando alla home
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Accesso negato: Area riservata agli amministratori.");
        return navigateTo("/");
    }

    const app = document.getElementById("app");
    app.innerHTML = '<div class="loading">Caricamento statistiche...</div>';

    try {
        // 2. Chiamata API
        const stats = await apiGet("/admin/stats");

        if (stats.error) {
            app.innerHTML = `<h3 style="color:red">Errore: ${stats.error}</h3>`;
            return;
        }

        // 3. Disegno la Dashboard
        app.innerHTML = `
            <h1>📊 Pannello Amministratore</h1>
            <button onclick="navigateTo('/')" style="margin-bottom:20px; background:#666">← Torna alla Home</button>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                
                <div class="info-box" style="background:white; border:1px solid #ddd">
                    <h3 style="border-bottom:2px solid #4caf50; padding-bottom:10px;">🏆 Top 5 Download</h3>
                    <ul style="list-style:none; padding:0; margin-top:10px">
                        ${stats.top_downloads.map((t, i) => `
                            <li style="padding:8px 0; border-bottom:1px solid #eee">
                                <strong>#${i+1}</strong> <a href="/torrent/${t._id}" data-link>${t.title}</a>
                                <span style="float:right; color:#666">⬇ ${t.total_downloads}</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>

                <div class="info-box" style="background:white; border:1px solid #ddd">
                    <h3 style="border-bottom:2px solid #2196F3; padding-bottom:10px;">📚 Categorie Popolari</h3>
                    <ul style="list-style:none; padding:0; margin-top:10px">
                        ${stats.popular_categories.map(c => `
                            <li style="padding:8px 0; border-bottom:1px solid #eee">
                                <strong>${c._id}</strong>
                                <span style="float:right; background:#eee; padding:2px 8px; border-radius:10px">${c.count} file</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>

                <div class="info-box" style="background:white; border:1px solid #ddd">
                    <h3 style="border-bottom:2px solid #ff9800; padding-bottom:10px;">📅 Nuovi (Ultimi 7gg)</h3>
                    ${stats.new_torrents_last_week.length === 0 ? '<p>Nessun nuovo arrivo.</p>' : ''}
                    <ul style="list-style:none; padding:0; margin-top:10px">
                        ${stats.new_torrents_last_week.map(c => `
                            <li style="padding:8px 0; border-bottom:1px solid #eee">
                                <strong>${c._id}</strong>
                                <span style="float:right; color:green">+${c.count}</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>

            </div>
        `;
    } catch (err) {
        console.error(err);
        app.innerHTML = "Errore nel caricamento delle statistiche.";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });
    router();
});