import os
import sqlite3
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from apscheduler.schedulers.background import BackgroundScheduler


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
DB_FILE = Path(__file__).resolve().with_name("grants.db")
DEPARTMENT_HEAD_EMAIL = os.getenv("LHGP_DEPARTMENT_HEAD_EMAIL", "department.head@laredo.gov")
NOTIFICATION_SCHEDULE_MODE = os.getenv("LHGP_NOTIFICATION_SCHEDULE_MODE", "daily").strip().lower()
NOTIFICATION_DAILY_HOUR = int(os.getenv("LHGP_NOTIFICATION_DAILY_HOUR", "9"))
NOTIFICATION_DAILY_MINUTE = int(os.getenv("LHGP_NOTIFICATION_DAILY_MINUTE", "0"))
NOTIFICATION_TEST_INTERVAL_MINUTES = max(int(os.getenv("LHGP_NOTIFICATION_TEST_INTERVAL_MINUTES", "1")), 1)
NOTIFICATION_INACTIVE_STATUSES = ("archived", "closed", "denied", "withdrawn")

GRANT_TABLE_COLUMNS_SQL = '''
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
'''

GRANT_MUTABLE_COLUMNS = (
    "grant_number", "title", "agency", "deadline", "amount", "award_floor", "award_ceiling",
    "status", "submission_date", "expected_notification_date", "poc_name", "poc_email",
    "internal_lead", "application_status", "rejection_reason", "feedback_summary",
    "denial_date", "expiration_date", "spent_amount", "compliance_category",
    "program_manager", "next_report_due", "onboarding_date", "is_extended",
    "renewal_status", "funder_portal_url", "grants_gov_id"
)

NOTIFICATION_LOG_TABLE_COLUMNS_SQL = '''
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER NOT NULL,
    grant_number TEXT NOT NULL,
    title TEXT NOT NULL,
    notice_type TEXT NOT NULL,
    recipients TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    expiration_date DATE,
    days_until_expiration INTEGER NOT NULL,
    archived INTEGER DEFAULT 0,
    sent_on DATE NOT NULL,
    sent_at TEXT NOT NULL,
    UNIQUE(grant_id, notice_type, sent_on)
'''

DISCOVERY_AWARD_CACHE_TABLE_COLUMNS_SQL = '''
    opportunity_id TEXT PRIMARY KEY,
    grant_number TEXT,
    title TEXT,
    agency TEXT,
    award_floor INTEGER,
    award_ceiling INTEGER,
    fetched_at TEXT NOT NULL
'''


def _ensure_grant_table_columns(cursor: sqlite3.Cursor, table_name: str):
    existing_columns = {row[1] for row in cursor.execute(f"PRAGMA table_info({table_name})").fetchall()}
    if "poc_name" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN poc_name TEXT")
    if "poc_email" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN poc_email TEXT")
    if "award_floor" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN award_floor INTEGER")
    if "award_ceiling" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN award_ceiling INTEGER")
    if "funder_portal_url" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN funder_portal_url TEXT")
    if "grants_gov_id" not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN grants_gov_id TEXT")


def _insert_grant_record(cursor: sqlite3.Cursor, table_name: str, grant):
    placeholders = ", ".join(["?"] * len(GRANT_MUTABLE_COLUMNS))
    cursor.execute(f'''
        INSERT INTO {table_name} ({", ".join(GRANT_MUTABLE_COLUMNS)})
        VALUES ({placeholders})
    ''', tuple(getattr(grant, column) for column in GRANT_MUTABLE_COLUMNS))


