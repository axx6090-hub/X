# 🤖 AI_INSTRUCTIONS.md - دليل الذكاء الاصطناعي لموقع Ayman Ph

> **مهم جداً للذكاء الاصطناعي:** اقرأ هذا الملف كاملاً قبل عمل أي تعديل. هذا الموقع متجر إلكتروني عراقي بواجهة عربية RTL، يستقبل الطلبات عبر واتساب.

---

## 📋 معلومات الموقع الأساسية

| المعلومة | القيمة |
|---|---|
| اسم المتجر | **Ayman Ph** |
| نوع المتجر | متجر إلكتروني عربي (سكين كير + خدمات تصميم) |
| الدومين | https://aymanph.shop |
| اللغة | العربية (RTL) |
| رقم الواتساب | `+9647832882348` (07832882348 بدون +964) |
| رسوم التوصيل | 5,000 د.ع لكافة المحافظات |
| العملة | دينار عراقي (د.ع) |
| التقنيات | React 19 + FastAPI + MongoDB + TailwindCSS |

---

## 📁 هيكل المشروع

```
/app/
├── backend/
│   ├── server.py          # ⭐ كل الباك إند (FastAPI + قائمة المنتجات SEED_PRODUCTS)
│   ├── requirements.txt   # حزم Python
│   └── .env              # MONGO_URL, DB_NAME, CORS_ORIGINS
│
├── frontend/
│   ├── src/
│   │   ├── App.js        # ⭐ كل الواجهة الأمامية (Header, Cart, Checkout, etc)
│   │   ├── index.css     # ستايلات + خطوط عربية (Tajawal, Cairo)
│   │   └── App.css       # ستايلات إضافية
│   ├── public/
│   │   └── index.html    # عنوان الصفحة + meta tags
│   ├── package.json      # حزم Node.js
│   ├── tailwind.config.js
│   └── .env              # REACT_APP_BACKEND_URL
│
└── AI_INSTRUCTIONS.md    # هذا الملف
```

---

## 🛍️ كيف تضيف منتج جديد (أهم قسم!)

### ⚠️ القاعدة الذهبية
**كل منتج جديد لازم يُضاف في مكانين:**
1. **في قائمة `SEED_PRODUCTS`** داخل `/app/backend/server.py` (مهم للنشر/الإنتاج)
2. **في قاعدة البيانات** (للظهور الفوري في Preview)

لكن لو ضفتها في `SEED_PRODUCTS` فقط، راح تظهر بعد إعادة تشغيل الباك إند تلقائياً (لو قاعدة البيانات فاضية، تنزرع. لو فيها بيانات، تحتاج تضيفها يدوياً).

### 📝 الحقول المطلوبة لكل منتج:

```python
{
    "id": "unique-product-id",        # ⭐ معرف فريد (kebab-case, English)
    "name": "اسم المنتج بالعربي",      # ⭐ يظهر للزبون
    "name_en": "Product Name English", # اختياري
    "description": "وصف تفصيلي...",    # وصف طويل، يدعم \n للأسطر الجديدة
    "price": 15000,                    # ⭐ السعر الحالي (بعد التخفيض)
    "sale_price": 19000,               # السعر القديم (للشطب) - اختياري
    "image": "https://....png",        # ⭐ رابط الصورة
    "category": "offers",              # ⭐ "offers" أو "best-selling"
    "skin_type": ["normal", "dry"],    # أنواع البشرة (اختياري)
    "brand": "Revuele",                # العلامة التجارية (اختياري)
    "badge": "-21%",                   # شارة على المنتج (مثل: -20%, جديد, توصيل مجاني)
    "free_delivery": False,            # True لو المنتج له توصيل مجاني (رقمي مثلاً)
}
```

### 🎯 الفئات (categories):
- `"offers"` → يظهر في قسم "عرض حصري 💎"
- `"best-selling"` → يظهر في قسم "الأكثر طلباً ⭐"

### 🧴 أنواع البشرة:
`"normal"`, `"oily"`, `"dry"`, `"combination"`, `"sensitive"`, `"acne"`

---

### 🚀 الطريقة الأولى (الأفضل): إضافة في SEED_PRODUCTS

افتح `/app/backend/server.py` وابحث عن `SEED_PRODUCTS = [`. أضف منتجك الجديد قبل القوس الأخير `]`:

```python
SEED_PRODUCTS = [
    # ... المنتجات الموجودة ...
    {
        "id": "new-serum-product",
        "name": "سيروم فيتامين سي للوجه",
        "description": "سيروم مركز بفيتامين سي 20% لتفتيح البشرة...",
        "price": 25000,
        "sale_price": 32000,
        "image": "https://example.com/serum.png",
        "category": "best-selling",
        "skin_type": ["normal", "dry"],
        "brand": "The Ordinary",
        "badge": "-22%",
        "free_delivery": False,
    },
]
```

ثم اعمل:
```bash
sudo supervisorctl restart backend
```

⚠️ ملاحظة: لو فيه منتجات موجودة بالداتابيس، الـ seed ما يضيف الجديد تلقائياً. لازم تستخدم الطريقة الثانية لإضافته للداتابيس.

