"""

    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routers import customers, imports, messages, sms, stats


app = FastAPI(title="ISP SMS Console API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):

    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):


    first = exc.errors()[0]
    field = ".".join(str(p) for p in first["loc"])
    return JSONResponse(status_code=422, content={"error": f"{field}: {first['msg']}"})


app.include_router(imports.router)
app.include_router(customers.router)
app.include_router(sms.router)
app.include_router(messages.router)
app.include_router(stats.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}










