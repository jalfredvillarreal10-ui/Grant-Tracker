from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import requests
import os
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

DB_PATH = "grants.db"
GRANTS_GOV_API = "https://api.grants.gov/v1/api/search2"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS grants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            agency TEXT,
            opportunity_number TEXT UNIQUE,
            opportunity_id TEXT,
            description TEXT,
            funding_amount REAL,
            deadline TEXT,
            renewal_date TEXT,
            status TEXT DEFAULT 'tracking',
            category TEXT,
            eligibility TEXT,
            award_ceiling REAL,
            award_floor REAL,
            expected_awards INTEGER,
            application_url TEXT,
            notes TEXT,
            tags TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# API KEY ENTRY (if needed) 
@app.route("/api/settings", methods=["GET", "POST"])
def settings():
    conn = get_db()
    if request.method == "POST":
        data = request.json
        for k, v in data.items():
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return jsonify({r["key"]: r["value"] for r in rows})


@app.route("/api/grants", methods=["GET"])
def list_grants():
    conn = get_db()
    status = request.args.get("status")
    query = "SELECT * FROM grants"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY deadline ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/grants", methods=["POST"])
def create_grant():
    data = request.json
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO grants (title, agency, opportunity_number, opportunity_id, description,
                funding_amount, deadline, renewal_date, status, category, eligibility,
                award_ceiling, award_floor, expected_awards, application_url, notes, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("title"), data.get("agency"), data.get("opportunity_number"),
            data.get("opportunity_id"), data.get("description"), data.get("funding_amount"),
            data.get("deadline"), data.get("renewal_date"), data.get("status", "tracking"),
            data.get("category"), data.get("eligibility"), data.get("award_ceiling"),
            data.get("award_floor"), data.get("expected_awards"), data.get("application_url"),
            data.get("notes"), json.dumps(data.get("tags", []))
        ))
        conn.commit()
        grant_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        grant = conn.execute("SELECT * FROM grants WHERE id = ?", (grant_id,)).fetchone()
        conn.close()
        return jsonify(dict(grant)), 201
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

@app.route("/api/grants/<int:grant_id>", methods=["GET"])
def get_grant(grant_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM grants WHERE id = ?", (grant_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))

@app.route("/api/grants/<int:grant_id>", methods=["PUT"])
def update_grant(grant_id):
    data = request.json
    conn = get_db()
    conn.execute("""
        UPDATE grants SET title=?, agency=?, opportunity_number=?, description=?,
            funding_amount=?, deadline=?, renewal_date=?, status=?, category=?,
            eligibility=?, award_ceiling=?, award_floor=?, expected_awards=?,
            application_url=?, notes=?, tags=?, updated_at=datetime('now')
        WHERE id=?
    """, (
        data.get("title"), data.get("agency"), data.get("opportunity_number"),
        data.get("description"), data.get("funding_amount"), data.get("deadline"),
        data.get("renewal_date"), data.get("status"), data.get("category"),
        data.get("eligibility"), data.get("award_ceiling"), data.get("award_floor"),
        data.get("expected_awards"), data.get("application_url"), data.get("notes"),
        json.dumps(data.get("tags", [])), grant_id
    ))
    conn.commit()
    row = conn.execute("SELECT * FROM grants WHERE id = ?", (grant_id,)).fetchone()
    conn.close()
    return jsonify(dict(row))

@app.route("/api/grants/<int:grant_id>", methods=["DELETE"])
def delete_grant(grant_id):
    conn = get_db()
    conn.execute("DELETE FROM grants WHERE id = ?", (grant_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# DASHBOARD 
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    conn = get_db()
    now = datetime.now().date()
    week = (now + timedelta(days=7)).isoformat()
    month = (now + timedelta(days=30)).isoformat()
    today = now.isoformat()

    total = conn.execute("SELECT COUNT(*) FROM grants").fetchone()[0]
    active = conn.execute("SELECT COUNT(*) FROM grants WHERE status='tracking'").fetchone()[0]
    applied = conn.execute("SELECT COUNT(*) FROM grants WHERE status='applied'").fetchone()[0]
    awarded = conn.execute("SELECT COUNT(*) FROM grants WHERE status='awarded'").fetchone()[0]
    due_this_week = conn.execute(
        "SELECT COUNT(*) FROM grants WHERE deadline >= ? AND deadline <= ? AND status IN ('tracking','applied')",
        (today, week)
    ).fetchone()[0]
    due_this_month = conn.execute(
        "SELECT COUNT(*) FROM grants WHERE deadline >= ? AND deadline <= ? AND status IN ('tracking','applied')",
        (today, month)
    ).fetchone()[0]
    total_funding = conn.execute(
        "SELECT COALESCE(SUM(funding_amount),0) FROM grants WHERE status='awarded'"
    ).fetchone()[0]
    upcoming = conn.execute(
        "SELECT * FROM grants WHERE deadline >= ? AND status IN ('tracking','applied') ORDER BY deadline ASC LIMIT 10",
        (today,)
    ).fetchall()

    conn.close()
    return jsonify({
        "total": total,
        "active": active,
        "applied": applied,
        "awarded": awarded,
        "due_this_week": due_this_week,
        "due_this_month": due_this_month,
        "total_funding_awarded": total_funding,
        "upcoming_deadlines": [dict(r) for r in upcoming]
    })

# FOR SEARCHING
@app.route("/api/grants-gov/search", methods=["POST"])
def search_grants_gov():
    data = request.json
    conn = get_db()
    api_key_row = conn.execute("SELECT value FROM settings WHERE key='grants_gov_api_key'").fetchone()
    conn.close()

    api_key = api_key_row["value"] if api_key_row else None
    if not api_key:
        return jsonify({"error": "No Grants.gov API key configured"}), 400

    keyword = data.get("keyword", "")
    agency = data.get("agency", "")
    rows = data.get("rows", 25)

    payload = {
        "keyword": keyword,
        "oppStatuses": "posted",
        "rows": rows,
    }
    if agency:
        payload["agency"] = agency

    try:
        response = requests.post(
            GRANTS_GOV_API,
            json=payload,
            headers={"Content-Type": "application/json", "Ocp-Apim-Subscription-Key": api_key},
            timeout=15
        )
        if response.status_code == 200:
            result = response.json()
            opps = result.get("oppHits", [])
            formatted = []
            for o in opps:
                formatted.append({
                    "title": o.get("title", ""),
                    "agency": o.get("agencyName", ""),
                    "opportunity_number": o.get("number", ""),
                    "opportunity_id": str(o.get("id", "")),
                    "description": o.get("synopsis", ""),
                    "deadline": o.get("closeDate", ""),
                    "award_ceiling": o.get("awardCeiling"),
                    "award_floor": o.get("awardFloor"),
                    "expected_awards": o.get("expectedNumberOfAwards"),
                    "category": o.get("oppCategory", {}).get("description", "") if isinstance(o.get("oppCategory"), dict) else "",
                    "application_url": f"https://www.grants.gov/search-results-detail/{o.get('id', '')}",
                })
            return jsonify({"results": formatted, "total": len(formatted)})
        else:
            return jsonify({"error": f"Grants.gov returned {response.status_code}", "detail": response.text}), 500
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
