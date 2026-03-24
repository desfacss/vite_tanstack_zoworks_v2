// src/modules/shop/types/config.ts
// Tenant-configurable layout options for the Shop module.
// These are stored in `identity.organizations.app_settings.shop_config`
// and follow the same pattern as `timesheet_settings`, `expense_settings`, etc.

export interface ShopConfig {
  /** Header style: full (logo + nav + search + actions) or minimal */
  header_style?: 'full' | 'minimal';

  /** Home page hero: slideshow | static | none */
  hero_type?: 'slideshow' | 'static' | 'none';

  /** Hero banner text (overrides default) */
  hero_title?: string;
  hero_subtitle?: string;

  /** Product listing layout */
  plp_layout?: 'grid' | 'list';
  /** Columns in product grid: 2 | 3 | 4 */
  plp_columns?: 2 | 3 | 4;
  /** Filter position in PLP */
  plp_filter_position?: 'sidebar' | 'top' | 'none';
  /** Items per page */
  plp_per_page?: 12 | 24 | 48;
  /** Pagination style */
  plp_pagination?: 'numbered' | 'load_more' | 'infinite';
  /** Default sort option */
  plp_default_sort?: 'newest' | 'price_asc' | 'price_desc' | 'popularity';

  /** Product detail: image position */
  pdp_image_position?: 'left' | 'right';
  /** Show sticky "Add to Cart" on scroll */
  pdp_sticky_cta?: boolean;
  /** Tabs order on PDP */
  pdp_tabs?: Array<'description' | 'specs' | 'reviews' | 'faq'>;

  /** Cart: show product recommendations */
  cart_show_recommendations?: boolean;
  /** Free shipping threshold (₹). 0 = always paid */
  cart_free_shipping_threshold?: number;
  /** Tax rate % applied to orders */
  cart_tax_rate?: number;

  /** Which payment methods to show (UI mockup tabs) */
  checkout_payment_methods?: Array<'card' | 'upi' | 'netbanking' | 'cod' | 'wallet'>;
  /** Checkout: single_page or multi_step */
  checkout_type?: 'single_page' | 'multi_step';
  /** Allow guest checkout */
  checkout_allow_guest?: boolean;

  /** Features to show/hide */
  features?: {
    wishlist?: boolean;
    compare?: boolean;
    reviews?: boolean;
    booking?: boolean;
    search?: boolean;
  };

  /** Branding */
  store_name?: string;
  store_logo_url?: string;
  primary_color?: string; // Overrides --color-primary for the shop storefront

  /** Footer columns config */
  footer_links?: Array<{
    heading: string;
    links: Array<{ label: string; href: string }>;
  }>;
}

/** Default config — safe fallback for all tenants. */
export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  header_style: 'full',
  hero_type: 'static',
  hero_title: 'Discover Amazing Products',
  hero_subtitle: 'Services, digital goods, and physical products all in one place.',
  plp_layout: 'grid',
  plp_columns: 3,
  plp_filter_position: 'sidebar',
  plp_per_page: 24,
  plp_pagination: 'numbered',
  plp_default_sort: 'newest',
  pdp_image_position: 'left',
  pdp_sticky_cta: true,
  pdp_tabs: ['description', 'specs', 'reviews', 'faq'],
  cart_show_recommendations: true,
  cart_free_shipping_threshold: 999,
  cart_tax_rate: 18,
  checkout_payment_methods: ['card', 'upi', 'netbanking', 'cod'],
  checkout_type: 'single_page',
  checkout_allow_guest: true,
  features: {
    wishlist: true,
    compare: true,
    reviews: true,
    booking: true,
    search: true,
  },
  store_name: 'ZoWorks Shop',
};
