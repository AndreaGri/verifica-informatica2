import os
from flask import Flask, request, jsonify, send_from_directory
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import ObjectId
from datetime import datetime, timedelta
import pymongo
import urllib.parse 
# ======================================================
# CONFIGURAZIONE APP (SERVER UNICO)
# ======================================================
# "static_folder" dice a Flask dove trovare i file del sito (html, css, js)
app = Flask(__name__, static_folder="frontend")

# Lasciamo CORS per sicurezza, ma ora che è tutto sullo stesso server
# non darà più fastidio.
CORS(app)
 # <--- AGGIUNGI QUESTO IMPORT IN CIMA

# ... altri import ...

# Cerca la parte dove configuri MONGO_URI e sostituiscila con questa:

# 1. Scrivi qui la tua password (così python la gestisce come testo semplice)
M_PASSWORD = "Ciao1234"

# 2. Questo comando converte i caratteri speciali (es. @ diventa %40)
escaped_password = urllib.parse.quote_plus(M_PASSWORD)

# 3. Inseriamo la password corretta nell'indirizzo
app.config["MONGO_URI"] = (
    f"mongodb+srv://grilloandrea_db_user:{escaped_password}"
    "@grillodb.ev7ylv7.mongodb.net/Torrent_Sharing?retryWrites=true&w=majority"
)



mongo = PyMongo(app)
 
def oid(id):
    try:
        return ObjectId(id)
    except:
        return None

# ======================================================
# API REST (IL TUO CODICE BACKEND ESISTENTE)
# ======================================================

# ======================================================
#  AREA MODERATORI
# ======================================================

@app.post("/api/mod/ban_user")
def ban_user():
    data = request.json
    # Qui dovresti controllare se chi fa la richiesta è davvero un mod/admin
    # Per semplicità lo facciamo diretto:
    mongo.db.users.update_one(
        {"_id": oid(data["user_id_to_ban"])}, 
        {"$set": {"banned": True}}
    )
    return jsonify({"message": "Utente bannato con successo"})

@app.delete("/api/mod/torrents/<id>")
def delete_torrent_mod(id):
    # Cancellazione logica o fisica del torrent
    mongo.db.torrents.delete_one({"_id": oid(id)})
    return jsonify({"message": "Torrent eliminato dal moderatore"})


@app.post("/api/register")
def register():
    data = request.json
    if mongo.db.users.find_one({"email": data["email"]}):
        return jsonify({"error": "Email già registrata"}), 400
    
    user_id = mongo.db.users.insert_one({
        "username": data["username"],
        "email": data["email"],
        "password": data["password"], 
        "role": "user", 
        "banned": False,
        "created_at": datetime.utcnow()
    }).inserted_id

    return jsonify({"message": "Registrazione avvenuta", "user_id": str(user_id), "role": "user"})

@app.post("/api/login")
def login():
    data = request.json
    user = mongo.db.users.find_one({"email": data["email"], "password": data["password"]})
    
    if not user:
        return jsonify({"error": "Credenziali errate"}), 401
    
    if user.get("banned"):
        return jsonify({"error": "Utente bannato"}), 403

    return jsonify({
        "message": "Login effettuato",
        "user_id": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "user")
    })

@app.get("/api/torrents")
def list_torrents():
    filters = {}
    text = request.args.get("q")
    category = request.args.get("cat")
    after = request.args.get("after")
    
    if text:
        filters["$or"] = [
            {"title": {"$regex": text, "$options": "i"}},
            {"description": {"$regex": text, "$options": "i"}}
        ]
    if category:
        filters["categories"] = category
    if after:
        try:
            filters["created_at"] = {"$gt": datetime.fromisoformat(after)}
        except:
            pass

    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")
    mongo_order = pymongo.DESCENDING if order == "desc" else pymongo.ASCENDING
    
    cursor = mongo.db.torrents.find(filters).sort(sort_by, mongo_order)
    torrents = list(cursor)

    for t in torrents:
        t["_id"] = str(t["_id"])
        t["author_id"] = str(t["author_id"])

    return jsonify(torrents)

@app.get("/api/torrents/<id>")
def get_torrent(id):
    t = mongo.db.torrents.find_one({"_id": oid(id)})
    if not t:
        return jsonify({"error": "Torrent non trovato"}), 404
    
    t["_id"] = str(t["_id"])
    t["author_id"] = str(t["author_id"])
    return jsonify(t)

@app.post("/api/torrents")
def upload_torrent():
    data = request.json
    if len(data.get("description", "")) > 160:
        return jsonify({"error": "Descrizione troppo lunga (max 160)"}), 400

    new_torrent = {
        "title": data["title"],
        "description": data["description"],
        "size": int(data["size"]),
        "categories": data["categories"],
        "images": data.get("images", []),
        "file_path": data["file_path"],
        "author_id": oid(data["author_id"]),
        "created_at": datetime.utcnow(),
        "total_downloads": 0,
        "avg_rating": 0,
        "total_ratings": 0
    }
    
    res = mongo.db.torrents.insert_one(new_torrent)
    return jsonify({"message": "Torrent caricato", "id": str(res.inserted_id)}), 201

