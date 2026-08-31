import React, { useEffect, useState, createContext, useContext, useMemo } from "react";
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "./localAxios";
import staticData from "./staticData.json";
import { ShoppingBag, Heart, Search, Menu, X, ChevronLeft, Plus, Minus, Trash2, MessageCircle, Truck, ShieldCheck, Sparkles, Phone, MapPin, Instagram, Facebook } from "lucide-react";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = "9647832882348"; // 07832882348 with Iraq country code
const DELIVERY_FEE = 5000; // د.ع - flat fee for all Iraqi governorates

const formatPrice = (n) => Number(n).toLocaleString("en-US") + " د.ع";

// Session-level seed: changes on every page load/refresh
const SESSION_SEED = Math.floor(Math.random() * 100000) + Date.now();

// Deterministic per session, but different across page loads
const getSocialProof = (productId) => {
  let hash = SESSION_SEED;
  for (let i = 0; i < productId.length; i++) hash = (hash * 31 + productId.charCodeAt(i)) >>> 0;
  const qty = 3 + (hash % 22); // 3..24 pieces
  const hours = 6 + ((hash >>> 5) % 19); // 6..24 hours
  return { qty, hours };
};

// ============== CART CONTEXT ==============
const CartContext = createContext(null);
const useCart = () => useContext(CartContext);

const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("bp_cart") || "[]");
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bp_wishlist") || "[]");
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("bp_cart", JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem("bp_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, qty, free_delivery: !!product.free_delivery }];
    });
    setIsCartOpen(true);
  };
  const removeFromCart = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };
  const clearCart = () => setItems([]);
  const toggleWishlist = (productId) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);
  // Free delivery if cart is non-empty AND every item has free_delivery flag
  const deliveryFee = items.length > 0 && items.every((i) => i.free_delivery) ? 0 : DELIVERY_FEE;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalQty, totalPrice, deliveryFee, isCartOpen, setIsCartOpen, wishlist, toggleWishlist }}>
      {children}
    </CartContext.Provider>
  );
};