---

### 🚀 الطريقة الثانية: إضافة مباشرة لقاعدة البيانات

استخدم بايثون مع pymongo:

```python
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

product = {
    "id": "new-product-id",
    "name": "اسم المنتج",
    "description": "الوصف",
    "price": 15000,
    "sale_price": 19000,
    "image": "https://...",
    "category": "offers",
    "skin_type": ["normal"],
    "brand": "Brand",
    "badge": "-21%",
    "free_delivery": False,
}

db.products.update_one({"id": product["id"]}, {"$set": product}, upsert=True)
print(f"Total products: {db.products.count_documents({})}")
```

**الأفضل دائماً: أضف في كلا الطريقتين** علشان يظهر فوراً + يبقى بعد إعادة النشر.

---

## ✏️ تعديل منتج موجود

### في الكود:
ابحث في `SEED_PRODUCTS` عن المنتج بالـ `id` وعدّل الحقول.

### في قاعدة البيانات:
```python
db.products.update_one(
    {"id": "product-id"},
    {"$set": {"price": 12000, "badge": "-30%"}}
)
```

---

## 🗑️ حذف منتج

### من الكود:
احذف الـ dict من `SEED_PRODUCTS`.

### من قاعدة البيانات:
```python
db.products.delete_one({"id": "product-id"})
```

### حذف كل المنتجات:
```python
db.products.delete_many({})
```

---

## 🔧 تعديلات شائعة

### 1️⃣ تغيير رقم الواتساب
في `/app/frontend/src/App.js`:
```js
const WHATSAPP_NUMBER = "9647832882348"; // غيّر الرقم هنا (بدون + أو 00)
```

### 2️⃣ تغيير رسوم التوصيل
في `/app/frontend/src/App.js`:
```js
const DELIVERY_FEE = 5000; // غيّر الرقم (د.ع)
```

### 3️⃣ تغيير اسم المتجر
ابحث في `/app/frontend/src/App.js` عن `Ayman` و `Ph` (5 مواقع تقريباً):
- الشعار في الهيدر
- الـ Mobile Drawer
- رسالة الواتساب
- الفوتر
- حقوق النشر

أيضاً في `/app/frontend/public/index.html`:
- `<title>` 
- `<meta name="description">`

### 4️⃣ إضافة محافظات أخرى للتوصيل
في `/app/frontend/src/App.js`، ابحث عن قائمة المحافظات:
```js
["بغداد", "البصرة", "أربيل", ...]
```
أضف/احذف من هذه القائمة.

### 5️⃣ تغيير اللون الأساسي (وردي)
الموقع يستخدم Tailwind classes:
- `bg-pink-600`, `text-pink-600`, `border-pink-200` ← لون أساسي
- `#e91e63` ← اللون الوردي الأساسي (موجود في عدة مواقع كـ inline style)

للتغيير لأخضر مثلاً، استبدل `pink` بـ `emerald` أو `green` في كل الـ classes، واستبدل `#e91e63` باللون الأخضر.

---

## 🌐 تشغيل الموقع محلياً

```bash
# تثبيت الحزم
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install

# تشغيل عبر supervisor (الأفضل)
sudo supervisorctl start all

# أو يدوياً:
# Terminal 1: cd /app/backend && uvicorn server:app --reload --host 0.0.0.0 --port 8001
# Terminal 2: cd /app/frontend && yarn start
```

**المنفذ:**
- Backend: http://localhost:8001
- Frontend: http://localhost:3000

---

## 🗄️ قاعدة البيانات MongoDB

**ملاحظة مهمة عن المنصة (Emergent):**
- في الـ **Preview/Dev**: قاعدة بيانات محلية
- في الـ **Production**: قاعدة بيانات Atlas منفصلة (تكون فاضية أول مرة)

**الـ Collections:**
- `products` - المنتجات
- `categories` - الفئات (موجودة من الـ seed)
- `skin_types` - أنواع البشرة (موجودة من الـ seed)

---

## 🔌 API Endpoints (الباك إند)

| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/products` | كل المنتجات |
| GET | `/api/products?category=offers` | منتجات قسم معين |
| GET | `/api/products?skin_type=oily` | منتجات حسب نوع البشرة |
| GET | `/api/products?search=كريم` | بحث |
| GET | `/api/products?limit=10` | تحديد العدد |
| GET | `/api/products/{id}` | منتج محدد |
| GET | `/api/categories` | الفئات |
| GET | `/api/skin-types` | أنواع البشرة |

---

## 🎨 الميزات الموجودة

✅ واجهة عربية RTL كاملة  
✅ شريط إعلانات متحرك (Marquee)  
✅ سلة شراء مع تحديث تلقائي  
✅ قائمة رغبات (Wishlist) بـ localStorage  
✅ بحث  
✅ شارة "تم شراء X قطعة في آخر Y ساعة" (تتغير عشوائياً كل تحديث للصفحة)  
✅ صفحة تفاصيل منتج + منتجات مشابهة  
✅ Checkout يولّد رسالة منسقة ويرسلها لواتساب التاجر  
✅ توصيل مجاني تلقائي للمنتجات الرقمية (`free_delivery: True`)  
✅ زر واتساب عائم في كل الصفحات  
✅ متجاوب مع الموبايل والكمبيوتر  

---

## 🚀 نشر الموقع

### على Emergent Platform:
1. اضغط على **"Deploy"** في صفحة Deployment
2. اربط الدومين عبر **"Link Domain"** (إن أردت دومين مخصص)
3. كل تعديل لاحق → اضغط **"Redeploy"**

### على منصة أخرى (Vercel/Railway/...):
- **Frontend**: ينشر كـ Static React app (yarn build)
- **Backend**: ينشر كـ FastAPI app (uvicorn)
- **MongoDB**: استخدم MongoDB Atlas (مجاني للبداية)
- **متغيرات البيئة المطلوبة:**
  - Backend: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS=*`
  - Frontend: `REACT_APP_BACKEND_URL=https://your-backend-url`

