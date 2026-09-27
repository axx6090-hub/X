# نشر متجر tokkma.com

الفرع `tokkma-cloudflare` مبني على واجهة مستودع X الحالية. الكود جاهز لـ Cloudflare Workers + D1، لكن وجود الملفات في GitHub وحده **لا ينشره** ولا يغير الدومين. يلزم تنفيذ النشر من حساب Cloudflare المالك.

## ما تمت إضافته

- لوحة إدارة عربية متجاوبة عند `/#/admin`، ويعمل `/admin` كاختصار.
- إضافة وتعديل وحذف وإخفاء المنتجات، الأسعار والأوصاف والصور.
- رفع صور JPEG / PNG / WebP من الموبايل؛ تصغيرها في المتصفح وحفظها في D1.
- إدارة الأقسام وترتيبها. لا يمكن حذف قسم يحتوي منتجات قبل نقلها أو حذفها.
- اسم المتجر، رقم واتساب، رسوم التوصيل، وشريط الإعلان قابلة للتعديل.
- حفظ الطلبات ومراجعة حالتها؛ الأسعار ورسوم التوصيل تُحسب على السيرفر.
- موقع الزبون اختياري: زر موقع الجهاز، أو رابط مشاركة Google Maps. يمكن حذف الموقع وإتمام الطلب بدونه.
- اختيار نقطة داخل خريطة مضمّنة متاح عند إدخال مفتاح Maps JavaScript API مقيد بدومين المتجر في الإعدادات. الخدمة المضمّنة قد تتطلب فوترة من Google؛ لم يُنشأ أي اشتراك.
- كلمة المرور مجزأة ومملّحة؛ جلسة الأدمن Cookie من نوع HttpOnly / Secure / SameSite=Strict، حماية من الطلبات العابرة للمواقع وتحديد محاولات الدخول.
- السلة تُحفظ في متصفح الزبون. المنتجات والأقسام والإعدادات والصور والطلبات في D1، ولا تُعاد المنتجات المحذوفة عند النشر.

## أول نشر من GitHub Actions

1. يحتاج `tokkma.com` إلى منطقة DNS فعالة في حساب Cloudflare نفسه. افحص سجلات DNS الموجودة واحفظها قبل نقل الربط. لا تحذف سجلات البريد أو تغيرها. لا يغيّر السكربت Namecheap أو nameservers تلقائياً.
2. في Cloudflare أنشئ API Token مخصصاً لحسابك والمنطقة المطلوبة، بحدود الصلاحيات التالية:
   - Account: Workers Scripts — Edit، D1 — Edit، Account Settings — Read.
   - Zone `tokkma.com`: Zone — Read، DNS — Edit، Workers Routes — Edit.
   لا تضع التوكن في الكود أو المحادثة. استخدم GitHub Actions Secrets.
3. بعد تنزيل هذا الفرع وتثبيت Node.js 22، شغّل `npm run admin:password`. أدخل كلمة مرور طويلة مرتين؛ الإدخال مخفي. احتفظ بالقيمة الناتجة كاملة في Secret باسم `ADMIN_PASSWORD_HASH`. لا تضع كلمة المرور النصية في GitHub.
4. في مستودع `axx6090-hub/X` → Settings → Secrets and variables → Actions، أضف:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `ADMIN_PASSWORD_HASH`
   ويمكن إضافة Variable باسم `ADMIN_USERNAME` (افتراضياً `admin`).
5. افتح Actions → **Deploy Tokkma to Cloudflare** → Run workflow، واختر الفرع `tokkma-cloudflare`. في النشر الأول اترك `connect_domains` غير محدد.
   إذا لم يظهر Workflow لأنه موجود في فرع جديد، يمكن تشغيله بواسطة GitHub CLI: `gh workflow run deploy-tokkma-cloudflare.yml --ref tokkma-cloudflare` عندما يكون Workflow مسجلاً على الفرع الافتراضي؛ أو نفّذ النشر المحلي أدناه مباشرة من هذا الفرع. لا تدمج تغييرات تتعلق بموقع آخر لمجرد تفعيل قائمة Actions.
