import data from "./staticData.json";

const normalize = (value) => String(value || "").trim().toLowerCase();

const filterProducts = (params = {}) => {
  let result = [...data.products];
  const category = normalize(params.category);
  const skinType = normalize(params.skin_type);
  const search = normalize(params.search);
  if (category) result = result.filter((product) => normalize(product.category) === category);
  if (skinType) result = result.filter((product) => (product.skin_type || []).map(normalize).includes(skinType));
  if (search) {
    result = result.filter((product) => [product.name, product.name_en, product.description, product.brand]
      .map(normalize)
      .some((field) => field.includes(search)));
  }
  const limit = Number(params.limit);
  return Number.isFinite(limit) && limit > 0 ? result.slice(0, limit) : result;
};

const parseUrl = (requestUrl) => {
  const parsed = new URL(requestUrl, window.location.origin);
  const path = parsed.pathname.replace(/^.*\/api\/?/, "");
  return { path, params: Object.fromEntries(parsed.searchParams.entries()) };
};

const get = async (requestUrl) => {
  const { path, params } = parseUrl(requestUrl);
  if (path === "products") return { data: filterProducts(params) };
  if (path.startsWith("products/")) {
    const product = data.products.find((item) => item.id === path.slice("products/".length));
    if (!product) throw new Error("Product not found");
    return { data: product };
  }
  if (path === "categories") return { data: data.categories };
  if (path === "skin-types") return { data: data.skinTypes };
  throw new Error(`Unsupported local API path: ${path}`);
};

const localAxios = { get };
export default localAxios;