---

## ⚠️ تنبيهات مهمة للذكاء الاصطناعي

1. **لا تغير المنافذ (Ports)**: Backend = 8001، Frontend = 3000
2. **لا تستخدم localhost في كود الفرونت إند**: استخدم `process.env.REACT_APP_BACKEND_URL` دائماً
3. **كل API endpoints لازم تبدأ بـ `/api/`** علشان تشتغل في Kubernetes routing
4. **اللغة العربية RTL**: تأكد من `dir="rtl"` في الـ HTML
5. **التاريخ والوقت**: استخدم `datetime.now(timezone.utc)` مو `datetime.utcnow()` (deprecated)
6. **MongoDB ObjectId**: ما يتسلسل لـ JSON. كل المنتجات تستخدم `id` (string) مو `_id`
7. **الصور**: استخدم روابط HTTPS فقط. لا ترفع صور للكود (استخدم CDN/Cloudinary)

---

## 📞 معلومات التواصل (للمشروع)

- **رقم واتساب التاجر**: 07832882348 (+9647832882348)
- **الدومين**: aymanph.shop

---

## 🎁 مثال كامل: إضافة منتج جديد من ألف للياء

افترض الزبون يريد يضيف:
- اسم: "كريم تفتيح اليدين"
- سعر: 12,000 د.ع (السعر بعد الخصم)
- سعر قديم: 15,000 د.ع
- وصف: "كريم مرطب لتفتيح اليدين بتركيبة فيتامين سي"
- صورة: https://example.com/hand-cream.jpg
- قسم: "offers"
- نوع البشرة: عادية، جافة
- علامة: Eveline

**الخطوة 1:** افتح `/app/backend/server.py`

**الخطوة 2:** أضف المنتج في `SEED_PRODUCTS`:
```python
{
    "id": "eveline-whitening-hand-cream",
    "name": "كريم تفتيح اليدين - ايفلين",
    "description": "كريم مرطب لتفتيح اليدين بتركيبة فيتامين سي، يعمل على توحيد لون البشرة وترطيب عميق.",
    "price": 12000,
    "sale_price": 15000,
    "image": "https://example.com/hand-cream.jpg",
    "category": "offers",
    "skin_type": ["normal", "dry"],
    "brand": "Eveline",
    "badge": "-20%",
    "free_delivery": False,
},
```

**الخطوة 3:** نفذ في الـ Terminal:
```bash
# إضافة مباشرة لقاعدة البيانات (للظهور الفوري)
cd /app && python3 << 'EOF'
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
product = {
    "id": "eveline-whitening-hand-cream",
    "name": "كريم تفتيح اليدين - ايفلين",
    "description": "كريم مرطب لتفتيح اليدين بتركيبة فيتامين سي.",
    "price": 12000,
    "sale_price": 15000,
    "image": "https://example.com/hand-cream.jpg",
    "category": "offers",
    "skin_type": ["normal", "dry"],
    "brand": "Eveline",
    "badge": "-20%",
    "free_delivery": False,
}
db.products.update_one({"id": product["id"]}, {"$set": product}, upsert=True)
print(f"تمت إضافة المنتج. الإجمالي: {db.products.count_documents({})}")
EOF
```

**الخطوة 4:** أعد تشغيل الباك إند (احتياطي):
```bash
sudo supervisorctl restart backend
```

**الخطوة 5:** افتح الموقع وتأكد أن المنتج ظاهر في قسم العروض ✅

**الخطوة 6:** اعمل Redeploy لينتشر على aymanph.shop

---

## 🏁 الخلاصة للذكاء الاصطناعي

> أنت تتعامل مع متجر عراقي بسيط. كل التغييرات الرئيسية تتم في ملفين فقط:
> - **`/app/backend/server.py`** (Backend - منتجات + API)
> - **`/app/frontend/src/App.js`** (Frontend - واجهة + سلة + checkout)
>
> لا تعقّد الأمور. الهدف هو متجر بسيط، واضح، عربي، يحوّل الزبائن لواتساب التاجر. 💪

---

**آخر تحديث:** يناير 2026  
**الإصدار:** 1.0  
**صنع بحب لـ Ayman Ph 💕**
