import os
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pipeline import run_pipeline_stream

load_dotenv()

app = FastAPI()
executor = ThreadPoolExecutor()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/run")
async def run(
    brief: str = Query(...),
    client_name: str = Query(...),
    platform: str = Query(...),
):
    csv_path = os.environ.get("TOP_ADS_CSV", "data/top_ads_sample.csv")
    brand_bible_file_id = os.environ["BRAND_BIBLE_FILE_ID"]

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
