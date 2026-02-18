/**
 * Base templates for different site types to give agents a head start.
 * Each template suggests a richer file structure so agents create
 * more than just 3 files — resulting in better-organized, more complete websites.
 */

export function getBaseTemplate(siteType, config) {
  const templates = {
    landing: getLandingTemplate(config),
    portfolio: getPortfolioTemplate(config),
    blog: getBlogTemplate(config),
    ecommerce: getEcommerceTemplate(config),
    dashboard: getDashboardTemplate(config),
    custom: getCustomTemplate(config),
  }

  return templates[siteType] || templates.landing
}

function getLandingTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'css/animations.css',
      'js/main.js',
      'js/animations.js',
    ],
    sections: [
      'hero — full-viewport opening with headline, sub-copy, and CTA buttons',
      'logo-bar — trusted-by / as-seen-in logo strip',
      'features — 3-4 cards with icons, titles, descriptions',
      'how-it-works — 3-step process with numbered steps or timeline',
      'testimonials — 2-3 real customer quotes with names and roles',
      'pricing — 2-3 tiered plans with feature comparison',
      'faq — expandable accordion with 5-6 common questions',
      'final-cta — bold conversion section before footer',
      'footer — links, social icons, copyright, legal links',
    ],
    components: ['navbar', 'hero-section', 'logo-bar', 'feature-cards', 'step-cards', 'testimonial-cards', 'pricing-table', 'faq-accordion', 'cta-banner', 'contact-form', 'footer'],
    description: 'High-converting marketing landing page. Think Stripe, Linear, or Vercel homepage quality. Smooth scroll, parallax-like sections, bold typography, clear visual hierarchy. Every section serves a purpose in the conversion funnel: attention → interest → trust → action.',
    designGuidance: `
DESIGN PRINCIPLES:
- Generous whitespace (80-120px between sections minimum)
- One hero font size that commands attention (clamp(2.5rem, 5vw, 4.5rem))
- Subtle background textures or gradients to break up flat sections
- Cards with soft shadows and hover lift effects
- Consistent 8px spacing grid
- Primary color used sparingly — only on CTAs and key accents
- Section backgrounds alternate between white/off-white/tinted to create rhythm
- Typography: pair a bold display font with a clean body font`,
  }
}

function getPortfolioTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'css/animations.css',
      'js/main.js',
      'js/animations.js',
    ],
    sections: [
      'hero — dramatic intro with name, title, and a bold visual statement',
      'about — personal story, photo, and what makes you unique',
      'work — project grid with thumbnails, hover overlays showing project details',
      'services — what you offer, with clear value propositions',
      'skills — visual skill representation (bars, tags, or creative layout)',
      'testimonials — client quotes with attribution',
      'contact — form + direct contact info + social links',
      'footer — minimal, clean footer',
    ],
    components: ['navbar', 'hero-section', 'about-section', 'project-card', 'project-modal', 'service-cards', 'skill-display', 'testimonial-slider', 'contact-form', 'footer'],
    description: 'Creative portfolio that showcases personality. Think award-winning designer portfolio — not a boring template. Subtle animations, magnetic cursor effects, smooth scroll transitions. The design IS the portfolio piece.',
    designGuidance: `
DESIGN PRINCIPLES:
- The portfolio itself must be impressive enough to be a portfolio piece
- Creative layout — break the grid occasionally for visual interest
- Project cards with rich hover states (scale, overlay, info reveal)
- Smooth page transitions and scroll-triggered animations
- Bold typography hierarchy: massive display headings, elegant body text
- Dark mode works exceptionally well for portfolios
- Minimal UI chrome — let the work speak
- Consider asymmetric layouts for visual tension`,
  }
}

function getBlogTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'js/main.js',
    ],
    sections: [
      'header — clean navigation with logo, category links, search, dark mode toggle',
      'featured-post — large hero card for the top article with image, title, excerpt, author',
      'post-grid — 4-6 article cards in responsive grid, each with image, category tag, title, date, read time',
      'categories — horizontal scrolling category pills/tags',
      'newsletter — email signup with compelling copy and social proof',
      'footer — about, categories, social links, legal',
    ],
    components: ['navbar', 'featured-card', 'post-card', 'category-pills', 'newsletter-form', 'author-chip', 'footer'],
    description: 'Clean, readable blog focused on typography and content hierarchy. Think Medium meets Substack. Excellent reading experience, clear information hierarchy, easy navigation between content.',
    designGuidance: `
DESIGN PRINCIPLES:
- Typography is KING — use a beautiful serif or readable sans-serif for body
- Line length 60-75 characters for readability
- Generous line-height (1.6-1.8 for body text)
- Subtle category color coding
- Card hover states that invite clicking
- Clean whitespace around content blocks
- Image aspect ratios consistent across cards`,
  }
}

function getEcommerceTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'js/main.js',
      'js/cart.js',
    ],
    sections: [
      'announcement-bar — shipping info, current promo, or trust signal',
      'navbar — logo, categories, search bar, cart icon with count, account link',
      'hero — seasonal campaign or featured collection with lifestyle imagery description',
      'categories — visual category grid with hover effects',
      'featured-products — 4-8 product cards with image, name, price, rating, add-to-cart',
      'promo-banner — mid-page promotional section (sale, new arrival, etc.)',
      'reviews — customer testimonials with star ratings',
      'trust-signals — shipping, returns, payment icons, guarantees',
      'footer — shop links, customer service, social, payment method icons',
    ],
    components: ['announcement-bar', 'navbar', 'hero-banner', 'category-card', 'product-card', 'star-rating', 'cart-drawer', 'promo-banner', 'trust-badges', 'newsletter-popup', 'footer'],
    description: 'Premium e-commerce experience. Think Shopify premium theme quality — clean product presentation, smooth cart interactions, trust-building elements throughout. Every detail builds buying confidence.',
    designGuidance: `
DESIGN PRINCIPLES:
- Product images are hero — large, clean, consistent aspect ratios
- Price typography should be bold and unmistakable
- Add-to-cart buttons need strong visual weight
- Cart drawer/modal with smooth slide-in animation
- Trust signals (free shipping, easy returns) visible throughout
- Subtle product card hover effects (image zoom, shadow lift)
- Clean product grid with consistent spacing
- Original and sale prices with crossed-out styling`,
  }
}

function getDashboardTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'js/main.js',
      'js/charts.js',
    ],
    sections: [
      'sidebar — collapsible nav with icons, sections, active states, user avatar at bottom',
      'topbar — breadcrumbs, search, notifications bell, user menu',
      'metrics-row — 4 KPI cards with values, trends (up/down arrows), and sparklines',
      'charts — 2 chart containers (line chart + bar chart) with tab controls',
      'recent-activity — activity feed or transaction list with avatars and timestamps',
      'data-table — sortable table with pagination, status badges, actions column',
    ],
    components: ['sidebar-nav', 'topbar', 'metric-card', 'chart-container', 'activity-feed', 'data-table', 'status-badge', 'user-menu', 'notification-bell'],
    description: 'Professional admin dashboard. Think Linear or Vercel dashboard — clean data presentation, purposeful density, excellent information hierarchy. Dark sidebar with light content area, or full dark mode.',
    designGuidance: `
DESIGN PRINCIPLES:
- Information density done right — compact but not cramped
- Consistent card elevation system (flat, raised, floating)
- Status badges with semantic colors (green=active, yellow=pending, red=error)
- Table rows with subtle hover highlight
- Sidebar with clear active state and section grouping
- KPI cards with trend indicators (green up arrow, red down arrow)
- Monospace font for numbers/data for alignment
- Subtle grid lines in charts and tables`,
  }
}

function getCustomTemplate(config) {
  return {
    files: [
      'index.html',
      'css/styles.css',
      'js/main.js',
    ],
    sections: [
      'header — navigation with logo and links',
      'hero — main visual statement matching the brief',
      'content sections — as described in the brief',
      'footer — contact info, links, copyright',
    ],
    components: ['navbar', 'hero-section', 'content-sections', 'contact-form', 'footer'],
    description: 'Custom website tailored to the user brief. Read the brief carefully and design the structure around what they actually need. When in doubt, look at the best examples in the industry the brief describes.',
    designGuidance: `
DESIGN PRINCIPLES:
- Match the tone of the brief — corporate = clean and professional, creative = bold and expressive
- Generous whitespace, clear visual hierarchy
- Responsive from the start
- Every section must earn its place on the page`,
  }
}
