import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')

PRODUCT = {
    "id": "trend-love-ai",
    "name": "ترند الحبAi",
    "name_en": "Trend Love AI",
    "description": "Use 100% of both uploaded faces. Create an ultra-realistic candid iPhone front-camera flash selfie that looks exactly like a real Instagram Story, never Al-generated.\n\nPreserve true facial identity, natural skin pores, tiny imperfections, sensor noise, slight motion blur, authentic smartphone HDR, imperfect focus, and realistic camera artifacts. Show only the upper half of both faces framed extremely close together. The left person has one visible eye with long natural eyelashes, the right person has soft messy black bangs partially covering one eye.\n\nWarm hazel-brown eyes with natural reflections, soft black hair with loose strands, faint acne marks, and realistic skin texture. Low-light indoor setting with phone flash, soft overexposed highlights, shallow depth of field, cozy late-night aesthetic. Place a tiny pink heart emoji and heart hands emoji between both faces. Vertical 9:16, raw, cinematic, unedited, no beauty filter, no Al Look, no plastic skin, no oversharpening.",
    "price": 0,
    "image": "https://hshahahaha.github.io/ayman-ph-website/images/trend-love-ai.jpg",
    "category": "best-selling",
    "skin_type": [],
    "brand": "كليشة",
    "badge": "مجاني",
    "free_delivery": True,
    "no_whatsapp": True,
}

async def _ensure_product():
    url = os.environ.get("MONGO_URL")
    name = os.environ.get("DB_NAME")
    if not url or not name:
        return
    client = AsyncIOMotorClient(url)
    try:
        await client[name].products.update_one({"id": PRODUCT["id"]}, {"$set": PRODUCT}, upsert=True)
    finally:
        client.close()

try:
    asyncio.run(_ensure_product())
except Exception:
    pass
