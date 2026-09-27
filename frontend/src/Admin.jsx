import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, Package, Tags, ShoppingBag, Settings, Plus, Pencil, Trash2, LogOut, Upload, Save, X, ArrowRight, Eye, EyeOff, Download } from 'lucide-react';
import { api, writeApi, STATIC_MODE } from './storeApi';
import { useStore } from './StoreContext';
import { locationUrl } from './LocationPicker';
import './admin.css';
const price = n => Number(n).toLocaleString('en-US') + ' د.ع';
const statusLabels = { new: 'جديد', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي' };
const blankProduct = category => ({ name: '', name_en: '', description: '', price: 0, sale_price: '', image: '', category: category || '', brand: '', badge: '', active: true, free_delivery: false, no_whatsapp: false, skin_type: [] });
function Field({ label, children, ...props }) {
  return <label className="admin-field"><span>{label}</span>{children || <input {...props} />}</label>;
}
async function compressImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('اختر صورة JPEG أو PNG أو WebP');
  if (file.size > 15 * 1024 * 1024) throw new Error('الصورة كبيرة؛ اختر صورة أقل من 15 ميغابايت');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.size > 800000) throw new Error('اختر صورة أصغر حجماً');
  return blob;
}
function ImageField({ value, onChange, onError, disabled, onBusy }) {
  const [busy, setBusy] = useState(false);
  const upload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); onBusy(true);
    try { const blob = await compressImage(file); const result = await api('/admin/images', { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } }); onChange(result.url); }
    catch (e) { onError(e); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="admin-image-field">
    {value && <img src={value} alt="معاينة الصورة" />}
    <Field label="رابط الصورة" type="text" dir="ltr" value={value || ''} placeholder="https://…" onChange={e => onChange(e.target.value)} />
    <label className={'admin-button secondary upload-label ' + (busy ? 'busy' : '')}><Upload size={16} />{busy ? 'جاري رفع الصورة…' : 'رفع صورة من الجهاز'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy || disabled} /></label>
    <p className="admin-help">تُحفظ الصورة في المتجر وتبقى بعد إعادة النشر.</p>
  </div>;
}
export default function Admin() {
  const { settings: publicSettings, refresh } = useStore();
  const [auth, setAuth] = useState(null);
  const [login, setLogin] = useState({ username: 'admin', password: '' });
  const [tab, setTab] = useState('products');
  const [catalog, setCatalog] = useState({ products: [], categories: [], settings: {} });
  const [config, setConfig] = useState({});
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false);
  const [editor, setEditor] = useState(null); const [catEditor, setCatEditor] = useState(null);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [confirm, setConfirm] = useState(null);
  const handleError = e => { setError(e.message); if (e.status === 401) setAuth(false); };
  const loadCatalog = async () => { const c = await api('/admin/catalog'); setCatalog(c); setConfig(c.settings); };
  const loadOrders = async p => { const result = await api('/admin/orders?page=' + p); setOrders(result.orders); setHasMore(result.has_more); };
  const task = async (fn, message) => {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); if (message) setSuccess(message); }
    catch (e) { handleError(e); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (STATIC_MODE) { setAuth(false); return; }
    api('/admin/session').then(() => setAuth(true)).catch(e => { setAuth(false); if (e.status !== 401) setError(e.message); });
  }, []);
  useEffect(() => {
    if (!auth) return;
    setLoading(true); loadCatalog().catch(handleError).finally(() => setLoading(false));
  }, [auth]);
  useEffect(() => { if (auth && tab === 'orders') { setLoading(true); loadOrders(page).catch(handleError).finally(() => setLoading(false)); } }, [auth, tab, page]);
  const saveProduct = e => {
    e.preventDefault();
    if (uploading) return;
    task(async () => {
      await writeApi('/admin/products' + (editor.id ? '/' + editor.id : ''), editor.id ? 'PUT' : 'POST', { ...editor, price: Number(editor.price), sale_price: editor.sale_price === '' || editor.sale_price == null ? null : Number(editor.sale_price) });
      await loadCatalog(); await refresh(); setEditor(null);
    }, 'تم حفظ المنتج');
  };
  const saveCategory = e => {
    e.preventDefault();
    if (uploading) return;
    task(async () => {
      await writeApi('/admin/categories' + (catEditor.id ? '/' + catEditor.id : ''), catEditor.id ? 'PUT' : 'POST', { ...catEditor, sort_order: Number(catEditor.sort_order) });
      await loadCatalog(); await refresh(); setCatEditor(null);
    }, 'تم حفظ القسم');
  };
  const remove = () => task(async () => { await writeApi('/admin/' + confirm.kind + '/' + confirm.id, 'DELETE', {}); setConfirm(null); await loadCatalog(); await refresh(); }, 'تم الحذف');
  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...catalog }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tokkma-catalog-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (auth === null) return <div className="admin-loading">جاري التحقق من تسجيل الدخول…</div>;
  if (!auth) return <section className="admin-login">
    <div className="admin-login-icon"><LockKeyhole size={30} /></div>
    <p className="admin-eyebrow">{publicSettings.store_name} / الإدارة</p><h1>أهلاً بعودتك</h1><p>سجّل الدخول لإدارة متجرك.</p>
    {STATIC_MODE ? <p className="admin-error">لوحة الإدارة متاحة على نسخة Cloudflare المتصلة بقاعدة البيانات.</p> : <form onSubmit={e => { e.preventDefault(); task(async () => { await writeApi('/admin/login', 'POST', login); setLogin({ ...login, password: '' }); setAuth(true); }); }}>
      <Field label="اسم المستخدم" autoComplete="username" value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} required />
      <Field label="كلمة المرور" type="password" autoComplete="current-password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required maxLength={256} />
      {error && <p role="alert" className="admin-error">{error}</p>}
      <button className="admin-button" disabled={busy || uploading}><LockKeyhole size={17} />{busy ? 'جاري الدخول…' : 'دخول لوحة الإدارة'}</button>
    </form>}
    <Link to="/" className="admin-back"><ArrowRight size={15} />العودة للمتجر</Link>
  </section>;
  const tabs = [{ id: 'products', name: 'المنتجات', icon: Package }, { id: 'categories', name: 'الأقسام', icon: Tags }, { id: 'orders', name: 'الطلبات', icon: ShoppingBag }, { id: 'settings', name: 'الإعدادات', icon: Settings }];
  const visible = catalog.products.filter(p => (!filter || p.category === filter) && [p.name, p.brand].some(x => String(x || '').includes(query)));
  return <div className="admin-shell">
    <header className="admin-heading"><div><p className="admin-eyebrow">{publicSettings.store_name} / الإدارة</p><h1>متجرك، بين يديك</h1><p>إدارة المنتجات والأقسام والطلبات من مكان واحد.</p></div><button className="admin-button secondary" disabled={busy || uploading} onClick={() => task(async () => { await writeApi('/admin/logout', 'POST', {}); setAuth(false); setCatalog({ products: [], categories: [], settings: {} }); setOrders([]); setEditor(null); setCatEditor(null); setConfirm(null); })}><LogOut size={17} />خروج</button></header>
    <div className="admin-stats"><div><span>المنتجات</span><strong>{catalog.products.length}</strong></div><div><span>الأقسام</span><strong>{catalog.categories.length}</strong></div><div><span>منتجات ظاهرة</span><strong>{catalog.products.filter(p => p.active !== false).length}</strong></div></div>
    <nav className="admin-tabs" aria-label="أقسام لوحة الإدارة">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}><t.icon size={18} />{t.name}</button>)}</nav>
    {error && <p role="alert" className="admin-error">{error}</p>}{success && <p role="status" className="admin-success">{success}</p>}
    {loading && <p className="admin-loading">جاري تحميل البيانات…</p>}
    {tab === 'products' && <section className="admin-panel">
      <div className="admin-toolbar"><h2>قائمة المنتجات</h2><button className="admin-button" onClick={() => setEditor(blankProduct(catalog.categories[0]?.slug))} disabled={busy || !catalog.categories.length}><Plus size={17} />إضافة منتج</button></div>
      {!catalog.categories.length && <p className="admin-help">أضف قسماً أولاً من تبويب الأقسام.</p>}
      <div className="admin-filters"><input aria-label="بحث المنتجات" placeholder="ابحث عن اسم المنتج…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="تصفية حسب القسم" value={filter} onChange={e => setFilter(e.target.value)}><option value="">كل الأقسام</option>{catalog.categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
      <div className="admin-product-list">{visible.map(p => <article key={p.id} className="admin-product-row">
        <div className="admin-product-thumb">{p.image ? <img src={p.image} alt="" /> : <Package size={24} />}</div><div className="admin-product-info"><h3>{p.name}</h3><p>{catalog.categories.find(c => c.slug === p.category)?.name} · {price(p.price)}</p><span className={'admin-badge ' + (p.active === false ? 'muted' : '')}>{p.active === false ? 'مخفي' : 'ظاهر'}</span></div>
        <div className="admin-row-actions"><button aria-label={'تعديل ' + p.name} title="تعديل" onClick={() => setEditor({ ...p })}><Pencil size={18} /></button><button disabled={busy || uploading} aria-label={(p.active === false ? 'إظهار ' : 'إخفاء ') + p.name} title="إظهار / إخفاء" onClick={() => task(async () => { await writeApi('/admin/products/' + p.id, 'PUT', { ...p, active: p.active === false }); await loadCatalog(); }, 'تم تحديث ظهور المنتج')}>{p.active === false ? <Eye size={18} /> : <EyeOff size={18} />}</button><button className="danger" aria-label={'حذف ' + p.name} title="حذف" onClick={() => setConfirm({ kind: 'products', id: p.id, name: p.name })}><Trash2 size={18} /></button></div>
      </article>)}</div>{!visible.length && !loading && <p className="admin-empty">لا توجد منتجات مطابقة.</p>}
    </section>}
    {tab === 'categories' && <section className="admin-panel"><div className="admin-toolbar"><h2>أقسام المتجر</h2><button className="admin-button" onClick={() => setCatEditor({ name: '', image: '', sort_order: catalog.categories.length })}><Plus size={17} />إضافة قسم</button></div>
      <div className="admin-category-grid">{catalog.categories.map(c => <article className="admin-category" key={c.id}><Tags size={24} /><h3>{c.name}</h3><p>{catalog.products.filter(p => p.category === c.slug).length} منتج · الترتيب {c.sort_order || 0}</p><div className="admin-row-actions"><button aria-label={'تعديل قسم ' + c.name} onClick={() => setCatEditor({ ...c })}><Pencil size={17} />تعديل</button><button className="danger" aria-label={'حذف قسم ' + c.name} onClick={() => setConfirm({ kind: 'categories', id: c.id, name: c.name })}><Trash2 size={17} />حذف</button></div></article>)}</div>
    </section>}
    {tab === 'orders' && <section className="admin-panel"><div className="admin-toolbar"><h2>طلبات الزبائن</h2><button className="admin-button secondary" disabled={busy || uploading} onClick={() => task(() => loadOrders(page))}>تحديث</button></div>
      {!orders.length && !loading && <p className="admin-empty">ستظهر الطلبات الجديدة هنا.</p>}
      <div className="admin-orders">{orders.map(o => <article className="admin-order" key={o.id}><div className="admin-toolbar"><div><h3>{o.name || 'زبون'} <small>#{o.id.slice(0, 8)}</small></h3><p>{new Date(o.created_at).toLocaleString('ar-IQ')}</p></div><strong>{price(o.total)}</strong></div>
        <p>{o.phone} · {o.city}</p><p>{o.address}</p>{o.notes && <p>ملاحظة: {o.notes}</p>}
        <ul>{o.items.map(i => <li key={i.id}>{i.name} × {i.qty} — {price(i.price * i.qty)}</li>)}</ul>
        {(o.location || o.maps_url) && <a href={o.location ? locationUrl(o.location) : o.maps_url} target="_blank" rel="noopener noreferrer" className="admin-map-link">فتح موقع الزبون في Google Maps ↗</a>}
        <Field label="حالة الطلب"><select value={o.status} disabled={busy || uploading} onChange={e => { const status = e.target.value; task(async () => { await writeApi('/admin/orders/' + o.id, 'PATCH', { status }); await loadOrders(page); }, 'تم تحديث الطلب'); }}>{Object.entries(statusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
      </article>)}</div><div className="admin-pagination"><button className="admin-button secondary" disabled={!page || loading} onClick={() => setPage(page - 1)}>السابق</button><span>الصفحة {page + 1}</span><button className="admin-button secondary" disabled={!hasMore || loading} onClick={() => setPage(page + 1)}>التالي</button></div>
    </section>}
    {tab === 'settings' && <section className="admin-panel"><h2>إعدادات المتجر</h2><form className="admin-settings" onSubmit={e => { e.preventDefault(); task(async () => { await writeApi('/admin/settings', 'PUT', { ...config, delivery_fee: Number(config.delivery_fee) }); await loadCatalog(); await refresh(); }, 'تم حفظ الإعدادات'); }}>
      <Field label="اسم المتجر" value={config.store_name || ''} onChange={e => setConfig({ ...config, store_name: e.target.value })} maxLength={80} required />
      <Field label="رقم واتساب لاستلام الطلبات" dir="ltr" placeholder="9647832882348" value={config.whatsapp_number || ''} onChange={e => setConfig({ ...config, whatsapp_number: e.target.value })} required />
      <Field label="رسوم التوصيل بالدينار العراقي" type="number" min="0" max="1000000" value={config.delivery_fee ?? 0} onChange={e => setConfig({ ...config, delivery_fee: e.target.value })} required />
      <Field label="نص شريط الإعلان" value={config.announcement || ''} onChange={e => setConfig({ ...config, announcement: e.target.value })} maxLength={300} />
      <details className="admin-advanced"><summary>الخريطة التفاعلية داخل الموقع (اختياري)</summary><p className="admin-help">الموقع الحالي وروابط Google Maps تعمل دون مفتاح. لتفعيل اختيار نقطة داخل الموقع، أضف مفتاح Maps JavaScript API المقيّد بدومين المتجر. قد تتطلب خدمة Google حساب فوترة.</p><Field label="Google Maps browser API key" dir="ltr" value={config.google_maps_api_key || ''} onChange={e => setConfig({ ...config, google_maps_api_key: e.target.value })} /></details>
      <button className="admin-button" disabled={busy || uploading}><Save size={17} />{busy ? 'جاري الحفظ…' : 'حفظ الإعدادات'}</button>
    </form><div className="admin-backup"><h3>تصدير قائمة المنتجات</h3><p>تنزيل نسخة من المنتجات والأقسام والإعدادات. الصور المرفوعة تُحفظ في قاعدة البيانات؛ النسخة الكاملة تؤخذ من Cloudflare D1.</p><button className="admin-button secondary" onClick={exportCatalog}><Download size={17} />تنزيل قائمة JSON</button></div></section>}
    {editor && <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editor.id ? 'تعديل المنتج' : 'إضافة منتج'}><section className="admin-modal-card"><div className="admin-toolbar"><h2>{editor.id ? 'تعديل المنتج' : 'إضافة منتج'}</h2><button className="admin-icon" aria-label="إغلاق نموذج المنتج" disabled={busy || uploading} onClick={() => setEditor(null)}><X /></button></div><form onSubmit={saveProduct}>
      <Field label="اسم المنتج" value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} required maxLength={200} autoFocus />
      <div className="admin-two-columns"><Field label="السعر بالدينار" type="number" min="0" max="1000000000" value={editor.price} onChange={e => setEditor({ ...editor, price: e.target.value })} required /><Field label="السعر قبل التخفيض (اختياري)" type="number" min="0" value={editor.sale_price ?? ''} onChange={e => setEditor({ ...editor, sale_price: e.target.value })} /></div>
      <Field label="القسم"><select required value={editor.category} onChange={e => setEditor({ ...editor, category: e.target.value })}>{catalog.categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></Field>
      <Field label="الوصف"><textarea rows={6} value={editor.description} maxLength={30000} onChange={e => setEditor({ ...editor, description: e.target.value })} /></Field>
      <ImageField key={editor.id || 'new-product'} value={editor.image} onChange={image => setEditor(p => p ? ({ ...p, image }) : null)} onError={handleError} onBusy={setUploading} disabled={busy || uploading} />
      <div className="admin-two-columns"><Field label="العلامة التجارية" value={editor.brand || ''} onChange={e => setEditor({ ...editor, brand: e.target.value })} /><Field label="شارة المنتج (جديد، خصم…)" value={editor.badge || ''} onChange={e => setEditor({ ...editor, badge: e.target.value })} /></div>
      <label className="admin-check"><input type="checkbox" checked={editor.active !== false} onChange={e => setEditor({ ...editor, active: e.target.checked })} />إظهار المنتج للزبائن</label>
      <label className="admin-check"><input type="checkbox" checked={!!editor.free_delivery} onChange={e => setEditor({ ...editor, free_delivery: e.target.checked })} />توصيل مجاني / منتج رقمي</label>
      <label className="admin-check"><input type="checkbox" checked={!!editor.no_whatsapp} onChange={e => setEditor({ ...editor, no_whatsapp: e.target.checked, ...(e.target.checked ? { price: 0 } : {}) })} />وصف مجاني للعرض والنسخ بدون طلب واتساب</label>
      {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-button" disabled={busy || uploading}><Save size={17} />{busy ? 'جاري الحفظ…' : 'حفظ المنتج'}</button>
    </form></section></div>}
    {catEditor && <div className="admin-modal" role="dialog" aria-modal="true" aria-label="إدارة القسم"><section className="admin-modal-card"><div className="admin-toolbar"><h2>{catEditor.id ? 'تعديل القسم' : 'إضافة قسم'}</h2><button className="admin-icon" aria-label="إغلاق نموذج القسم" disabled={busy || uploading} onClick={() => setCatEditor(null)}><X /></button></div><form onSubmit={saveCategory}>
      <Field label="اسم القسم" value={catEditor.name} onChange={e => setCatEditor({ ...catEditor, name: e.target.value })} required maxLength={100} autoFocus />
      <Field label="ترتيب القسم" type="number" min="0" max="10000" value={catEditor.sort_order} onChange={e => setCatEditor({ ...catEditor, sort_order: e.target.value })} required />
      <ImageField value={catEditor.image} onChange={image => setCatEditor(c => c ? ({ ...c, image }) : null)} onError={handleError} onBusy={setUploading} disabled={busy || uploading} />
      {error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-button" disabled={busy || uploading}><Save size={17} />حفظ القسم</button>
    </form></section></div>}
    {confirm && <div className="admin-modal" role="alertdialog" aria-modal="true" aria-label="تأكيد الحذف"><section className="admin-modal-card small"><Trash2 className="text-red-500" /><h2>حذف «{confirm.name}»؟</h2><p>سيُزال من المتجر. {confirm.kind === 'categories' ? 'القسم الذي يحتوي منتجات لا يمكن حذفه قبل نقلها أو حذفها.' : 'الطلبات السابقة تبقى محفوظة.'}</p>{error && <p className="admin-error">{error}</p>}<div className="admin-toolbar"><button className="admin-button danger-fill" disabled={busy || uploading} onClick={remove}>تأكيد الحذف</button><button className="admin-button secondary" disabled={busy || uploading} onClick={() => setConfirm(null)}>إلغاء</button></div></section></div>}
  </div>;
}