def init_db():
    """Initializes the SQLite database and creates the grants table if it doesn't exist."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(f'CREATE TABLE IF NOT EXISTS grants ({GRANT_TABLE_COLUMNS_SQL})')
        cursor.execute(f'CREATE TABLE IF NOT EXISTS favorites ({GRANT_TABLE_COLUMNS_SQL})')
        cursor.execute(f'CREATE TABLE IF NOT EXISTS notification_log ({NOTIFICATION_LOG_TABLE_COLUMNS_SQL})')
        cursor.execute(f'CREATE TABLE IF NOT EXISTS discovery_award_cache ({DISCOVERY_AWARD_CACHE_TABLE_COLUMNS_SQL})')
        _ensure_grant_table_columns(cursor, "grants")
        _ensure_grant_table_columns(cursor, "favorites")
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


class NotificationLogResponse(BaseModel):
    id: int
    grant_id: int
    grant_number: str
    title: str
    notice_type: str
    recipients: List[str]
    subject: str
    body: str
    expiration_date: Optional[str] = None
    days_until_expiration: int
    archived: bool
    sent_on: str
    sent_at: str


class MockEmailService:
    """Console-only email transport for safely validating notification behavior."""

    def send_email(self, to: List[str], subject: str, body: str):
        recipients = ", ".join(to)
        print("\n" + "=" * 72)
        print("MOCK EMAIL")
        print(f"To: {recipients}")
        print(f"Subject: {subject}")
        print("Body:")
        print(body)
        print("=" * 72 + "\n")


mock_email_service = MockEmailService()


def _parse_iso_date(raw_value: Optional[str]) -> Optional[date]:
    if not raw_value:
        return None

    try:
        return date.fromisoformat(raw_value)
    except ValueError:
        return None


def _build_notification_recipients(grant_row: sqlite3.Row) -> List[str]:
    recipients = [f"Department Head <{DEPARTMENT_HEAD_EMAIL}>"]
    program_manager = (grant_row["program_manager"] or "").strip()
    if program_manager:
        recipients.append(f"{program_manager} <program.manager@laredo.gov>")
    return recipients


def _build_notification_email(grant_row: sqlite3.Row, days_until_expiration: int) -> tuple[str, str]:
    if days_until_expiration == 7:
        notice_label = "Reminder"
        action_message = "This grant expires in 7 days. Review outstanding compliance items and prepare for closeout."
    elif days_until_expiration == 1:
        notice_label = "Final Notice"
        action_message = "This grant expires tomorrow. Complete final reporting and budget draw-downs immediately."
    else:
        notice_label = "Termination Notice"
        action_message = "This grant is due today or past due and will be archived now."

    subject = f"{notice_label}: {grant_row['title']} expires on {grant_row['expiration_date']}"
    body = (
        f"Grant Title: {grant_row['title']}\n"
        f"Grant Number: {grant_row['grant_number']}\n"
        f"Current Status: {grant_row['status']}\n"
        f"Expiration Date: {grant_row['expiration_date']}\n"
        f"Program Manager: {grant_row['program_manager'] or 'Unassigned'}\n\n"
        f"{action_message}"
    )
    return subject, body


def run_expiration_notification_check(today: Optional[date] = None):
    """Evaluate expiring grants, emit mock notifications, and archive expired grants."""
    evaluation_date = today or date.today()
    notifications = []
    skipped_duplicates = 0
    timestamp = datetime.now().isoformat(timespec="seconds")

    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        grants = cursor.execute(
            """
            SELECT *
            FROM grants
            WHERE status NOT IN (?, ?, ?, ?)
              AND expiration_date IS NOT NULL
              AND TRIM(expiration_date) != ''
            """
        , NOTIFICATION_INACTIVE_STATUSES).fetchall()

        archived_ids = []
        for grant in grants:
            expiration_date = _parse_iso_date(grant["expiration_date"])
            if expiration_date is None:
                print(
                    f"Skipping grant {grant['grant_number']} due to invalid expiration_date: "
                    f"{grant['expiration_date']}"
                )
                continue

            days_until_expiration = (expiration_date - evaluation_date).days
            if days_until_expiration not in {7, 1} and days_until_expiration > 0:
                continue

            notice_type = (
                "Reminder"
                if days_until_expiration == 7
                else "Final Notice"
                if days_until_expiration == 1
                else "Termination Notice"
            )
            existing_log = cursor.execute(
                """
                SELECT id
                FROM notification_log
                WHERE grant_id = ?
                  AND notice_type = ?
                  AND sent_on = ?
                """,
                (grant["id"], notice_type, evaluation_date.isoformat())
            ).fetchone()
            if existing_log:
                skipped_duplicates += 1
                continue

            recipients = _build_notification_recipients(grant)
            subject, body = _build_notification_email(grant, days_until_expiration)
            mock_email_service.send_email(recipients, subject, body)

            notifications.append({
                "grant_id": grant["id"],
                "grant_number": grant["grant_number"],
                "title": grant["title"],
                "status_before_update": grant["status"],
                "expiration_date": grant["expiration_date"],
                "days_until_expiration": days_until_expiration,
                "notice_type": notice_type,
                "recipients": recipients,
                "subject": subject,
                "body": body,
                "archived": days_until_expiration <= 0,
            })
            cursor.execute(
                """
                INSERT INTO notification_log (
                    grant_id, grant_number, title, notice_type, recipients, subject, body,
                    expiration_date, days_until_expiration, archived, sent_on, sent_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    grant["id"],
                    grant["grant_number"],
                    grant["title"],
                    notice_type,
                    " | ".join(recipients),
                    subject,
                    body,
                    grant["expiration_date"],
                    days_until_expiration,
                    1 if days_until_expiration <= 0 else 0,
                    evaluation_date.isoformat(),
                    timestamp,
                )
            )

            if days_until_expiration <= 0:
                cursor.execute(
                    "UPDATE grants SET status = 'archived' WHERE id = ?",
                    (grant["id"],)
                )
                archived_ids.append(grant["id"])

        conn.commit()

    print(
        f"Expiration notification check completed for {evaluation_date.isoformat()}. "
        f"Archived {len(archived_ids)} grant(s). Skipped {skipped_duplicates} duplicate notification(s)."
    )
    return {
        "checked_on": evaluation_date.isoformat(),
        "notifications_sent": len(notifications),
        "archived_count": len(archived_ids),
        "duplicates_skipped": skipped_duplicates,
        "notifications": notifications,
    }


