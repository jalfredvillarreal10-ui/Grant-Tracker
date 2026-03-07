import sqlite3
import requests
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

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
                amount INTEGER DEFAULT 0,
                status TEXT DEFAULT 'available',
                renewals_needed BOOLEAN DEFAULT 0,
                submission_date DATE,
                expected_notification_date DATE,
                internal_lead TEXT,
                application_status TEXT,
                rejection_reason TEXT,
                feedback_summary TEXT,
                denial_date DATE
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
    amount: int = 0
    status: str = "available"
    renewals_needed: bool = False
    submission_date: Optional[str] = None
    expected_notification_date: Optional[str] = None
    internal_lead: Optional[str] = None
    application_status: Optional[str] = None
    rejection_reason: Optional[str] = None
    feedback_summary: Optional[str] = None
    denial_date: Optional[str] = None

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
            INSERT INTO grants (grant_number, title, agency, deadline, amount, status, renewals_needed)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (grant.grant_number, grant.title, grant.agency, grant.deadline, grant.amount, grant.status, grant.renewals_needed))
        conn.commit()
        return {"message": "Grant added successfully", "grant_number": grant.grant_number}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="A grant with this number already exists.")

@app.put("/api/grants/{grant_id}", response_model=dict)
def update_grant(grant_id: int, grant: GrantBase, conn: sqlite3.Connection = Depends(get_db_connection)):
    """Update an existing grant's details."""
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE grants 
        SET grant_number = ?, title = ?, agency = ?, deadline = ?, amount = ?, status = ?, 
            renewals_needed = ?, submission_date = ?, expected_notification_date = ?, 
            internal_lead = ?, application_status = ?, rejection_reason = ?, 
            feedback_summary = ?, denial_date = ?
        WHERE id = ?
    ''', (grant.grant_number, grant.title, grant.agency, grant.deadline, grant.amount, grant.status, 
          grant.renewals_needed, grant.submission_date, grant.expected_notification_date, 
          grant.internal_lead, grant.application_status, grant.rejection_reason, 
          grant.feedback_summary, grant.denial_date, grant_id))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Grant not found.")
    return {"message": "Grant updated successfully"}

@app.get("/api/grantsgov/search/{opportunity_number}")
def fetch_from_grants_gov(opportunity_number: str):
    """Fetch grant details from Grants.gov to auto-fill the frontend form."""
    url = "https://api.grants.gov/v1/api/search2"
    payload = {"oppNum": opportunity_number} 
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if not response.ok:
            raise HTTPException(status_code=500, detail="Grants.gov rejected request.")
            
        json_response = response.json()
        
        if json_response.get("errorcode") == 0 and "oppHits" in json_response.get("data", {}):
            hits = json_response["data"]["oppHits"]
            if hits:
                hit = hits[0]
                
                raw_date = str(hit.get("closeDate") or "").strip()
                formatted_date = ""
                
                if raw_date and raw_date != "None":
                    # Strip timestamps and clean the string
                    clean_date = raw_date.split("T")[0].split(" ")[0]
                    
                    # Test all known government date formats
                    formats_to_try = [
                        "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", 
                        "%b %d %Y", "%m-%d-%Y", "%m%d%Y", "%Y%m%d", "%m/%d/%y"
                    ]
                    
                    for fmt in formats_to_try:
                        try:
                            dt = datetime.strptime(clean_date, fmt)
                            formatted_date = dt.strftime("%Y-%m-%d") # The format React needs
                            break
                        except ValueError:
                            continue
                            
                return {
                    "grant_number": hit.get("oppNum") or opportunity_number,
                    "title": hit.get("title") or hit.get("opportunityTitle") or "Title not found",
                    "agency": hit.get("agencyName") or hit.get("agency") or "Agency not found",
                    "deadline": formatted_date 
                }
                
        raise HTTPException(status_code=404, detail="Grant not found on Grants.gov")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

#SEARCH FUNCTION

@app.get("/api/grantsgov/keyword/{keyword}")
def search_grants_gov_keyword(keyword: str):
    """Search Grants.gov by keyword and return a list of OPEN grants, sorted by soonest deadline."""
    url = "https://api.grants.gov/v1/api/search2"
    
    # Using 'keyword' instead of 'oppNum' to get multiple results
    payload = {"keyword": keyword} 
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if not response.ok:
            raise HTTPException(status_code=500, detail="Grants.gov rejected request.")
            
        json_response = response.json()
        results = []
        
        if json_response.get("errorcode") == 0 and "oppHits" in json_response.get("data", {}):
            for hit in json_response["data"]["oppHits"]:
                
                # FILTER: We only want to see active, open grants we can apply for
                if hit.get("oppStatus") != "posted":
                    continue
                    
                raw_date = str(hit.get("closeDate") or "").strip()
                formatted_date = ""
                sort_date = "9999-12-31" # Default to far future so blank deadlines drop to the bottom 
                
                if raw_date and raw_date != "None":
                    clean_date = raw_date.split("T")[0].split(" ")[0]
                    formats_to_try = [
                        "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", 
                        "%b %d %Y", "%m-%d-%Y", "%m%d%Y", "%Y%m%d", "%m/%d/%y"
                    ]
                    for fmt in formats_to_try:
                        try:
                            dt = datetime.strptime(clean_date, fmt)
                            formatted_date = dt.strftime("%Y-%m-%d")
                            sort_date = formatted_date # Use the clean YYYY-MM-DD for sorting
                            break
                        except ValueError:
                            continue
                
                results.append({
                    "grant_number": hit.get("oppNum") or "Unknown",
                    "title": hit.get("title") or hit.get("opportunityTitle") or "Title not found",
                    "agency": hit.get("agencyName") or hit.get("agency") or "Agency not found",
                    "deadline": formatted_date,
                    "sort_date": sort_date 
                })
        
        # THE SORTING ENGINE: Sort the array by the closest deadline ascending
        results.sort(key=lambda x: x["sort_date"])
        
        # Clean up our temporary sorting key before sending to React
        for r in results:
            del r["sort_date"]
            
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")



# ==========================================
# 5. SERVER EXECUTION
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # Runs the server on http://localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)