// ============== HEADER ==============
const Header = () => {
  const { totalQty, setIsCartOpen, wishlist } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ("");
    }
  };

  const navLinks = [
    { name: "العروض", to: "/collection/offers" },
    { name: "الأكثر طلباً", to: "/collection/best-selling" },
  ];

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-[#e91e63] text-white text-center text-xs sm:text-sm py-2 px-4 overflow-hidden">
        <div className="marquee whitespace-nowrap">
          🚚 توصيل لكافة محافظات العراق بـ 5,000 د.ع فقط &nbsp; • &nbsp; ✨ منتجات أصلية 100% &nbsp; • &nbsp; 💕 اطلبي الحين عبر واتساب &nbsp; •
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-pink-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-gray-700 hover:text-pink-600" data-testid="mobile-menu-toggle">
              <Menu size={26} />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-[#e91e63]">كليشة</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-7 text-[15px] font-medium text-gray-700">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className="hover:text-pink-600 transition" data-testid={`nav-${l.to.split('/').pop()}`}>
                  {l.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3 sm:gap-5">
              <button onClick={() => setSearchOpen(true)} className="text-gray-700 hover:text-pink-600" data-testid="search-toggle">
                <Search size={22} />
              </button>
              <Link to="/wishlist" className="text-gray-700 hover:text-pink-600 relative" data-testid="wishlist-link">
                <Heart size={22} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{wishlist.length}</span>
                )}
              </Link>
              <button onClick={() => setIsCartOpen(true)} className="text-gray-700 hover:text-pink-600 relative" data-testid="cart-toggle">
                <ShoppingBag size={22} />
                {totalQty > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold" data-testid="cart-count">{totalQty}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <div className="absolute top-full inset-x-0 bg-white border-b border-pink-100 shadow-lg p-4">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="ابحثي عن منتج..."
                className="flex-1 outline-none text-base bg-transparent py-2"
                data-testid="search-input"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-gray-500" data-testid="search-close">
                <X size={20} />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-0 right-0 h-full w-80 max-w-[85%] bg-white p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-extrabold text-[#e91e63]">كليشة</span>
              <button onClick={() => setMenuOpen(false)} data-testid="mobile-menu-close"><X size={24} /></button>
            </div>
            <nav className="flex flex-col gap-1 text-base">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="py-3 border-b border-pink-50 hover:text-pink-600">{l.name}</Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

// ============== CART DRAWER ==============
const CartDrawer = () => {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, updateQty, totalPrice, deliveryFee } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsCartOpen(false)}>
      <div className="absolute top-0 left-0 h-full w-[420px] max-w-[92%] bg-white flex flex-col" onClick={(e) => e.stopPropagation()} data-testid="cart-drawer">
        <div className="flex items-center justify-between p-5 border-b border-pink-100">
          <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingBag size={20} className="text-pink-600" /> سلة التسوق ({items.length})</h3>
          <button onClick={() => setIsCartOpen(false)} data-testid="cart-close"><X size={22} /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 px-6 text-center">
            <ShoppingBag size={56} className="text-pink-200 mb-4" />
            <p className="text-lg font-medium mb-1">سلتج فارغة</p>
            <p className="text-sm text-gray-400 mb-6">اكتشفي منتجاتنا المميزة وأضيفيها لسلتج</p>
            <button onClick={() => { setIsCartOpen(false); navigate("/"); }} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-full font-medium" data-testid="cart-shop-btn">
              تسوقي الآن
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 pb-4 border-b border-pink-50" data-testid={`cart-item-${item.id}`}>
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-pink-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 text-gray-800 mb-1">{item.name}</p>
                    <p className="text-pink-600 font-bold text-sm mb-2">{formatPrice(item.price)}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-pink-200 rounded-full">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="px-2 py-1 hover:bg-pink-50 rounded-full" data-testid={`qty-minus-${item.id}`}><Minus size={14} /></button>
                        <span className="px-3 text-sm font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="px-2 py-1 hover:bg-pink-50 rounded-full" data-testid={`qty-plus-${item.id}`}><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500" data-testid={`remove-${item.id}`}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-pink-100 p-5 bg-pink-50/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600">المجموع</span>
                <span className="text-2xl font-extrabold text-pink-600" data-testid="cart-total">{formatPrice(totalPrice)}</span>
              </div>
              <button
                onClick={() => { setIsCartOpen(false); navigate("/checkout"); }}
                className="w-full bg-[#e91e63] hover:bg-pink-700 text-white py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition"
                data-testid="checkout-btn"
              >
                <MessageCircle size={20} /> إتمام الطلب عبر واتساب
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                {deliveryFee === 0 ? "🎉 توصيل مجاني لهذا الطلب" : `+ ${formatPrice(deliveryFee)} رسوم توصيل لكافة المحافظات`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============== PRODUCT CARD ==============
const ProductCard = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist } = useCart();
  const isWish = wishlist.includes(product.id);
  const hasDiscount = product.sale_price && product.sale_price > product.price;
  const isFreeNoWhatsApp = product.no_whatsapp === true;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-pink-50 hover:border-pink-200 hover:shadow-xl transition-all duration-300" data-testid={`product-card-${product.id}`}>
      {product.badge && (
        <div className="absolute top-3 right-3 z-10 bg-[#e91e63] text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {product.badge}
        </div>
      )}
      <button
        onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
        className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition ${isWish ? "bg-pink-600 text-white" : "bg-white/90 text-gray-600 hover:text-pink-600"}`}
        data-testid={`wishlist-btn-${product.id}`}
      >
        <Heart size={16} fill={isWish ? "currentColor" : "none"} />
      </button>

      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-square bg-gradient-to-br from-pink-50 to-rose-50 overflow-hidden">
          <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem] mb-2 hover:text-pink-600 transition" data-testid={`product-name-${product.id}`}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-pink-600 font-extrabold text-base">{isFreeNoWhatsApp ? "مجاني" : formatPrice(product.price)}</span>
          {hasDiscount && <span className="text-gray-400 line-through text-xs">{formatPrice(product.sale_price)}</span>}
        </div>
        {/* Social proof */}
        {!isFreeNoWhatsApp && (() => {
          const sp = getSocialProof(product.id);
          return (
            <div className="flex items-center gap-1 text-[11px] text-red-500 font-semibold mb-3 animate-pulse">
              <span>🔥</span>
              <span>تم شراء {sp.qty} قطعة في آخر {sp.hours} ساعة</span>
            </div>
          );
        })()}
        {isFreeNoWhatsApp ? (
          <Link
            to={`/product/${product.id}`}
            className="w-full bg-gray-900 hover:bg-pink-600 text-white py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            data-testid={`free-product-${product.id}`}
          >
            <Sparkles size={15} /> عرض الوصف المجاني
          </Link>
        ) : (
          <button
            onClick={() => addToCart(product)}
            className="w-full bg-gray-900 hover:bg-pink-600 text-white py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            data-testid={`add-to-cart-${product.id}`}
          >
            <ShoppingBag size={15} /> أضف إلى السلة
          </button>
        )}
      </div>
    </div>
  );
};

// ============== HERO SECTION ==============
const Hero = () => {
  const slides = [
    { img: "https://barbiephar.com/cdn/shop/files/2_6d2a305d-94d7-4512-867c-feb17cb5fff1.jpg?v=1778683647", link: "/collection/offers", title: "بلاك فرايدي", subtitle: "خصومات تصل لـ 52%" },
    { img: "https://barbiephar.com/cdn/shop/files/bshrtg-tdoy.jpg?v=1775080334&width=1100", link: "/product/offer-89", title: "بشرتج تضوي", subtitle: "مجموعة الحلزون" },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative aspect-[16/9] sm:aspect-[21/8] overflow-hidden">
          {slides.map((s, idx) => (
            <Link key={idx} to={s.link} className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}>
              <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-l from-pink-900/40 via-transparent to-transparent" />
            </Link>
          ))}
          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-pink-600" : "w-2 bg-white/70"}`} aria-label={`slide ${idx}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============== FEATURE STRIP ==============
const FeatureStrip = () => {
  const features = [
    { icon: Truck, title: "توصيل لكل العراق", desc: "5,000 د.ع لكافة المحافظات" },
    { icon: ShieldCheck, title: "منتجات أصلية", desc: "مضمونة 100% من المصدر" },
    { icon: Sparkles, title: "أكثر من 500,000", desc: "عميلة سعيدة" },
    { icon: MessageCircle, title: "استشارة مجانية", desc: "تواصلي عبر واتساب" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {features.map((f, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-pink-100 p-5 flex items-center gap-3 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
              <f.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-800">{f.title}</p>
              <p className="text-xs text-gray-500 line-clamp-1">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============== PRODUCT SECTION ==============
const ProductSection = ({ title, emoji, category, viewAllLink }) => {
  const [products, setProducts] = useState(() => staticData.products.filter((product) => product.category === category).slice(0, 10));
  useEffect(() => {
    axios.get(`${API}/products?category=${category}&limit=10`).then((r) => setProducts(r.data)).catch(() => {});
  }, [category]);

  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          {title} <span className="text-pink-500">{emoji}</span>
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-pink-600 hover:text-pink-700 text-sm font-semibold flex items-center gap-1" data-testid={`view-all-${category}`}>
            عرض الكل <ChevronLeft size={16} />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
        {products.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

// ============== CATEGORIES SECTION ==============
const CategoriesSection = () => {
  const [cats, setCats] = useState(staticData.categories);
  useEffect(() => {
    axios.get(`${API}/categories`).then((r) => setCats(r.data)).catch(() => {});
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">اختاري روتينج</h2>
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {cats.map((c) => (
          <Link key={c.id} to={`/collection/category-${c.slug}`} className="group text-center" data-testid={`category-${c.slug}`}>
            <div className="aspect-square bg-gradient-to-br from-pink-50 to-rose-100 rounded-2xl overflow-hidden mb-2 group-hover:shadow-lg transition">
              <img src={c.image} alt={c.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-pink-600">{c.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ============== SKIN TYPES SECTION ==============
const SkinTypesSection = () => {
  const [types, setTypes] = useState(staticData.skinTypes);
  useEffect(() => {
    axios.get(`${API}/skin-types`).then((r) => setTypes(r.data)).catch(() => {});
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">تسوقي حسب نوع بشرتج</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {types.map((t) => (
          <Link key={t.id} to={`/collection/skin-${t.id}`} className="group text-center" data-testid={`skin-type-${t.id}`}>
            <div className="aspect-square rounded-2xl overflow-hidden mb-2 relative group-hover:shadow-lg transition">
              <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/60 to-transparent" />
              <p className="absolute bottom-3 inset-x-0 text-white font-bold text-sm">{t.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ============== HOME ==============
const Home = () => {
  const [count, setCount] = useState(staticData.products.length);
  useEffect(() => {
    axios.get(`${API}/products?limit=1`).then((r) => setCount(r.data.length)).catch(() => setCount(0));
  }, []);

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-5">🌸</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">قريباً منتجات جديدة!</h2>
        <p className="text-gray-500 mb-6">نعمل على إضافة منتجاتنا المميزة - تابعونا قريباً 💕</p>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold transition"
        >
          <MessageCircle size={20} /> تواصلي معنا عبر واتساب
        </a>
      </div>
    );
  }

  return (
    <>
      <ProductSection title="الأكثر طلباً" emoji="⭐" category="best-selling" viewAllLink="/collection/best-selling" />
      <ProductSection title="عرض حصري" emoji="💎" category="offers" viewAllLink="/collection/offers" />
    </>
  );
};

// ============== COLLECTION PAGE ==============
const Collection = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const titles = {
    offers: "العروض الحصرية 💎",
    "last-chance": "فرصتج الأخيرة ⏰",
    "best-selling": "الأكثر طلباً ⭐",
    perfumes: "العطور 🌸",
    makeup: "المكياج 💄",
  };

  useEffect(() => {
    setLoading(true);
    let url;
    if (slug.startsWith("skin-")) {
      url = `${API}/products?skin_type=${slug.replace("skin-", "")}&limit=100`;
    } else if (slug.startsWith("category-")) {
      url = `${API}/products?category=${slug.replace("category-", "")}&limit=100`;
    } else {
      url = `${API}/products?category=${slug}&limit=100`;
    }
    axios.get(url).then((r) => { setProducts(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  const title = titles[slug] || "المنتجات";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2" data-testid="collection-title">{title}</h1>
      <p className="text-gray-500 mb-8">{products.length} منتج</p>

      {loading ? (
        <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">لا توجد منتجات في هذه الفئة حالياً</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

// ============== SEARCH PAGE ==============
const SearchPage = () => {
  const { search } = useLocation();
  const q = new URLSearchParams(search).get("q") || "";
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get(`${API}/products?search=${encodeURIComponent(q)}`).then((r) => setProducts(r.data)).catch(() => {});
  }, [q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">نتائج البحث: &quot;{q}&quot;</h1>
      <p className="text-gray-500 mb-8">{products.length} منتج</p>
      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">لم نجد منتجات تطابق بحثج. جربي كلمة أخرى.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

// ============== PRODUCT DETAIL ==============
const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const { addToCart, wishlist, toggleWishlist } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/products/${id}`)
      .then((r) => {
        setProduct(r.data);
        axios.get(`${API}/products?category=${r.data.category}&limit=10`).then((res) => setRelated(res.data.filter((p) => p.id !== id)));
      })
      .catch(() => navigate("/"));
    setQty(1);
    window.scrollTo(0, 0);
  }, [id, navigate]);

  if (!product) return <div className="py-20 text-center text-gray-500">جاري التحميل...</div>;

  const hasDiscount = product.sale_price && product.sale_price > product.price;
  const isWish = wishlist.includes(product.id);
  const isFreeNoWhatsApp = product.no_whatsapp === true;
  const copyDescription = async () => {
    try {
      await navigator.clipboard.writeText(product.description || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-contain aspect-square" data-testid="product-detail-image" />
        </div>
        <div className="flex flex-col">
          {product.badge && <span className="self-start bg-[#e91e63] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">{product.badge}</span>}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3" data-testid="product-detail-name">{product.name}</h1>
          {product.brand && <p className="text-pink-600 font-semibold mb-4">العلامة التجارية: {product.brand}</p>}

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-extrabold text-pink-600">{isFreeNoWhatsApp ? "مجاني" : formatPrice(product.price)}</span>
            {hasDiscount && <span className="text-gray-400 line-through text-lg">{formatPrice(product.sale_price)}</span>}
          </div>
          {/* Social proof banner */}
          {!isFreeNoWhatsApp && (() => {
            const sp = getSocialProof(product.id);
            return (
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-sm font-bold px-3 py-2 rounded-full mb-6 animate-pulse w-fit">
                <span className="text-base">🔥</span>
                <span>تم شراء {sp.qty} قطعة في آخر {sp.hours} ساعة</span>
              </div>
            );
          })()}

          {product.description && <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>}

          {isFreeNoWhatsApp ? (
            <div className="mb-6">
              <button onClick={copyDescription} className="w-full bg-[#e91e63] hover:bg-pink-700 text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 transition" data-testid="copy-free-description">
                <Sparkles size={20} /> {copied ? "تم نسخ الوصف" : "نسخ وصف التصميم مجاناً"}
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">هذا المنتج مجاني ولا يحوّلك إلى واتساب.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="font-semibold">الكمية:</span>
                <div className="flex items-center border-2 border-pink-200 rounded-full">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-pink-50 rounded-r-full" data-testid="detail-qty-minus"><Minus size={16} /></button>
                  <span className="px-5 font-bold">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="px-3 py-2 hover:bg-pink-50 rounded-l-full" data-testid="detail-qty-plus"><Plus size={16} /></button>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <button onClick={() => addToCart(product, qty)} className="flex-1 bg-[#e91e63] hover:bg-pink-700 text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 transition" data-testid="detail-add-cart">
                  <ShoppingBag size={20} /> أضيفي إلى السلة
                </button>
                <button onClick={() => toggleWishlist(product.id)} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isWish ? "bg-pink-600 text-white" : "border-2 border-pink-200 text-pink-600 hover:bg-pink-50"}`} data-testid="detail-wishlist">
                  <Heart size={20} fill={isWish ? "currentColor" : "none"} />
                </button>
              </div>
            </>
          )}

          <div className="border-t border-pink-100 pt-5 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700"><Truck size={18} className="text-pink-600" /> توصيل لكافة محافظات العراق بـ 5,000 د.ع</div>
            <div className="flex items-center gap-2 text-gray-700"><ShieldCheck size={18} className="text-pink-600" /> منتج أصلي 100% مضمون</div>
            {isFreeNoWhatsApp ? (
              <div className="flex items-center gap-2 text-gray-700"><Sparkles size={18} className="text-pink-600" /> انسخي الوصف واستخدميه مجاناً</div>
            ) : (
              <div className="flex items-center gap-2 text-gray-700"><MessageCircle size={18} className="text-pink-600" /> استشارة مجانية عبر واتساب</div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {related.slice(0, 5).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== WISHLIST PAGE ==============
const WishlistPage = () => {
  const { wishlist } = useCart();
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (wishlist.length === 0) return setProducts([]);
    Promise.all(wishlist.map((id) => axios.get(`${API}/products/${id}`).then((r) => r.data).catch(() => null)))
      .then((res) => setProducts(res.filter(Boolean)));
  }, [wishlist]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">قائمة الرغبات</h1>
      <p className="text-gray-500 mb-8">{products.length} منتج</p>
      {products.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={60} className="text-pink-200 mx-auto mb-4" />
          <p className="text-lg text-gray-500 mb-6">قائمة رغباتج فارغة</p>
          <Link to="/" className="bg-pink-600 text-white px-6 py-3 rounded-full font-semibold inline-block">تسوقي الآن</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

// ============== CHECKOUT (WhatsApp redirect) ==============
const Checkout = () => {
  const { items, totalPrice, clearCart, deliveryFee } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "", notes: "" });
  const [sent, setSent] = useState(false);
  const isKidsVideoOnly = items.length > 0 && items.every((item) => item.id === "kids-video-design");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    const grandTotal = totalPrice + deliveryFee;
    const deliveryLine = deliveryFee === 0
      ? "🚚 التوصيل: مجاني 🎉"
      : `🚚 التوصيل (كل المحافظات): ${formatPrice(deliveryFee)}`;
    const lines = [
      "🌸 طلب جديد - كليشة 🌸",
      "━━━━━━━━━━━━━━━",
      "",
      "👤 بيانات الزبونة",
      `• الاسم: ${form.name || "غير مذكور"}`,
      `• الهاتف: ${form.phone || "غير مذكور"}`,
      `• المحافظة: ${form.city || "غير مذكور"}`,
      `• العنوان: ${form.address || "غير مذكور"}`,
      form.notes ? `• ملاحظات: ${form.notes}` : null,
      "",
      "━━━━━━━━━━━━━━━",
      "🛍️ تفاصيل الطلب",
      "",
      ...items.map((i, idx) => `${idx + 1}) ${i.name}\n     ${i.qty} × ${formatPrice(i.price)}  =  ${formatPrice(i.price * i.qty)}`),
      "",
      "━━━━━━━━━━━━━━━",
      `🧾 مجموع المنتجات: ${formatPrice(totalPrice)}`,
      deliveryLine,
      `💰 المبلغ الإجمالي: ${formatPrice(grandTotal)}`,
      "━━━━━━━━━━━━━━━",
      "",
      "شكراً لطلبكم 💕"
    ].filter(Boolean).join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;
    setSent(true);
    setTimeout(() => {
      window.open(url, "_blank");
      clearCart();
      navigate("/");
    }, 600);
  };

  if (items.length === 0 && !sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={60} className="text-pink-200 mx-auto mb-4" />
        <p className="text-lg text-gray-600 mb-6">سلتج فارغة، أضيفي منتجات أولاً</p>
        <Link to="/" className="bg-pink-600 text-white px-6 py-3 rounded-full font-semibold inline-block">تسوقي الآن</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">إتمام الطلب</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 space-y-5" data-testid="checkout-form">
          <h2 className="text-xl font-bold text-gray-800 mb-4">معلومات التوصيل</h2>
          {isKidsVideoOnly && (
            <p className="text-sm text-pink-600 bg-pink-50 rounded-xl p-3">طلب فيديو الأطفال لا يحتاج تعبئة البيانات؛ جميع الحقول أدناه اختيارية.</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل {isKidsVideoOnly ? "(اختياري)" : "*"}</label>
            <input required={!isKidsVideoOnly} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: زينب أحمد" className="w-full border-2 border-pink-100 focus:border-pink-400 outline-none rounded-xl px-4 py-3" data-testid="checkout-name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف {isKidsVideoOnly ? "(اختياري)" : "*"}</label>
            <input required={!isKidsVideoOnly} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xxxxxxxxx" type="tel" className="w-full border-2 border-pink-100 focus:border-pink-400 outline-none rounded-xl px-4 py-3" data-testid="checkout-phone" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">المحافظة {isKidsVideoOnly ? "(اختياري)" : "*"}</label>
            <select required={!isKidsVideoOnly} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border-2 border-pink-100 focus:border-pink-400 outline-none rounded-xl px-4 py-3 bg-white" data-testid="checkout-city">
              <option value="">اختاري المحافظة</option>
              {["بغداد", "البصرة", "أربيل", "الموصل", "النجف", "كربلاء", "السليمانية", "كركوك", "بابل", "الأنبار", "ذي قار", "ديالى", "صلاح الدين", "ميسان", "واسط", "القادسية", "المثنى", "دهوك"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان التفصيلي {isKidsVideoOnly ? "(اختياري)" : "*"}</label>
            <input required={!isKidsVideoOnly} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="الحي، الشارع، أقرب نقطة دالة" className="w-full border-2 border-pink-100 focus:border-pink-400 outline-none rounded-xl px-4 py-3" data-testid="checkout-address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات (اختياري)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="أي ملاحظات إضافية على طلبج..." className="w-full border-2 border-pink-100 focus:border-pink-400 outline-none rounded-xl px-4 py-3 resize-none" data-testid="checkout-notes" />
          </div>

          <button type="submit" disabled={sent} className="w-full bg-[#25d366] hover:bg-green-600 disabled:opacity-60 text-white py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition" data-testid="submit-order">
            <MessageCircle size={22} /> {sent ? "جاري التوجيه..." : "إرسال الطلب عبر واتساب"}
          </button>
          <p className="text-center text-xs text-gray-500">سيتم تحويلج لواتساب لإكمال الطلب مع تأكيد التفاصيل</p>
        </form>

        <aside className="bg-pink-50/50 rounded-3xl border border-pink-100 p-6 h-fit lg:sticky lg:top-28">
          <h2 className="text-xl font-bold text-gray-800 mb-5">ملخص الطلب</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-5">
            {items.map((i) => (
              <div key={i.id} className="flex gap-3 items-start">
                <img src={i.image} alt={i.name} className="w-14 h-14 rounded-lg object-cover bg-white" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2">{i.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{i.qty} × {formatPrice(i.price)}</p>
                </div>
                <p className="text-sm font-bold text-pink-600">{formatPrice(i.price * i.qty)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-pink-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>مجموع المنتجات</span><span>{formatPrice(totalPrice)}</span></div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>التوصيل</span>
              {deliveryFee === 0 ? (
                <span className="text-green-600 font-bold">مجاني 🎉</span>
              ) : (
                <span>{formatPrice(deliveryFee)}</span>
              )}
            </div>
            <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-pink-200"><span>المبلغ الإجمالي</span><span className="text-pink-600" data-testid="checkout-total">{formatPrice(totalPrice + deliveryFee)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ============== FOOTER ==============
const Footer = () => (
  <footer className="bg-gradient-to-br from-pink-900 via-rose-900 to-pink-950 text-pink-100 mt-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      <h3 className="text-3xl font-extrabold mb-3"><span className="text-pink-300">كليشة</span></h3>
      <p className="text-pink-200/80 text-sm max-w-xl mx-auto mb-6">براند مميز لمنتجات العناية بالبشرة في العراق - منتجات مضمونة وتوصيل سريع 💕</p>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition"
      >
        <MessageCircle size={18} /> تواصلي عبر واتساب
      </a>
      <div className="border-t border-pink-800/50 mt-8 pt-6 text-sm text-pink-300/70">
        © 2026 كليشة - جميع الحقوق محفوظة
      </div>
    </div>
  </footer>
);

// ============== FLOATING WHATSAPP ==============
const FloatingWhatsApp = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}`}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-[#25d366] hover:bg-green-600 text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
    data-testid="floating-whatsapp"
  >
    <MessageCircle size={26} />
  </a>
);

// ============== APP ==============
function App() {
  return (
    <CartProvider>
      <HashRouter>
        <div dir="rtl" className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/collection/:slug" element={<Collection />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<Checkout />} />
            </Routes>
          </main>
          <Footer />
          <CartDrawer />
          <FloatingWhatsApp />
        </div>
      </HashRouter>
    </CartProvider>
  );
}

export default App;