def _configure_notification_scheduler():
    scheduler = BackgroundScheduler(timezone="America/Chicago")

    if NOTIFICATION_SCHEDULE_MODE == "test":
        scheduler.add_job(
            run_expiration_notification_check,
            trigger="interval",
            minutes=NOTIFICATION_TEST_INTERVAL_MINUTES,
            id="grant-expiration-notifications",
            replace_existing=True,
        )
    else:
        scheduler.add_job(
            run_expiration_notification_check,
            trigger="cron",
            hour=NOTIFICATION_DAILY_HOUR,
            minute=NOTIFICATION_DAILY_MINUTE,
            id="grant-expiration-notifications",
            replace_existing=True,
        )

    return scheduler


notification_scheduler = _configure_notification_scheduler()

# 4. API ENDPOINTS (ROUTES)

@app.on_event("startup")
def start_notification_scheduler():
    if not notification_scheduler.running:
        notification_scheduler.start()


@app.on_event("shutdown")
def shutdown_notification_scheduler():
    if notification_scheduler.running:
        notification_scheduler.shutdown(wait=False)

@app.get("/api/grants", response_model=List[GrantResponse])
def get_all_grants(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Fetch all tracked grants, ordered by the soonest deadline."""
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM grants ORDER BY deadline ASC')
    grants = cursor.fetchall()
    return [dict(grant) for grant in grants]


@app.get("/api/notifications/history", response_model=List[NotificationLogResponse])
def get_notification_history(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Fetch persisted notification history ordered from newest to oldest."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT *
        FROM notification_log
        ORDER BY sent_at DESC, id DESC
        """
    )
    logs = cursor.fetchall()
    return [
        {
            **dict(log),
            "recipients": [recipient for recipient in (log["recipients"] or "").split(" | ") if recipient],
            "archived": bool(log["archived"]),
        }
        for log in logs
    ]


@app.get("/api/favorites", response_model=List[GrantResponse])
def get_all_favorites(conn: sqlite3.Connection = Depends(get_db_connection)):
    """Fetch all favorite grants, ordered by the soonest deadline."""
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM favorites ORDER BY deadline ASC')
    favorites = cursor.fetchall()
    return [dict(grant) for grant in favorites]


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
        _insert_grant_record(cursor, "grants", grant)
        cursor.execute('DELETE FROM favorites WHERE grant_number = ?', (grant.grant_number,))
        conn.commit()
        return {"message": "Grant added successfully", "grant_number": grant.grant_number}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="A grant with this number already exists.")


