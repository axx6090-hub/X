from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    name_en: Optional[str] = ""
    description: Optional[str] = ""
    price: float
    sale_price: Optional[float] = None
    image: str
    image_alt: Optional[str] = None
    category: str  # offers, last-chance, best-selling, perfumes, makeup, moisturizer, sunscreen, serum, cleanser, toner, eye-care, essence
    skin_type: Optional[List[str]] = []
    brand: Optional[str] = ""
    badge: Optional[str] = None  # e.g. "-24%", "جديد"
    free_delivery: Optional[bool] = False  # digital products or special items have free delivery


class Category(BaseModel):
    id: str
    name: str
    slug: str
    image: str


# Seed data - real products from Barbie Phar
SEED_PRODUCTS = [
    {
        "id": "revuele-hydro-water-gel",
        "name": "جل مائي مرطب للوجه بحمض الهيالورونيك - ريفويل",
        "name_en": "Revuele Hydro Skin Quenching Water Gel",
        "description": (
            "جل مائي مرطب للوجه بحمض الهيالورونيك من ماركة Revuele. تركيبة مائية خفيفة، "
            "يوفر ترطيباً عميقاً للبشرة ويعيد توازن الرطوبة. مناسب للبشرة العادية والجافة جداً.\n\n"
            "✨ المميزات:\n"
            "• قوام خفيف يشبه الماء\n"
            "• مثالي للبشرة العادية والجافة جداً\n"
            "• يعزز الحاجز الواقي للبشرة\n"
            "• خالٍ من العطور\n\n"
            "📝 طريقة الاستخدام:\n"
            "ضعيه على وجه ورقبة نظيفين وجافين. دلكي بلطف حتى يمتص تماماً."
        ),
        "price": 15000,
        "sale_price": 19000,
        "image": "https://customer-assets.emergentagent.com/job_wellness-beauty-6/artifacts/hvrc8zuc_file_00000000c9fc720ab24587c0f80a41bc.png",
        "category": "offers",
        "skin_type": ["normal", "dry"],
        "brand": "Revuele",
        "badge": "-21%",
        "free_delivery": False,
    },
    {
        "id": "revuele-ceramide-cleanser",
        "name": "غسول وجه مضاد للعيوب بالسيراميد - ريفويل",
        "name_en": "Revuele Ceramide Anti-blemish Face Cleanser",
        "description": (
            "غسول وجه مضاد للعيوب بالسيراميد من ماركة Revuele. يحتوي على حمض الساليسيليك "
            "والنياسيناميد لتنظيف عميق وتقليل العيوب والبثور مع حماية حاجز البشرة الطبيعي.\n\n"
            "يعمل على إزالة الشوائب والزيوت الزائدة بفعالية دون الإضرار بحاجز البشرة. "
            "تركيبته المتقدمة تحتوي على حمض الساليسيليك الذي ينقي المسام ويعزز نعومة الجلد.\n\n"
            "✨ المكونات الفعالة:\n"
            "• حمض الساليسيليك - ينقي المسام\n"
            "• النياسيناميد - يقلل البثور والرؤوس السوداء\n"
            "• السيراميدات - تدعم حاجز البشرة الطبيعي\n"
            "• حمض الهيالورونيك - يرطب البشرة\n\n"
            "📏 الحجم: 250 مل\n"
            "🎯 مناسب لـ: البشرة العادية والدهنية والمعرضة للحبوب\n"
            "🌸 خالٍ من العطور\n\n"
            "📝 طريقة الاستخدام:\n"
            "ضعي كمية مناسبة على بشرة مبللة، دلكي بلطف، ثم اشطفي جيداً بالماء. "
            "يستخدم مرتين يومياً صباحاً ومساءً مع تجنب ملامسة العينين."
        ),
        "price": 15000,
        "sale_price": 19000,
        "image": "https://customer-assets.emergentagent.com/job_wellness-beauty-6/artifacts/acjn1ctr_file_00000000238471f484ae3b11d684d2b7.png",
        "category": "offers",
        "skin_type": ["normal", "oily", "acne"],
        "brand": "Revuele",
        "badge": "-21%",
        "free_delivery": False,
    },
    {
        "id": "kids-video-design",
        "name": "تصميم فيديو أطفال - 10 ثواني",
        "name_en": "Kids Video Design - 10 seconds",
        "description": (
            "🎬 تصميم فيديو احترافي لطفلك مدته 10 ثواني، بصور عالية الجودة "
            "ومؤثرات بصرية مميزة تليق بمناسبتكم.\n\n"
            "✨ المميزات:\n"
            "• مدة الفيديو: 10 ثواني\n"
            "• جودة عالية HD\n"
            "• مؤثرات بصرية وموسيقى\n"
            "• تصميم احترافي مخصص\n"
            "• مناسب للمناسبات (عيد ميلاد، عقيقة، تخرج)\n\n"
            "🚚 توصيل مجاني عند طلب هذا المنتج لوحده!\n\n"
            "📞 للتفاصيل والصور تواصلي معنا عبر واتساب بعد إتمام الطلب."
        ),
        "price": 5000,
        "image": "https://customer-assets.emergentagent.com/job_wellness-beauty-6/artifacts/ht9tpsvz_file_00000000551c7246b1356be6ee77fdd2.png",
        "category": "best-selling",
        "skin_type": [],
        "brand": "Ayman Ph",
        "badge": "توصيل مجاني",
        "free_delivery": True,
    },
]

