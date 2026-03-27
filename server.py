import os
import io
import json
import asyncio
import anthropic
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Query, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pipeline import run_pipeline_stream

load_dotenv()

app = FastAPI()
executor = ThreadPoolExecutor()

_extra_origin = os.environ.get("FRONTEND_URL", "")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ["http://localhost:3000", _extra_origin] if o],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.post("/upload-bible")
async def upload_bible(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename or "brand_bible"
    mime = "application/pdf" if filename.lower().endswith(".pdf") else "text/plain"
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.beta.files.upload(
        file=(filename, io.BytesIO(contents), mime),
        betas=["files-api-2025-04-14"],
    )
    return JSONResponse({"file_id": response.id, "filename": filename})


@app.get("/run")
async def run(
    brief: str = Query(...),
    client_name: str = Query(...),
    platform: str = Query(...),
    bible_file_id: str | None = Query(default=None),
):
    csv_path = os.environ.get("TOP_ADS_CSV", "data/top_ads_sample.csv")
    brand_bible_file_id = bible_file_id or os.environ.get("BRAND_BIBLE_FILE_ID")
    if not brand_bible_file_id:
        return JSONResponse({"error": "No brand bible loaded. Upload a brand bible first."}, status_code=400)

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def run_in_thread():
        try:
            for event in run_pipeline_stream(
                brief=brief,
                client_name=client_name,
                platform=platform,
                csv_path=csv_path,
                brand_bible_file_id=brand_bible_file_id,
            ):
                asyncio.run_coroutine_threadsafe(queue.put(event), loop)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(
                queue.put({"event": "error", "message": str(e)}), loop
            )
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    async def event_stream():
        loop.run_in_executor(executor, run_in_thread)
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
