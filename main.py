import sqlite3
import requests
import time
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# 1. APP INITIALIZATION & MIDDLEWARE
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

# 2. DATABASE SETUP
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
                award_floor INTEGER,
                award_ceiling INTEGER,
                status TEXT DEFAULT 'available',
                submission_date DATE,
                expected_notification_date DATE,
                poc_name TEXT,
                poc_email TEXT,
                internal_lead TEXT,
                application_status TEXT,
                rejection_reason TEXT,
                feedback_summary TEXT,
                denial_date DATE,
                expiration_date DATE,
                spent_amount INTEGER DEFAULT 0,
                compliance_category TEXT,
                program_manager TEXT,
                next_report_due DATE,
                onboarding_date DATE,
                is_extended BOOLEAN DEFAULT 0,
                renewal_status TEXT DEFAULT 'None',
                funder_portal_url TEXT,
                grants_gov_id TEXT
            )
        ''')
        existing_columns = {row[1] for row in cursor.execute("PRAGMA table_info(grants)").fetchall()}
        if "poc_name" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN poc_name TEXT")
        if "poc_email" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN poc_email TEXT")
        if "award_floor" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN award_floor INTEGER")
        if "award_ceiling" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN award_ceiling INTEGER")
        if "funder_portal_url" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN funder_portal_url TEXT")
        if "grants_gov_id" not in existing_columns:
            cursor.execute("ALTER TABLE grants ADD COLUMN grants_gov_id TEXT")
        conn.commit()

# Run database initialization on startup when I get it working
init_db()

# Dependency to get a database connection per request
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row # Returns rows as dictionaries instead of tuples
    try:
        yield conn
    finally:
        conn.close()


# 3. PYDANTIC MODELS (DATA VALIDATION)

class GrantBase(BaseModel):
    grant_number: str
    title: str
    agency: str
    deadline: str
    amount: int = 0
    award_floor: Optional[int] = None
    award_ceiling: Optional[int] = None
    status: str = "available"
    submission_date: Optional[str] = None
    expected_notification_date: Optional[str] = None
    poc_name: Optional[str] = None
    poc_email: Optional[str] = None
    internal_lead: Optional[str] = None
    application_status: Optional[str] = None
    rejection_reason: Optional[str] = None
    feedback_summary: Optional[str] = None
    denial_date: Optional[str] = None
    expiration_date: Optional[str] = None
    spent_amount: int = 0
    compliance_category: Optional[str] = None
    program_manager: Optional[str] = None
    next_report_due: Optional[str] = None
    onboarding_date: Optional[str] = None
    is_extended: bool = False
    renewal_status: str = "None"
    funder_portal_url: Optional[str] = None
    grants_gov_id: Optional[str] = None

class GrantResponse(GrantBase):
    id: int

# 4. API ENDPOINTS (ROUTES)

@app.get("/api/grants", response_model=List[GrantResponse])
def get_all_grants(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Fetch all tracked grants, ordered by the soonest deadline."""
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM grants ORDER BY deadline ASC')
    grants = cursor.fetchall()
    return [dict(grant) for grant in grants]


@app.delete("/api/grants", response_model=dict)
def delete_all_grants(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Delete all tracked grants from the database."""
    cursor = conn.cursor()
    cursor.execute('DELETE FROM grants')
    conn.commit()
    return {"message": "All grant data cleared successfully"}

@app.post("/api/grants", response_model=dict)
def create_grant(grant: GrantBase, conn: sqlite3.Connection = Depends(get_db_connection)):
    """Save a new grant to the database."""
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO grants (
                grant_number, title, agency, deadline, amount, award_floor, award_ceiling, status, submission_date, expected_notification_date,
                poc_name, poc_email, internal_lead, application_status, rejection_reason, feedback_summary,
                denial_date, expiration_date, spent_amount, compliance_category, program_manager,
                next_report_due, onboarding_date, is_extended, renewal_status, funder_portal_url, grants_gov_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            grant.grant_number, grant.title, grant.agency, grant.deadline, grant.amount, grant.award_floor, grant.award_ceiling, grant.status,
            grant.submission_date, grant.expected_notification_date, grant.poc_name, grant.poc_email,
            grant.internal_lead, grant.application_status, grant.rejection_reason, grant.feedback_summary,
            grant.denial_date, grant.expiration_date, grant.spent_amount, grant.compliance_category,
            grant.program_manager, grant.next_report_due, grant.onboarding_date, grant.is_extended,
            grant.renewal_status, grant.funder_portal_url, grant.grants_gov_id
        ))
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
        SET grant_number = ?, title = ?, agency = ?, deadline = ?, amount = ?, award_floor = ?, award_ceiling = ?, status = ?, 
            submission_date = ?, expected_notification_date = ?, 
            poc_name = ?, poc_email = ?, internal_lead = ?, application_status = ?, rejection_reason = ?, 
            feedback_summary = ?, denial_date = ?, expiration_date = ?, 
            spent_amount = ?, compliance_category = ?, program_manager = ?, 
            next_report_due = ?, onboarding_date = ?, is_extended = ?, 
            renewal_status = ?, funder_portal_url = ?, grants_gov_id = ?
        WHERE id = ?
    ''', (grant.grant_number, grant.title, grant.agency, grant.deadline, grant.amount, grant.award_floor, grant.award_ceiling, grant.status, 
          grant.submission_date, grant.expected_notification_date, 
          grant.poc_name, grant.poc_email, grant.internal_lead, grant.application_status, grant.rejection_reason, 
          grant.feedback_summary, grant.denial_date, grant.expiration_date, 
          grant.spent_amount, grant.compliance_category, grant.program_manager, 
          grant.next_report_due, grant.onboarding_date, grant.is_extended, 
          grant.renewal_status, grant.funder_portal_url, grant.grants_gov_id, grant_id))
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
                   
                    clean_date = raw_date.split("T")[0].split(" ")[0]
                    
                    # Test all known government date formats
                    formats_to_try = [
                        "%m/%d/%Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", 
                        "%b %d %Y", "%m-%d-%Y", "%m%d%Y", "%Y%m%d", "%m/%d/%y"
                    ]
                    
                    for fmt in formats_to_try:
                        try:
                            dt = datetime.strptime(clean_date, fmt)
                            formatted_date = dt.strftime("%Y-%m-%d")
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


