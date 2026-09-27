import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import { api, writeApi } from './storeApi';
jest.mock('./storeApi', () => ({ STATIC_MODE: false, api: jest.fn(), writeApi: jest.fn() }));
let catalog;
const initialProduct = { id:'sample',name:'منتج اختبار',description:'وصف المنتج',price:12000,category:'custom',image:'/images/trend-80.webp',active:true,free_delivery:false,no_whatsapp:false };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); window.location.hash = '#/';
  catalog = { settings:{store_name:'متجري',whatsapp_number:'9647000000000',delivery_fee:5000,announcement:'أهلاً',google_maps_api_key:''}, categories:[{id:'custom',slug:'custom',name:'قسم مخصص',product_count:1,sort_order:0}],products:[initialProduct] };
  api.mockImplementation(async path => {
    if(path === '/settings') return catalog.settings;
    if(path === '/categories') return catalog.categories;
    if(path === '/admin/session') return {username:'admin'};
    if(path === '/admin/catalog') return JSON.parse(JSON.stringify(catalog));
    if(path.startsWith('/products')) return catalog.products;
    throw new Error('Unexpected path '+path);
  });
  writeApi.mockImplementation(async (path,method,body) => {
    if(path === '/admin/products' && method === 'POST') {const created={...body,id:'created'};catalog.products.push(created);return created;}
    if(path === '/orders') return {id:body.id,items:[{...initialProduct,qty:1}],subtotal:12000,delivery_fee:5000,total:17000,whatsapp_number:catalog.settings.whatsapp_number,store_name:catalog.settings.store_name};
    return {ok:true};
  });
});
afterEach(cleanup);
test('storefront uses real categories and does not restore static products',async()=>{
  render(<App/>);await screen.findByText('منتج اختبار');
  expect(screen.getAllByText('قسم مخصص').length).toBeGreaterThan(0);
  expect(screen.queryByText('ترند 80')).toBeNull();
  expect(screen.getByTestId('logo-link').textContent).toBe('متجري');
});
test('admin can create a product and immediately see the saved result',async()=>{
  window.location.hash='#/admin';render(<App/>);
  await screen.findByRole('button',{name:'إضافة منتج'});
  await waitFor(()=>expect(screen.getByRole('button',{name:'إضافة منتج'}).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'إضافة منتج'}));
  fireEvent.change(screen.getByLabelText('اسم المنتج'),{target:{value:'منتج جديد'}});
  fireEvent.change(screen.getByLabelText('السعر بالدينار'),{target:{value:'25000'}});
  fireEvent.click(screen.getByRole('button',{name:'حفظ المنتج'}));
  await screen.findByText('تم حفظ المنتج');
  expect(screen.getByText('منتج جديد')).toBeTruthy();expect(screen.queryByRole('dialog')).toBeNull();
  expect(writeApi).toHaveBeenCalledWith('/admin/products','POST',expect.objectContaining({name:'منتج جديد',price:25000,category:'custom'}));
});
test('checkout permits no location without asking for geolocation permission',async()=>{
  const getCurrentPosition=jest.fn();Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition},configurable:true});
  localStorage.setItem('tokkma_cart',JSON.stringify([{...initialProduct,qty:1}]));window.location.hash='#/checkout';render(<App/>);
  await screen.findByText('موقع التوصيل على الخريطة (اختياري)');expect(getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.change(screen.getByTestId('checkout-name'),{target:{value:'زبون'}});
  fireEvent.change(screen.getByTestId('checkout-phone'),{target:{value:'07000000000'}});
  fireEvent.change(screen.getByTestId('checkout-city'),{target:{value:'بغداد'}});
  fireEvent.change(screen.getByTestId('checkout-address'),{target:{value:'عنوان اختبار'}});
  fireEvent.submit(screen.getByTestId('checkout-form'));await screen.findByText('تم حفظ طلبك');
  expect(writeApi).toHaveBeenCalledWith('/orders','POST',expect.objectContaining({location:null,maps_url:'',items:[{id:'sample',qty:1}]}));
  expect(screen.getByRole('link',{name:'فتح واتساب لتأكيد الطلب'}).getAttribute('href')).toContain('https://wa.me/9647000000000');expect(getCurrentPosition).not.toHaveBeenCalled();
});
test('optional Google Maps link can be removed',async()=>{
  localStorage.setItem('tokkma_cart',JSON.stringify([{...initialProduct,qty:1}]));window.location.hash='#/checkout';render(<App/>);
  const link=await screen.findByLabelText('أو الصق رابط الموقع من Google Maps ← مشاركة ← نسخ الرابط');
  fireEvent.change(link,{target:{value:'https://evil.test/maps'}});expect(screen.getByText(/استخدم رابط مشاركة صحيحاً/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'إزالة الموقع'}));await waitFor(()=>expect(link.value).toBe(''));expect(screen.queryByText(/استخدم رابط مشاركة صحيحاً/)).toBeNull();
});