6. السكربت ينشئ/يعيد استخدام قاعدة D1 باسم `tokkma-store`، يطبق migrations مرة واحدة، ينشر الواجهة والـ API، يضبط سر الأدمن، ثم يتحقق من `/api/health`.
7. افتح عنوان `workers.dev` الظاهر في السجل واختبر دخول الأدمن. عدّل اسم المتجر ورقم واتساب ورسوم التوصيل حسب رغبتك.
8. أعد تشغيل Workflow مع `connect_domains` مفعلاً لربط `tokkma.com` و`www.tokkma.com`. إذا وجد Cloudflare سجل CNAME متعارضاً، عالج سجل الويب المعني فقط بعد توثيق قيمته؛ لا يوجد تجاوز قسري في السكربت. ينتظر اكتمال DNS وشهادة HTTPS عند الحاجة.
9. لتفعيل النشر التلقائي عند كل تحديث لهذا الفرع، أضف Repository Variable باسم `CLOUDFLARE_DEPLOY_ENABLED` وقيمته `true`. لا تفعّله قبل إعداد الأسرار.

## نشر محلي

```bash
npm ci
npm --prefix frontend ci --legacy-peer-deps --ignore-scripts
npm test
npm --prefix frontend run test -- --watchAll=false --runInBand
npm run build
```

اضبط الأسرار أعلاه في بيئة طرفية آمنة، ثم:

```bash
npm run deploy
```

بعد نجاح الاختبار على `workers.dev`، اضبط `TOKKMA_CUSTOM_DOMAINS=true` وشغّل `npm run deploy` مرة أخرى لربط الدومين. ملف `wrangler.deploy.json` يولّد بمعرّف قاعدة البيانات ويُستثنى من Git. المعرّف الصفري في `wrangler.jsonc` مخصص للتطوير المحلي ويُستبدل تلقائياً وقت النشر.

## التطوير المحلي

```bash
npm run build
npm run db:local
npm run admin:password
```

ضع القيمة الناتجة في ملف `.dev.vars` محلياً فقط:

```dotenv
ADMIN_PASSWORD_HASH="VALUE_FROM_PASSWORD_SCRIPT"
```

ثم `npm run dev`. لا تستخدم كلمة مرور الاختبار في الإنتاج.

## دوام البيانات والنسخ الاحتياطي

- الموقع لا يعتمد على بقاء هاتفك أو الكمبيوتر مشغلاً. توفر الخدمة مرتبط ببقاء حساب Cloudflare والدومين فعالين وحدود الخطة المختارة؛ ليس وعداً باستضافة مجانية إلى الأبد.
- احفظ قاعدة D1 نفسها عند إعادة النشر. الـ migrations الأولية تزرع منتجات X مرة واحدة فقط.
- تصدير JSON من لوحة الأدمن يضم قائمة المنتجات والأقسام والإعدادات وروابط الصور، وليس ملفات الصور والطلبات. للنسخة الكاملة استخدم D1 Export أو `wrangler d1 export DB --remote --config wrangler.deploy.json --output backup.sql` واحفظ النسخة في مكان خاص لأنها تضم بيانات الطلبات والجلسات.
- الصور القديمة لا تحذف تلقائياً عند تعديل المنتج، لتجنب كسر أي صورة مستخدمة في أكثر من مكان. راقب حجم قاعدة D1 مع نمو المتجر.
- التعليقات الموجودة في واجهة X تحتفظ بسلوكها القديم: محلية في متصفح الزائر وموسومة بذلك. ليست نظام مراجعات مركزي؛ بيانات المنتجات والإدارة والطلبات فقط نُقلت إلى D1.
- تغيير سر كلمة المرور يغيّر تسجيل الدخول؛ الجلسات القائمة تنتهي خلال 12 ساعة. لإبطال جميع الجلسات فوراً استخدم `DELETE FROM admin_sessions` عبر إدارة D1 الموثوقة.

## المراجع الرسمية

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.google.com/maps/documentation/urls/get-started
