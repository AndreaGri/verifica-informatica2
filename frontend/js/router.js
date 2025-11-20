// =====================
// NAVIGAZIONE SPA
// =====================

// Intercetta i link con data-link
document.addEventListener("click", e => {
    if (e.target.matches("[data-link]")) {
        e.preventDefault();
        navigateTo(e.target.href);
    }
});

// Cambia pagina senza ricaricare
function navigateTo(url) {
    history.pushState(null, null, url);
    router();
}

// Quando cambio pagina (indietro/avanti)
window.addEventListener("popstate", router);

// Lista delle rotte
const routes = [
    { path: "/", view: () => renderHome() },
    { path: "/torrent/", view: (id) => renderTorrent(id) },
    { path: "/login", view: () => renderLogin() },
    { path: "/register", view: () => renderRegister() }
];

// Router principale
async function router() {
    const path = window.location.pathname;

    // Route: pagina torrent
    if (path.startsWith("/torrent/")) {
        const id = path.split("/")[2];
        return renderTorrent(id);
    }

    // Route standard
    const match = routes.find(r => r.path === path);

    if (match) match.view();
    else renderNotFound();
}
