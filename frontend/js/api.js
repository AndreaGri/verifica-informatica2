// js/api.js

// Ora usiamo un percorso relativo. Funziona OVUNQUE (Locale, Cloud, Codespaces).
const API_BASE = "/api";

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { "Accept": "application/json" }
        });
        if (!res.ok) throw new Error("Errore HTTP " + res.status);
        return res.json();
    } catch (err) {
        console.error(err);
        return { error: "Errore di connessione" };
    }
}

async function apiPost(path, data) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Errore HTTP " + res.status);
        return res.json();
    } catch (err) {
        console.error(err);
        return { error: "Errore di connessione" };
    }
}