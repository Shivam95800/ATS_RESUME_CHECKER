"""
Verification script for Step 2 Auth & RLS end-to-end testing with Supabase.
Run with: python scripts/verify_supabase_auth.py
"""

import os
import sys
import uuid
import httpx
from dotenv import load_dotenv

# Load root .env
load_dotenv(".env")
load_dotenv("web/.env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BACKEND_URL = os.getenv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")

def log(msg: str):
    print(f"[AUTH VERIFY] {msg}")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    log("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env or web/.env.local.")
    sys.exit(1)

def run_verification():
    log(f"Connecting to Supabase at: {SUPABASE_URL}")
    log(f"Backend API at: {BACKEND_URL}")

    # Generate test credentials for two separate users
    test_id = uuid.uuid4().hex[:6]
    user_a_email = f"test_user_a_{test_id}@example.com"
    user_b_email = f"test_user_b_{test_id}@example.com"
    password = f"P@ssword123!_{test_id}"

    with httpx.Client(timeout=30.0) as client:
        # 1. Sign up User A
        log(f"1. Signing up User A ({user_a_email})...")
        signup_a = client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": user_a_email, "password": password}
        )
        if signup_a.status_code not in (200, 201):
            log(f"User A signup failed: {signup_a.status_code} {signup_a.text}")
            return False

        data_a = signup_a.json()
        token_a = data_a.get("access_token")
        user_a_id = data_a.get("user", {}).get("id")

        if not token_a:
            # If auto-confirm is off, attempt sign in
            log("User A signed up. Signing in...")
            login_a = client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                json={"email": user_a_email, "password": password}
            )
            if login_a.status_code != 200:
                log(f"Sign in failed (email confirmation may be enabled): {login_a.text}")
                return False
            data_a = login_a.json()
            token_a = data_a.get("access_token")
            user_a_id = data_a.get("user", {}).get("id")

        log(f"User A authenticated successfully. user_id: {user_a_id}")

        # 2. Call GET /api/v1/history with User A's token
        log("2. Calling GET /api/v1/history with User A access token...")
        hist_a = client.get(
            f"{BACKEND_URL}/api/v1/history",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        log(f"GET /api/v1/history status: {hist_a.status_code}")
        if hist_a.status_code != 200:
            log(f"Failed to fetch history: {hist_a.text}")
            return False
        history_list = hist_a.json()
        log(f"User A history count: {len(history_list)} (Expected: 0)")
        assert len(history_list) == 0, "Expected empty history for new user"

        # 3. Run a real resume analysis for User A
        log("3. Running real resume analysis for User A...")
        resume_content = b"Jane Doe\njane@example.com\nPython, FastAPI, and Docker Developer.\nEXPERIENCE\nSoftware Engineer"
        analyze_res = client.post(
            f"{BACKEND_URL}/api/v1/analyze-resume",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"resume": ("resume.pdf", resume_content, "application/pdf")},
            data={"job_description": "Looking for a Python Developer with Docker."}
        )
        log(f"POST /api/v1/analyze-resume status: {analyze_res.status_code}")
        if analyze_res.status_code != 200:
            log(f"Analysis failed: {analyze_res.text}")
            return False
        analysis_data = analyze_res.json()
        log(f"Analysis complete. ATS score: {analysis_data.get('ats_score')}")

        # 4. Verify history has 1 entry for User A
        log("4. Verifying history row was written under User A...")
        hist_a_after = client.get(
            f"{BACKEND_URL}/api/v1/history",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        user_a_records = hist_a_after.json()
        log(f"User A updated history count: {len(user_a_records)}")
        assert len(user_a_records) == 1, "Expected exactly 1 history record"
        analysis_id = user_a_records[0]["id"]
        log(f"Recorded analysis_id: {analysis_id}")

        # 5. Sign up User B
        log(f"5. Signing up User B ({user_b_email})...")
        signup_b = client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": user_b_email, "password": password}
        )
        data_b = signup_b.json()
        token_b = data_b.get("access_token")
        if not token_b:
            login_b = client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                json={"email": user_b_email, "password": password}
            )
            data_b = login_b.json()
            token_b = data_b.get("access_token")
        user_b_id = data_b.get("user", {}).get("id")
        log(f"User B authenticated. user_id: {user_b_id}")

        # 6. Verify User B CANNOT see User A's analysis (RLS check)
        log("6. Verifying User B cannot see User A's analysis (RLS isolation)...")
        hist_b = client.get(
            f"{BACKEND_URL}/api/v1/history",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        user_b_records = hist_b.json()
        log(f"User B history count: {len(user_b_records)} (Should be 0)")
        assert len(user_b_records) == 0, "Security violation: User B saw User A's history!"

        # 7. Verify User B CANNOT delete User A's analysis (RLS + ownership check)
        log("7. Verifying User B cannot delete User A's analysis...")
        del_attempt = client.delete(
            f"{BACKEND_URL}/api/v1/history/{analysis_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        log(f"User B delete status: {del_attempt.status_code}")
        assert del_attempt.status_code in (404, 403), f"Security violation: User B was able to delete User A's record! ({del_attempt.status_code})"

        log("ALL AUTH & RLS VERIFICATION CHECKS PASSED SUCCESSFULLY!")
        return True

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