def _parse_grants_gov_currency(raw_value) -> Optional[int]:
    if raw_value is None:
        return None

    cleaned_value = str(raw_value).strip().replace(",", "").replace("$", "")
    if not cleaned_value:
        return None

    try:
        return int(float(cleaned_value))
    except ValueError:
        return None


@app.get("/api/grantsgov/opportunity/{opportunity_id}")
def fetch_grants_gov_opportunity(opportunity_id: str):
    """Fetch detailed opportunity data, including award ceiling/floor, from Grants.gov."""
    url = "https://api.grants.gov/v1/api/fetchOpportunity"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
    payload = {"opportunityId": opportunity_id}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if not response.ok:
            raise HTTPException(status_code=500, detail="Grants.gov rejected detail request.")

        json_response = response.json()
        if json_response.get("errorcode") != 0:
            raise HTTPException(status_code=500, detail="Grants.gov opportunity detail returned an error.")

        data = json_response.get("data") or {}
        synopsis = data.get("synopsis") or {}

        award_ceiling = _parse_grants_gov_currency(synopsis.get("awardCeiling"))
        award_floor = _parse_grants_gov_currency(synopsis.get("awardFloor"))

        return {
            "opportunity_id": data.get("id") or opportunity_id,
            "grant_number": data.get("opportunityNumber"),
            "title": data.get("opportunityTitle"),
            "agency": synopsis.get("agencyName"),
            "award_floor": award_floor,
            "award_ceiling": award_ceiling,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

#SEARCH FUNCTION

def _normalize_grants_gov_date(raw_date_value) -> tuple[str, str]:
    raw_date = str(raw_date_value or "").strip()
    formatted_date = ""
    sort_date = "9999-12-31"

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
                sort_date = formatted_date
                break
            except ValueError:
                continue

    return formatted_date, sort_date


DISCOVERY_OPEN_STATUSES = {"posted"}
DISCOVERY_UPCOMING_STATUSES = {"forecasted", "forecast"}
DISCOVERY_ALLOWED_STATUSES = DISCOVERY_OPEN_STATUSES | DISCOVERY_UPCOMING_STATUSES
GRANTS_GOV_MAX_ROWS_PER_REQUEST = 100
DISCOVERY_CACHE_TTL_SECONDS = 120

_discovery_search_cache = {}


def _normalize_grants_gov_status(raw_status_value) -> str:
    return str(raw_status_value or "").strip().lower()


def _get_discovery_status_label(raw_status_value) -> str:
    status = _normalize_grants_gov_status(raw_status_value)
    if status in DISCOVERY_OPEN_STATUSES:
        return "open"
    if status in DISCOVERY_UPCOMING_STATUSES:
        return "upcoming"
    return "other"


def _build_grants_gov_search_payload(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    start_record_num: int = 0,
    rows: int = GRANTS_GOV_MAX_ROWS_PER_REQUEST,
):
    payload = {
        "oppStatuses": "|".join(sorted(DISCOVERY_ALLOWED_STATUSES)),
        "rows": rows,
        "startRecordNum": max(start_record_num, 0),
    }
    if keyword:
        payload["keyword"] = keyword
    if category and category != "All":
        payload["fundingCategories"] = category
    return payload


def _fetch_grants_gov_search_page(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    start_record_num: int = 0,
    rows: int = GRANTS_GOV_MAX_ROWS_PER_REQUEST,
):
    url = "https://api.grants.gov/v1/api/search2"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
    payload = _build_grants_gov_search_payload(
        keyword=keyword,
        category=category,
        start_record_num=start_record_num,
        rows=rows,
    )

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if not response.ok:
        raise HTTPException(status_code=500, detail="Grants.gov rejected request.")

    json_response = response.json()
    if json_response.get("errorcode") != 0:
        raise HTTPException(status_code=500, detail="Grants.gov search returned an error.")

    return json_response.get("data", {})


def _get_discovery_cache_key(keyword: Optional[str], category: Optional[str]):
    normalized_keyword = (keyword or "").strip().lower()
    normalized_category = (category or "All").strip()
    return (normalized_keyword, normalized_category)


def _get_cached_discovery_dataset(keyword: Optional[str], category: Optional[str]):
    cache_key = _get_discovery_cache_key(keyword, category)
    cached_entry = _discovery_search_cache.get(cache_key)
    if not cached_entry:
        return None

    if time.monotonic() - cached_entry["created_at"] > DISCOVERY_CACHE_TTL_SECONDS:
        _discovery_search_cache.pop(cache_key, None)
        return None

    return cached_entry


def _cache_discovery_dataset(keyword: Optional[str], category: Optional[str], results, categories):
    cache_key = _get_discovery_cache_key(keyword, category)
    _discovery_search_cache[cache_key] = {
        "created_at": time.monotonic(),
        "results": results,
        "categories": categories,
    }


def _search_grants_gov(keyword: Optional[str] = None, category: Optional[str] = None, page: int = 1, page_size: int = 25):
    """Search Grants.gov, sort the full result set by Close Date, then paginate."""
    try:
        cached_dataset = _get_cached_discovery_dataset(keyword, category)
        if cached_dataset:
            results = cached_dataset["results"]
            categories = cached_dataset["categories"]
        else:
            results = []
            categories = []
            data = _fetch_grants_gov_search_page(
                keyword=keyword,
                category=category,
                start_record_num=0,
                rows=GRANTS_GOV_MAX_ROWS_PER_REQUEST,
            )
            total_hits = int(data.get("hitCount") or 0)

            for category_option in data.get("fundingCategories", []):
                label = category_option.get("label")
                value = category_option.get("value")
                if label and value:
                    categories.append({
                        "label": label,
                        "value": value,
                        "count": category_option.get("count", 0),
                    })

            all_hits = list(data.get("oppHits", []))
            next_start_record_num = len(all_hits)
            while next_start_record_num < total_hits:
                paged_data = _fetch_grants_gov_search_page(
                    keyword=keyword,
                    category=category,
                    start_record_num=next_start_record_num,
                    rows=GRANTS_GOV_MAX_ROWS_PER_REQUEST,
                )
                page_hits = paged_data.get("oppHits", [])
                if not page_hits:
                    break
                all_hits.extend(page_hits)
                next_start_record_num += len(page_hits)

            for hit in all_hits:
                opp_status = _normalize_grants_gov_status(hit.get("oppStatus"))

                # Discovery should show both currently open and not-yet-open grants.
                if opp_status not in DISCOVERY_ALLOWED_STATUSES:
                    continue

                formatted_date, sort_date = _normalize_grants_gov_date(hit.get("closeDate"))
                discovery_status = _get_discovery_status_label(opp_status)

                results.append({
                    "grant_number": hit.get("number") or hit.get("oppNum") or "Unknown",
                    "title": hit.get("title") or hit.get("opportunityTitle") or "Title not found",
                    "agency": hit.get("agencyName") or hit.get("agency") or "Agency not found",
                    "deadline": formatted_date,
                    "discovery_status": discovery_status,
                    "sort_date": sort_date,
                    "grants_gov_id": hit.get("id"),
                    "funder_portal_url": (
                        f"https://www.grants.gov/search-results-detail/{hit.get('id')}"
                        if hit.get("id")
                        else None
                    ),
                })

            # Sort strictly by the same Close Date value shown in Discovery.
            # Opportunities without a usable close date fall to the end.
            results.sort(key=lambda x: x["sort_date"])
            categories.sort(key=lambda option: option["label"])
            _cache_discovery_dataset(keyword, category, results, categories)

        total_results = len(results)
        start_index = max(page - 1, 0) * page_size
        end_index = start_index + page_size
        paginated_results = [dict(result) for result in results[start_index:end_index]]

        # Clean up our temporary sorting key before sending to React
        for r in paginated_results:
            del r["sort_date"]

        total_pages = max((total_results + page_size - 1) // page_size, 1)

        return {
            "results": paginated_results,
            "categories": categories,
            "total_results": total_results,
            "current_page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/api/grantsgov/opportunities")
def search_grants_gov_opportunities(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
):
    """Search Grants.gov with optional keyword/category filters and paginated results."""
    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 100)
    return _search_grants_gov(keyword=keyword, category=category, page=safe_page, page_size=safe_page_size)


@app.get("/api/grantsgov/keyword/{keyword}")
def search_grants_gov_keyword(keyword: str, category: Optional[str] = None, page: int = 1, page_size: int = 25):
    """Backward-compatible keyword search route."""
    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 100)
    return _search_grants_gov(keyword=keyword, category=category, page=safe_page, page_size=safe_page_size)



# ==========================================
# 5. SERVER EXECUTION
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # Runs the server on http://localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
