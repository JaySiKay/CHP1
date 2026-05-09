from contextlib import asynccontextmanager
from datetime import datetime
import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from app.api.v1 import auth as auth_router
from app.api.v1.admin import inventory as admin_inventory
from app.api.v1.admin import returns as admin_returns
from app.api.v1.owner import analytics as owner_analytics
from app.api.v1.owner import procurement as owner_procurement
from app.api.v1.owner import team as owner_team
from app.api.v1.settings import settings as settings_router
from app.db.central.session import SessionLocal
from app.etl.extract import extract_new_data

load_dotenv()

scheduler = BackgroundScheduler()


def scheduled_etl_job():
    print(f"[{datetime.now().isoformat()}] ETL Sync start")
    db = SessionLocal()
    try:
        extract_new_data(db)
        print(f"[{datetime.now().isoformat()}] ETL Sync finished")
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] ETL Sync FAILED: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(scheduled_etl_job, "interval", minutes=60, id="etl_sync")
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(
    title="Clothing-Hub Analytics API",
    description="Multi-tenant analytics hub for clothing stores",
    version="1.1.0",
    lifespan=lifespan,
)

cors_origins = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:4200,http://localhost:8000",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router,       prefix="/api/v1/auth",              tags=["Authentication"])
app.include_router(owner_analytics.router,   prefix="/api/v1/analytics",         tags=["Analytics"])
app.include_router(owner_team.router,        prefix="/api/v1/owner/team",        tags=["Team management"])
app.include_router(owner_procurement.router, prefix="/api/v1/owner/procurement", tags=["Procurement"])
app.include_router(admin_inventory.router,   prefix="/api/v1/admin",             tags=["Inventory"])
app.include_router(admin_returns.router,     prefix="/api/v1/admin",             tags=["Returns"])
app.include_router(settings_router.router,   prefix="/api/v1/settings",          tags=["Settings"])


@app.get("/health")
def health_check():
    return {"status": "online", "version": app.version}


@app.get("/")
def read_root():
    return {"message": "Backend is running"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
