/**
 * Base templates for different site types to give agents a head start.
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
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['hero', 'features', 'testimonials', 'pricing', 'cta', 'footer'],
    components: ['navbar', 'hero-section', 'feature-cards', 'testimonial-grid', 'pricing-table', 'contact-form'],
    description: 'Marketing landing page with hero, features, social proof, and conversion sections',
  }
}

function getPortfolioTemplate(config) {
  return {
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['hero', 'about', 'work', 'skills', 'contact', 'footer'],
    components: ['navbar', 'hero-section', 'project-grid', 'skill-bars', 'contact-form'],
    description: 'Personal portfolio with hero, project showcase, skills, and contact',
  }
}

function getBlogTemplate(config) {
  return {
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['header', 'featured-post', 'post-grid', 'sidebar', 'newsletter', 'footer'],
    components: ['navbar', 'post-card', 'sidebar-widget', 'newsletter-form'],
    description: 'Blog homepage with featured post, article grid, and sidebar',
  }
}

function getEcommerceTemplate(config) {
  return {
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['navbar', 'hero', 'products', 'product-detail', 'cart', 'footer'],
    components: ['product-card', 'cart-modal', 'product-gallery', 'review-stars'],
    description: 'E-commerce page with product display, gallery, and cart interaction',
  }
}

function getDashboardTemplate(config) {
  return {
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['sidebar', 'topbar', 'metrics', 'charts', 'tables', 'notifications'],
    components: ['metric-card', 'chart-container', 'data-table', 'sidebar-nav'],
    description: 'Admin dashboard with sidebar navigation, metrics, and data tables',
  }
}

function getCustomTemplate(config) {
  return {
    files: ['index.html', 'css/styles.css', 'js/main.js'],
    sections: ['header', 'main', 'footer'],
    components: ['navbar', 'content-section'],
    description: 'Custom website based on user specifications',
  }
}