# ==========================================
# SOSTITUISCI list_comments CON QUESTA VERSIONE
# ==========================================
@app.get("/api/torrents/<id>/comments")
def list_comments(id):
    comments = list(mongo.db.comments.find({"torrent_id": oid(id)}))
    for c in comments:
        c["_id"] = str(c["_id"])
        c["torrent_id"] = str(c["torrent_id"])
        c["user_id"] = str(c["user_id"])
        
        # Recuperiamo info sull'utente
        user = mongo.db.users.find_one({"_id": oid(c["user_id"])})
        if user:
            c["username"] = user["username"]
            c["is_banned"] = user.get("banned", False) # <--- NUOVO: Ci dice se è bannato
        else:
            c["username"] = "Unknown"
            c["is_banned"] = False
        
    return jsonify(comments)

# ==========================================
# AGGIUNGI QUESTA NUOVA API SOTTO A ban_user
# ==========================================
@app.post("/api/mod/unban_user")
def unban_user():
    data = request.json
    # Imposta banned = False
    mongo.db.users.update_one(
        {"_id": oid(data["user_id_to_unban"])}, 
        {"$set": {"banned": False}}
    )
    return jsonify({"message": "Utente sbannato con successo"})

@app.post("/api/torrents/<id>/comments")
def add_comment(id):
    data = request.json
    if len(data["text"]) > 160:
         return jsonify({"error": "Commento troppo lungo"}), 400

    mongo.db.comments.insert_one({
        "torrent_id": oid(id),
        "user_id": oid(data["user_id"]),
        "rating": int(data["rating"]),
        "text": data["text"],
        "created_at": datetime.utcnow()
    })
    
    mongo.db.torrents.update_one(
        {"_id": oid(id)},
        {"$inc": {"total_ratings": 1}}
    )
    return jsonify({"message": "Commento aggiunto"}), 201

@app.put("/api/comments/<id>")
def update_comment(id):
    data = request.json
    mongo.db.comments.update_one(
        {"_id": oid(id), "user_id": oid(data["user_id"])},
        {"$set": {"text": data["text"], "updated_at": datetime.utcnow()}}
    )
    return jsonify({"message": "Commento aggiornato"})

@app.delete("/api/comments/<id>")
def delete_comment(id):
    mongo.db.comments.delete_one({"_id": oid(id)})
    return jsonify({"message": "Commento eliminato"})

@app.post("/api/torrents/<id>/download")
def register_download(id):
    data = request.json
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "Devi essere registrato per scaricare"}), 403

    mongo.db.downloads.insert_one({
        "torrent_id": oid(id),
        "user_id": oid(user_id),
        "downloaded_at": datetime.utcnow()
    })

    mongo.db.torrents.update_one(
        {"_id": oid(id)},
        {"$inc": {"total_downloads": 1}}
    )
    return jsonify({"message": "Download avviato", "file_url": "magnet:?xt=urn:btih:example..."})

@app.get("/api/admin/stats")
def admin_stats():
    top_torrents = list(mongo.db.torrents.find({}, {"title":1, "total_downloads":1}).sort("total_downloads", -1).limit(5))
    for t in top_torrents: t["_id"] = str(t["_id"])

    last_week = datetime.utcnow() - timedelta(days=7)
    pipeline_new = [
        {"$match": {"created_at": {"$gte": last_week}}},
        {"$unwind": "$categories"},
        {"$group": {"_id": "$categories", "count": {"$sum": 1}}}
    ]
    new_by_cat = list(mongo.db.torrents.aggregate(pipeline_new))

    pipeline_pop = [
        {"$unwind": "$categories"},
        {"$group": {"_id": "$categories", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    pop_cats = list(mongo.db.torrents.aggregate(pipeline_pop))

    return jsonify({
        "top_downloads": top_torrents,
        "new_torrents_last_week": new_by_cat,
        "popular_categories": pop_cats
    })

# ======================================================
# NUOVA PARTE: SERVE IL FRONTEND (NO CORS, NO WEB.PY)
# ======================================================

# 1. Rotta Principale: Serve index.html
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

# 2. Rotta "Catch-All": Serve file statici (JS, CSS) o rimanda alla SPA
@app.route("/<path:path>")
def serve_static(path):
    # Se il browser chiede un file che esiste (es: css/styles.css), lo serviamo
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Se chiede una pagina che non è un file (es: /login, /upload),
    # serviamo index.html e lasciamo fare il routing a JavaScript
    return send_from_directory(app.static_folder, "index.html")

# ======================================================
# AVVIO
# ======================================================
if __name__ == "__main__":
    # Giriamo sulla 5001, che è già pubblica su Codespaces
    app.run(port=5001, debug=True)