import bcrypt
from datetime import datetime, timezone
from app.db.mongodb import active_db

users_col = active_db["users"]
cases_col = active_db["cases"]
case_access_col = active_db["case_access"]
history_col = active_db["case_assignment_history"]
audit_col = active_db["supervisor_audit_logs"]

def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

default_pw_hash = hash_pw("Police@12345")

officers_data = [
    {
        "username": "Nishant Khatkar",
        "email": "itsnishant444@gmail.com",
        "police_id": "P411",
        "rank": "Assistant Commissioner of Police (ACP)",
        "state": "Delhi",
        "department": "Crime",
        "role": "supervisor",
    },
    {
        "username": "Vikramjit Singh",
        "email": "vikram.singh@police.gov.in",
        "police_id": "SHO-101",
        "rank": "Station House Officer (SHO)",
        "state": "Delhi",
        "department": "Crime",
        "role": "supervisor",
    },
    {
        "username": "Rajesh Sharma",
        "email": "rajesh.sharma@police.gov.in",
        "police_id": "INS-201",
        "rank": "Inspector",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Ananya Roy",
        "email": "ananya.roy@police.gov.in",
        "police_id": "INS-202",
        "rank": "Inspector",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Amit Verma",
        "email": "amit.verma@police.gov.in",
        "police_id": "SI-301",
        "rank": "Sub-Inspector (SI)",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Priya Nair",
        "email": "priya.nair@police.gov.in",
        "police_id": "SI-302",
        "rank": "Sub-Inspector (SI)",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Manoj Kumar",
        "email": "manoj.kumar@police.gov.in",
        "police_id": "ASI-401",
        "rank": "Assistant Sub-Inspector (ASI)",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Suresh Yadav",
        "email": "suresh.yadav@police.gov.in",
        "police_id": "HC-501",
        "rank": "Head Constable",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Kavita Patel",
        "email": "kavita.patel@police.gov.in",
        "police_id": "HC-502",
        "rank": "Head Constable",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
    {
        "username": "Deepak Joshi",
        "email": "deepak.joshi@police.gov.in",
        "police_id": "CON-601",
        "rank": "Constable",
        "state": "Delhi",
        "department": "Crime",
        "role": "investigator",
    },
]

sample_cases = [
    {
        "case_id": "CASE-0001",
        "case_title": "Syndicate Bank Cyber Fraud & Financial Network",
        "fir_number": "FIR-2026/0411",
        "police_station": "Crime Branch PS",
        "crime_type": "Cyber Crime & Financial Fraud",
        "threat_level": "CRITICAL",
        "assigned_officer_police_id": "INS-201",
        "assigned_officer_name": "Inspector Rajesh Sharma",
        "status": "ACTIVE",
    },
    {
        "case_id": "CASE-0002",
        "case_title": "Cross-Border Illegal Firearms Trafficking",
        "fir_number": "FIR-2026/0889",
        "police_station": "Crime Branch PS",
        "crime_type": "Arms Trafficking",
        "threat_level": "HIGH",
        "assigned_officer_police_id": "INS-201",
        "assigned_officer_name": "Inspector Rajesh Sharma",
        "status": "ACTIVE",
    },
    {
        "case_id": "CASE-0003",
        "case_title": "Interstate Narcotics Distribution Ring",
        "fir_number": "FIR-2026/1102",
        "police_station": "Crime Branch PS",
        "crime_type": "Narcotics",
        "threat_level": "CRITICAL",
        "assigned_officer_police_id": "INS-202",
        "assigned_officer_name": "Inspector Ananya Roy",
        "status": "ACTIVE",
    },
    {
        "case_id": "CASE-0004",
        "case_title": "High-Value Vehicle Extortion & Carjacking Syndicate",
        "fir_number": "FIR-2026/1450",
        "police_station": "Crime Branch PS",
        "crime_type": "Organized Auto Theft",
        "threat_level": "MEDIUM",
        "assigned_officer_police_id": "SI-301",
        "assigned_officer_name": "Sub-Inspector Amit Verma",
        "status": "ACTIVE",
    },
    {
        "case_id": "CASE-0005",
        "case_title": "Ransomware Attack on Regional Health Grid",
        "fir_number": "FIR-2026/1803",
        "police_station": "Crime Branch PS",
        "crime_type": "Cyber Terrorism",
        "threat_level": "CRITICAL",
        "assigned_officer_police_id": "SI-302",
        "assigned_officer_name": "Sub-Inspector Priya Nair",
        "status": "ACTIVE",
    },
    {
        "case_id": "CASE-0006",
        "case_title": "Underworld Money Laundering & Shell Companies",
        "fir_number": "FIR-2026/2210",
        "police_station": "Crime Branch PS",
        "crime_type": "Money Laundering",
        "threat_level": "HIGH",
        "assigned_officer_police_id": None,
        "assigned_officer_name": None,
        "status": "UNASSIGNED",
    },
    {
        "case_id": "CASE-0007",
        "case_title": "Fake Passport & Human Smuggling Racket",
        "fir_number": "FIR-2026/2504",
        "police_station": "Crime Branch PS",
        "crime_type": "Human Trafficking",
        "threat_level": "MEDIUM",
        "assigned_officer_police_id": None,
        "assigned_officer_name": None,
        "status": "UNASSIGNED",
    },
    {
        "case_id": "CASE-0008",
        "case_title": "Jewelry Heist & Syndicate Burglary",
        "fir_number": "FIR-2026/3011",
        "police_station": "Crime Branch PS",
        "crime_type": "Armed Robbery",
        "threat_level": "HIGH",
        "assigned_officer_police_id": None,
        "assigned_officer_name": None,
        "status": "UNASSIGNED",
    },
]

def seed_database():
    now = datetime.now(timezone.utc)
    print("🚀 Seeding Presentation Officers & Cases...")

    for off in officers_data:
        pid = off["police_id"]
        doc = {
            "username": off["username"],
            "email": off["email"],
            "password_hash": default_pw_hash,
            "police_id": pid,
            "rank": off["rank"],
            "state": off["state"],
            "department": off["department"],
            "role": off["role"],
            "is_active": True,
            "created_at": now,
        }
        users_col.update_one({"police_id": pid}, {"$set": doc}, upsert=True)
        print(f"  ✓ Officer: {off['rank']} {off['username']} ({pid}) - {off['role'].upper()}")

    for c in sample_cases:
        cid = c["case_id"]
        c_doc = {
            "case_id": cid,
            "case_title": c["case_title"],
            "fir_number": c["fir_number"],
            "police_station": c["police_station"],
            "crime_type": c["crime_type"],
            "threat_level": c["threat_level"],
            "ipc_sections": ["Section 420", "Section 120B", "IT Act 66D"],
            "master_plot": f"Investigation dossier for {c['case_title']}.",
            "investigating_officer": c["assigned_officer_name"] or "Unassigned",
            "assigned_officer_police_id": c["assigned_officer_police_id"],
            "assigned_officer_name": c["assigned_officer_name"],
            "status": c["status"],
            "created_at": now,
            "updated_at": now,
        }
        cases_col.update_one({"case_id": cid}, {"$set": c_doc}, upsert=True)

        if c["assigned_officer_police_id"]:
            case_access_col.update_one(
                {"case_id": cid},
                {
                    "$set": {
                        "case_id": cid,
                        "lead_investigator_police_id": c["assigned_officer_police_id"],
                        "police_ids": [c["assigned_officer_police_id"]],
                        "updated_at": now,
                    }
                },
                upsert=True
            )
            print(f"  ✓ Case {cid}: Assigned to {c['assigned_officer_name']}")
        else:
            print(f"  ✓ Case {cid}: UNASSIGNED (Ready for Demo Allocation)")

    print("\n🎉 Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_database()
