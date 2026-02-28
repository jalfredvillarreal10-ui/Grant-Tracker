import sqlite3
import requests
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# ==========================================
# 1. APP INITIALIZATION & MIDDLEWARE
# ==========================================
app = FastAPI(
    title="Grant Tracker API",
    description="Backend API for centralized grant tracking and management.",
    version="1.0.0"
)

# Enable CORS so your React frontend (usually on port 3000 or 5173) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. DATABASE SETUP
# ==========================================
DB_FILE = "grants.db"

def init_db():
    """Initializes the SQLite database and creates the grants table if it doesn't exist."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS grants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grant_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                agency TEXT NOT NULL,
                deadline DATE NOT NULL,
                status TEXT DEFAULT 'Active',
                renewals_needed BOOLEAN DEFAULT 0
            )
        ''')
        conn.commit()

# Run database initialization on startup
init_db()

# Dependency to get a database connection per request
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row # Returns rows as dictionaries instead of tuples
    try:
        yield conn
    finally:
        conn.close()

# ==========================================
# 3. PYDANTIC MODELS (DATA VALIDATION)
# ==========================================
class GrantBase(BaseModel):
    grant_number: str
    title: str
    agency: str
    deadline: str
    status: str = "Active"
    renewals_needed: bool = False

class GrantResponse(GrantBase):
    id: int

# ==========================================
# 4. API ENDPOINTS (ROUTES)
# ==========================================

@app.get("/api/grants", response_model=List[GrantResponse])
def get_all_grants(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Fetch all tracked grants, ordered by the soonest deadline."""
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM grants ORDER BY deadline ASC')
    grants = cursor.fetchall()
    return [dict(grant) for grant in grants]

@app.post("/api/grants", response_model=dict)
def create_grant(grant: GrantBase, conn: sqlite3.Connection = Depends(get_db_connection)):
    """Save a new grant to the database."""
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO grants (grant_number, title, agency, deadline, status, renewals_needed)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (grant.grant_number, grant.title, grant.agency, grant.deadline, grant.status, grant.renewals_needed))
        conn.commit()
        return {"message": "Grant added successfully", "grant_number": grant.grant_number}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="A grant with this number already exists.")

@app.get("/api/grantsgov/search/{opportunity_number}")
def fetch_from_grants_gov(opportunity_number: str):
    """Fetch grant details from Grants.gov to auto-fill the frontend form."""
    url = "https://api.grants.gov/v1/api/search2"
    
    # 1. Query the exact Opportunity Number instead of a broad keyword search
    payload = {"oppNum": opportunity_number} 
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if not response.ok:
            raise HTTPException(status_code=500, detail=f"Grants.gov rejected request. Status: {response.status_code}")
            
        json_response = response.json()
        
        # 2. Parse the payload
        if json_response.get("errorcode") == 0 and "oppHits" in json_response.get("data", {}):
            hits = json_response["data"]["oppHits"]
            if hits:
                hit = hits[0] # Grab the exact match
                
                # Handle empty strings returned by Grants.gov
                close_date = hit.get("closeDate") or "No deadline provided"
                if " " in close_date:
                    close_date = close_date.split(" ")[0] # Strip timestamps if present
                    
                return {
                    "grant_number": hit.get("oppNum") or opportunity_number,
                    "title": hit.get("title") or hit.get("opportunityTitle") or "Title not found",
                    "agency": hit.get("agencyName") or hit.get("agency") or "Agency not found",
                    "deadline": close_date
                }
                
        raise HTTPException(status_code=404, detail="Grant not found on Grants.gov")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# ==========================================
# 5. SERVER EXECUTION
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # Runs the server on http://localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)