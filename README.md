# 🌸 Ayman Ph - متجر العناية بالبشرة الإلكتروني

> متجر عراقي إلكتروني للعناية بالبشرة والخدمات الرقمية، يستقبل الطلبات عبر واتساب.

🌐 **الموقع المباشر:** https://aymanph.shop

---

## ✨ المميزات

- 🛍️ واجهة عربية RTL كاملة
- 📱 متجاوب مع كل الأجهزة (موبايل، تابلت، كمبيوتر)
- 🛒 سلة شراء ذكية
- ❤️ قائمة رغبات (Wishlist)
- 🔍 بحث وتصفية المنتجات
- 💬 إتمام الطلب عبر واتساب مباشرة
- 🚚 رسوم توصيل ثابتة 5,000 د.ع لكافة المحافظات
- 🎁 توصيل مجاني للمنتجات الرقمية

---

## 🛠️ التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| Frontend | React 19, React Router, Tailwind CSS, Axios, Lucide Icons |
| Backend | FastAPI, Python 3.11+, Motor (Async MongoDB) |
| Database | MongoDB |
| Fonts | Tajawal, Cairo (Arabic Google Fonts) |
| Deployment | Emergent Platform / Kubernetes |

---

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js 18+ و Yarn
- Python 3.11+
- MongoDB (محلي أو Atlas)

### الخطوات

```bash
# 1) فك ضغط المشروع
cd ayman-ph-website

# 2) إعداد الباك إند
cd backend
pip install -r requirements.txt
# عدّل .env بمعلومات قاعدة بياناتك:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=ayman_ph
# CORS_ORIGINS=*

# تشغيل الباك إند
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# 3) في تيرمينال ثاني - إعداد الفرونت إند
cd ../frontend
yarn install
# عدّل .env:
# REACT_APP_BACKEND_URL=http://localhost:8001

yarn start
```

الموقع يفتح على: http://localhost:3000

---

## 📁 هيكل المشروع

```
ayman-ph-website/
├── backend/
│   ├── server.py          # كل الباك إند (API + Seed Data)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js         # كل الفرونت إند (Header, Cart, Checkout, ...)
│   │   ├── index.css
│   │   └── App.css
│   ├── public/index.html
│   ├── package.json
│   └── .env
├── AI_INSTRUCTIONS.md     # ⭐ دليل للذكاء الاصطناعي
└── README.md              # هذا الملف
```

---

## 🛍️ كيف أضيف منتج جديد؟

**اقرأ ملف [`AI_INSTRUCTIONS.md`](./AI_INSTRUCTIONS.md)** للتفاصيل الكاملة. ملخص:

1. افتح `backend/server.py`
2. ابحث عن `SEED_PRODUCTS = [`
3. أضف منتجك:
```python
{
    "id": "unique-id",
    "name": "اسم المنتج",
    "description": "الوصف",
    "price": 15000,
    "sale_price": 19000,
    "image": "https://link-to-image.png",
    "category": "offers",  # أو "best-selling"
    "skin_type": ["normal", "dry"],
    "brand": "اسم العلامة",
    "badge": "-21%",
    "free_delivery": False,
}
```
4. أعد تشغيل الباك إند: `sudo supervisorctl restart backend`

---

## 🔧 تخصيص الموقع

### تغيير رقم الواتساب
في `frontend/src/App.js`:
```js
const WHATSAPP_NUMBER = "9647832882348";
```

### تغيير رسوم التوصيل
في `frontend/src/App.js`:
```js
const DELIVERY_FEE = 5000;
```

### تغيير اسم المتجر
ابحث عن "Ayman Ph" في:
- `frontend/src/App.js` (5 مواقع)
- `frontend/public/index.html` (title + description)

---

## 📞 المعلومات

- 📱 **واتساب:** +964 783 288 2348
- 🌐 **الموقع:** https://aymanph.shop

---

## 📄 الترخيص

كود مفتوح للاستخدام الشخصي. صنع بحب 💕
