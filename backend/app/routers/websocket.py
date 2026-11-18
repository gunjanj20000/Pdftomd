import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.job_queue import job_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time event feed for conversion progress, logs, and stage updates."""
    await websocket.accept()
    logger.info("WebSocket client connected.")

    async def listener(message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    job_manager.subscribe(listener)

    try:
        # Keep connection open and receive optional ping messages
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
    finally:
        job_manager.unsubscribe(listener)