@app.post("/api/favorites", response_model=dict)
def create_favorite(grant: GrantBase, conn: sqlite3.Connection = Depends(get_db_connection)):
    """Save a new grant lead to the favorites table."""
    try:
        cursor = conn.cursor()
        tracked_grant = cursor.execute(
            'SELECT 1 FROM grants WHERE grant_number = ?',
            (grant.grant_number,)
        ).fetchone()
        if tracked_grant:
            raise HTTPException(status_code=400, detail="Tracked grants cannot also be favorited.")

        _insert_grant_record(cursor, "favorites", grant)
        conn.commit()
        return {"message": "Favorite added successfully", "grant_number": grant.grant_number}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="A favorite with this number already exists.")


@app.delete("/api/favorites/{grant_number}", response_model=dict)
def delete_favorite(grant_number: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    """Remove a grant from the favorites list."""
    cursor = conn.cursor()
    cursor.execute('DELETE FROM favorites WHERE grant_number = ?', (grant_number,))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Favorite not found.")
    return {"message": "Favorite removed successfully", "grant_number": grant_number}

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


def _fetch_grants_gov_opportunity_details(opportunity_id: str):
    url = "https://api.grants.gov/v1/api/fetchOpportunity"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }
    payload = {"opportunityId": opportunity_id}

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if not response.ok:
        raise HTTPException(status_code=500, detail="Grants.gov rejected detail request.")

    json_response = response.json()
    if json_response.get("errorcode") != 0:
        raise HTTPException(status_code=500, detail="Grants.gov opportunity detail returned an error.")

    data = json_response.get("data") or {}
    synopsis = data.get("synopsis") or {}

    return {
        "opportunity_id": data.get("id") or opportunity_id,
        "grant_number": data.get("opportunityNumber"),
        "title": data.get("opportunityTitle"),
        "agency": synopsis.get("agencyName"),
        "award_floor": _parse_grants_gov_currency(synopsis.get("awardFloor")),
        "award_ceiling": _parse_grants_gov_currency(synopsis.get("awardCeiling")),
    }


@app.get("/api/grantsgov/opportunity/{opportunity_id}")
def fetch_grants_gov_opportunity(opportunity_id: str):
    """Fetch detailed opportunity data, including award ceiling/floor, from Grants.gov."""
    try:
        return _fetch_grants_gov_opportunity_details(opportunity_id)
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
DISCOVERY_AWARD_CACHE_TTL_SECONDS = 21600
DISCOVERY_AWARD_FETCH_MAX_WORKERS = 8

AWARD_CEILING_RANGE_PRESETS = {
    "lt_100k": (None, 100000),
    "100k_500k": (100000, 500000),
    "500k_1m": (500000, 1000000),
    "gt_1m": (1000000, None),
}

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