CATEGORIES = [
    {"id": "moisturizer", "name": "مرطب", "slug": "moisturizer", "image": "https://barbiephar.com/cdn/shop/files/mrtb.png?v=1743937275&width=600"},
    {"id": "sunscreen", "name": "واقي شمس", "slug": "sunscreen", "image": "https://barbiephar.com/cdn/shop/files/oaky-shms.png?v=1743937275&width=600"},
    {"id": "serum", "name": "سيروم", "slug": "serum", "image": "https://barbiephar.com/cdn/shop/files/syrom_d78fd78d-b8ec-457d-88d4-66815536c008.png?v=1743948115&width=600"},
    {"id": "cleansers", "name": "غسول", "slug": "cleansers", "image": "https://barbiephar.com/cdn/shop/files/ghsol_4b6dfea5-6be6-489f-bfb0-34e1cde95720.png?v=1743948115&width=600"},
    {"id": "oil-cleansers", "name": "غسول زيتي", "slug": "oil-cleansers", "image": "https://barbiephar.com/cdn/shop/files/ghsol-zyty_b48812f7-537e-444d-8703-26d5b9044de1.png?v=1743948115&width=600"},
    {"id": "toners", "name": "تونر", "slug": "toners", "image": "https://barbiephar.com/cdn/shop/files/tonr_0defaaad-8f76-4f06-87c6-e6c46afcad79.png?v=1743948115&width=600"},
    {"id": "eye-care", "name": "عناية بالعين", "slug": "eye-care", "image": "https://barbiephar.com/cdn/shop/files/alaanay-balaayn_251eda0b-4a92-44aa-ab5b-e4705425ea61.png?v=1743948115&width=600"},
    {"id": "essence", "name": "اسنس", "slug": "essence", "image": "https://barbiephar.com/cdn/shop/files/asns.png?v=1743937275&width=600"},
]

SKIN_TYPES = [
    {"id": "normal", "name": "بشرة عادية", "slug": "normal-skin", "image": "https://barbiephar.com/cdn/shop/files/5_573c2f88-2ded-4f5a-822a-a1f18a348616.jpg?v=1725394886&width=600"},
    {"id": "oily", "name": "بشرة دهنية", "slug": "oily-skin", "image": "https://barbiephar.com/cdn/shop/files/5_9b1b5241-1192-410c-aec9-ce6273e5381d.jpg?v=1725394886&width=600"},
    {"id": "dry", "name": "بشرة جافة", "slug": "dryskin", "image": "https://barbiephar.com/cdn/shop/files/5_d1731596-cd58-4b82-ac0c-b2dc1ca34bb6.jpg?v=1725394886&width=600"},
    {"id": "combination", "name": "بشرة مختلطة", "slug": "combination-skin", "image": "https://barbiephar.com/cdn/shop/files/5_b3d499d4-4ae5-49e1-8ebc-b9b82f26a8b6.jpg?v=1725394886&width=600"},
    {"id": "sensitive", "name": "بشرة حساسة", "slug": "sensitive-skin", "image": "https://barbiephar.com/cdn/shop/files/5_1bd69d32-9e11-4c98-977a-ca5f345e7486.jpg?v=1725394886&width=600"},
    {"id": "acne", "name": "بشرة معرضة للحبوب", "slug": "acne-skin", "image": "https://barbiephar.com/cdn/shop/files/4_68c3473a-2e1c-41de-97f2-4a7c06eac56a.png?v=1725192597&width=600"},
]


@app.on_event("startup")
async def seed_db():
    # Seed products only if SEED_PRODUCTS has entries
    count = await db.products.count_documents({})
    if count == 0 and SEED_PRODUCTS:
        await db.products.insert_many([{**p} for p in SEED_PRODUCTS])
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products")
    # Seed categories
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        await db.categories.insert_many([{**c} for c in CATEGORIES])
        logger.info(f"Seeded {len(CATEGORIES)} categories")
    # Seed skin types
    skin_count = await db.skin_types.count_documents({})
    if skin_count == 0:
        await db.skin_types.insert_many([{**s} for s in SKIN_TYPES])
        logger.info(f"Seeded {len(SKIN_TYPES)} skin types")


@api_router.get("/")
async def root():
    return {"message": "Barbie Phar API"}


@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None, skin_type: Optional[str] = None, search: Optional[str] = None, limit: int = 100):
    query = {}
    if category:
        query["category"] = category
    if skin_type:
        query["skin_type"] = skin_type
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return products


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats


@api_router.get("/skin-types")
async def get_skin_types():
    types = await db.skin_types.find({}, {"_id": 0}).to_list(100)
    return types


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