def _parse_award_ceiling_range(award_ceiling_range: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    normalized_range = (award_ceiling_range or "").strip().lower()
    if not normalized_range or normalized_range == "all":
        return None, None

    if normalized_range in AWARD_CEILING_RANGE_PRESETS:
        return AWARD_CEILING_RANGE_PRESETS[normalized_range]

    cleaned = (
        normalized_range
        .replace("$", "")
        .replace(",", "")
        .replace(" ", "")
        .replace("million", "m")
    )

    def parse_amount(raw_value: str) -> Optional[int]:
        if not raw_value:
            return None
        multiplier = 1
        if raw_value.endswith("k"):
            multiplier = 1000
            raw_value = raw_value[:-1]
        elif raw_value.endswith("m"):
            multiplier = 1000000
            raw_value = raw_value[:-1]

        try:
            return int(float(raw_value) * multiplier)
        except ValueError:
            return None

    if cleaned.startswith("<"):
        upper_bound = parse_amount(cleaned[1:])
        if upper_bound is None:
            raise HTTPException(status_code=400, detail="Invalid award_ceiling_range value.")
        return None, upper_bound

    if cleaned.startswith(">"):
        lower_bound = parse_amount(cleaned[1:])
        if lower_bound is None:
            raise HTTPException(status_code=400, detail="Invalid award_ceiling_range value.")
        return lower_bound, None

    if "-" in cleaned:
        raw_min, raw_max = cleaned.split("-", 1)
        lower_bound = parse_amount(raw_min)
        upper_bound = parse_amount(raw_max)
        if lower_bound is None or upper_bound is None:
            raise HTTPException(status_code=400, detail="Invalid award_ceiling_range value.")
        return lower_bound, upper_bound

    raise HTTPException(status_code=400, detail="Invalid award_ceiling_range value.")


def _get_cached_award_details(opportunity_id: str):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cached_row = conn.execute(
            """
            SELECT *
            FROM discovery_award_cache
            WHERE opportunity_id = ?
            """,
            (opportunity_id,)
        ).fetchone()

        if not cached_row:
            return None

        fetched_at = cached_row["fetched_at"] or ""
        try:
            fetched_at_dt = datetime.fromisoformat(fetched_at)
        except ValueError:
            fetched_at_dt = None

        if fetched_at_dt is None or (datetime.utcnow() - fetched_at_dt).total_seconds() > DISCOVERY_AWARD_CACHE_TTL_SECONDS:
            conn.execute(
                "DELETE FROM discovery_award_cache WHERE opportunity_id = ?",
                (opportunity_id,)
            )
            conn.commit()
            return None

        return dict(cached_row)


def _get_award_details_for_opportunity(opportunity_id: str):
    cached = _get_cached_award_details(opportunity_id)
    if cached:
        return cached

    details = _fetch_grants_gov_opportunity_details(opportunity_id)
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(
            """
            INSERT INTO discovery_award_cache (
                opportunity_id, grant_number, title, agency, award_floor, award_ceiling, fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(opportunity_id) DO UPDATE SET
                grant_number = excluded.grant_number,
                title = excluded.title,
                agency = excluded.agency,
                award_floor = excluded.award_floor,
                award_ceiling = excluded.award_ceiling,
                fetched_at = excluded.fetched_at
            """,
            (
                details["opportunity_id"],
                details["grant_number"],
                details["title"],
                details["agency"],
                details["award_floor"],
                details["award_ceiling"],
                datetime.utcnow().isoformat(timespec="seconds"),
            )
        )
        conn.commit()

    return details


def _load_cached_award_details(opportunity_ids: list[str]):
    if not opportunity_ids:
        return {}, []

    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        placeholders = ", ".join(["?"] * len(opportunity_ids))
        cached_rows = conn.execute(
            f"""
            SELECT *
            FROM discovery_award_cache
            WHERE opportunity_id IN ({placeholders})
            """,
            opportunity_ids
        ).fetchall()

    now = datetime.utcnow()
    valid_details_by_id = {}
    stale_ids = []

    for row in cached_rows:
        fetched_at = row["fetched_at"] or ""
        try:
            fetched_at_dt = datetime.fromisoformat(fetched_at)
        except ValueError:
            fetched_at_dt = None

        opportunity_id = row["opportunity_id"]
        if fetched_at_dt is None or (now - fetched_at_dt).total_seconds() > DISCOVERY_AWARD_CACHE_TTL_SECONDS:
            stale_ids.append(opportunity_id)
            continue

        valid_details_by_id[opportunity_id] = dict(row)

    if stale_ids:
        with sqlite3.connect(DB_FILE) as conn:
            placeholders = ", ".join(["?"] * len(stale_ids))
            conn.execute(
                f"DELETE FROM discovery_award_cache WHERE opportunity_id IN ({placeholders})",
                stale_ids
            )
            conn.commit()

    return valid_details_by_id, stale_ids


def _cache_award_details_batch(details_batch: list[dict]):
    if not details_batch:
        return

    rows = [
        (
            details["opportunity_id"],
            details["grant_number"],
            details["title"],
            details["agency"],
            details["award_floor"],
            details["award_ceiling"],
            datetime.utcnow().isoformat(timespec="seconds"),
        )
        for details in details_batch
    ]

    with sqlite3.connect(DB_FILE) as conn:
        conn.executemany(
            """
            INSERT INTO discovery_award_cache (
                opportunity_id, grant_number, title, agency, award_floor, award_ceiling, fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(opportunity_id) DO UPDATE SET
                grant_number = excluded.grant_number,
                title = excluded.title,
                agency = excluded.agency,
                award_floor = excluded.award_floor,
                award_ceiling = excluded.award_ceiling,
                fetched_at = excluded.fetched_at
            """,
            rows
        )
        conn.commit()


def _hydrate_award_cache(opportunity_ids: list[str]):
    if not opportunity_ids:
        return {}

    cached_details_by_id, _ = _load_cached_award_details(opportunity_ids)
    missing_ids = [opportunity_id for opportunity_id in opportunity_ids if opportunity_id not in cached_details_by_id]
    if not missing_ids:
        return cached_details_by_id

    fetched_details = []
    max_workers = min(DISCOVERY_AWARD_FETCH_MAX_WORKERS, len(missing_ids))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(_fetch_grants_gov_opportunity_details, opportunity_id): opportunity_id
            for opportunity_id in missing_ids
        }
        for future in as_completed(future_map):
            fetched_details.append(future.result())

    _cache_award_details_batch(fetched_details)
    for details in fetched_details:
        cached_details_by_id[details["opportunity_id"]] = details

    return cached_details_by_id


def _filter_results_by_award_ceiling(results, award_ceiling_range: Optional[str]):
    lower_bound, upper_bound = _parse_award_ceiling_range(award_ceiling_range)
    if lower_bound is None and upper_bound is None:
        return results

    opportunity_ids = [result["grants_gov_id"] for result in results if result.get("grants_gov_id")]
    if not opportunity_ids:
        return []

    _hydrate_award_cache(opportunity_ids)

    placeholders = ", ".join(["?"] * len(opportunity_ids))
    where_clauses = [f"opportunity_id IN ({placeholders})", "award_ceiling IS NOT NULL"]
    query_params = list(opportunity_ids)

    if lower_bound is not None and upper_bound is not None:
        where_clauses.append("award_ceiling BETWEEN ? AND ?")
        query_params.extend([lower_bound, upper_bound])
    elif lower_bound is not None:
        where_clauses.append("award_ceiling > ?")
        query_params.append(lower_bound)
    elif upper_bound is not None:
        where_clauses.append("award_ceiling < ?")
        query_params.append(upper_bound)

    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        matching_rows = conn.execute(
            f"""
            SELECT opportunity_id, award_floor, award_ceiling
            FROM discovery_award_cache
            WHERE {" AND ".join(where_clauses)}
            """,
            query_params
        ).fetchall()

    matching_details_by_id = {
        row["opportunity_id"]: {
            "award_floor": row["award_floor"],
            "award_ceiling": row["award_ceiling"],
        }
        for row in matching_rows
    }

    filtered_results = []
    for result in results:
        opportunity_id = result.get("grants_gov_id")
        if opportunity_id not in matching_details_by_id:
            continue

        filtered_results.append({
            **result,
            **matching_details_by_id[opportunity_id],
        })

    return filtered_results


def _search_grants_gov(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    award_ceiling_range: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
):
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

        results = _filter_results_by_award_ceiling(results, award_ceiling_range)

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
    award_ceiling_range: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
):
    """Search Grants.gov with optional keyword/category filters and paginated results."""
    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 100)
    return _search_grants_gov(
        keyword=keyword,
        category=category,
        award_ceiling_range=award_ceiling_range,
        page=safe_page,
        page_size=safe_page_size,
    )


@app.get("/api/grantsgov/keyword/{keyword}")
def search_grants_gov_keyword(
    keyword: str,
    category: Optional[str] = None,
    award_ceiling_range: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
):
    """Backward-compatible keyword search route."""
    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 100)
    return _search_grants_gov(
        keyword=keyword,
        category=category,
        award_ceiling_range=award_ceiling_range,
        page=safe_page,
        page_size=safe_page_size,
    )


@app.post("/api/notifications/expiration-check", response_model=dict)
def trigger_expiration_notification_check():
    """Manual trigger for safely testing the scheduler logic on demand."""
    result = run_expiration_notification_check()
    return {"message": "Expiration notification check completed", **result}



# ==========================================
# 5. SERVER EXECUTION
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # Runs the server on http://localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
