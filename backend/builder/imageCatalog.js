/**
 * Stock image catalog for agents to use in generated websites.
 * Each image has a description, dimensions, and URL so agents can
 * pick contextually appropriate images for the brief.
 */

const IMAGE_CATALOG = [
  {
    id: 'family-1',
    description: 'Happy family with kids outdoors, warm natural lighting',
    tags: ['family', 'kids', 'people', 'outdoor', 'happy', 'lifestyle'],
    dimensions: '5184x3456',
    url: 'https://duckduckgo.com/?q=family+with+kids&ia=images&iax=images&iai=https%3A%2F%2Fjooinn.com%2Fimages%2Ffamily-30.jpg',
  },
  {
    id: 'family-2',
    description: 'Cute family portrait, warm tones, close-up',
    tags: ['family', 'kids', 'people', 'portrait', 'warm'],
    dimensions: '1500x1000',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwallpapers.com%2Fimages%2Fhd%2Fcute-family-pictures-sysrcgizypkcsze2.jpg&f=1&nofb=1&ipt=02fedbbd451287122e2a16776816a81202ea89cc693d758e17e75fb8bcec757f',
  },
  {
    id: 'family-3',
    description: 'Large family group portrait, professional studio shot',
    tags: ['family', 'kids', 'people', 'group', 'studio', 'professional'],
    dimensions: '3498x2798',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmorinstudio.com%2Fwp-content%2Fuploads%2Fchildren-family-portrait-008.jpg&f=1&nofb=1&ipt=c4bf27e3f8bfa049971398e267caa2a091c178e3f265e18ec2d6445fbc5ecbfb',
  },
  {
    id: 'bakery-employee',
    description: 'Smiling female bakery employee, friendly and professional',
    tags: ['bakery', 'food', 'employee', 'woman', 'smile', 'staff'],
    dimensions: '512x512',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages.stockcake.com%2Fpublic%2F6%2Fa%2F8%2F6a80c320-b1f4-42fc-bd45-4d5ed3446ca3_large%2Fbakery-staff-smiling-stockcake.jpg&f=1&nofb=1&ipt=74772859dd2cd74e0c97d40f0d4fbb53aeb261a13b2121986363096e50b5ad5f',
  },
  {
    id: 'bakery-team',
    description: 'Bakery team group photo, professional kitchen setting',
    tags: ['bakery', 'food', 'team', 'group', 'kitchen', 'staff'],
    dimensions: '1024x768',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fthemaverickobserver.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fbakery-staff-1024x768.jpg&f=1&nofb=1&ipt=3ac752c72f1422b83932a2f362b5de9e486a10603d30c0a1b0d4dc41ac1b7093',
  },
  {
    id: 'bakery-process',
    description: 'Hard work in bakery, bread making process, artisan',
    tags: ['bakery', 'food', 'process', 'artisan', 'bread', 'work'],
    dimensions: '2808x1872',
    url: 'https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fblog.tracksmart.com%2Fwp-content%2Fuploads%2F2011%2F05%2Fbakery-management-software.jpg&f=1&nofb=1&ipt=fcdcc348a87b964f0a6417abeb90637c5945af50dc1da6ed77d671ddac748138',
  },
  {
    id: 'professional-duo',
    description: 'Two diverse business professionals, office lobby, confident pose',
    tags: ['business', 'professional', 'team', 'office', 'corporate', 'diverse'],
    dimensions: '2940x1960',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F012%2F534%2F346%2Flarge_2x%2Ftwo-happy-diverse-professional-executive-business-team-people-woman-and-african-american-man-looking-at-camera-standing-in-office-lobby-hall-multicultural-company-managers-team-portrait-free-photo.jpg&f=1&nofb=1&ipt=ea064cb87800bbab90d59e61b611ada7b6695f97468ac5bf72a798ec8964a01a',
  },
  {
    id: 'corpo-gathering',
    description: 'Corporate workers at a gathering, multiple people, office event',
    tags: ['business', 'corporate', 'team', 'office', 'gathering', 'event'],
    dimensions: '1920x1080',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwallpaperaccess.com%2Ffull%2F1393547.jpg&f=1&nofb=1&ipt=dbeb8bb5a22a689f8c09655a6b358dbcbc1aedbc6fdd1ecc07468951f2c7fcc7',
  },
  {
    id: 'ceo-portrait',
    description: 'Professional male CEO/founder portrait, confident, suit, awards ceremony setting',
    tags: ['business', 'ceo', 'founder', 'portrait', 'professional', 'leader', 'male'],
    dimensions: '1500x1000',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.cvillechamber.com%2Fwp-content%2Fuploads%2Fsites%2F1926%2F2023%2F12%2FThe-Chamber-Presents_Best-in-Business-Awards-2023-44-46d77144-d7a6-4b25-a5a6-969c2ffc2e7d.jpg&f=1&nofb=1&ipt=52b497b8737c5db80cde87e165953168bffe542074eb30930dcffea09253522d',
  },
  {
    id: 'team-member-sitting',
    description: 'Professional team member sitting, casual work environment',
    tags: ['business', 'professional', 'person', 'casual', 'work'],
    dimensions: '1280x720',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmedia.licdn.com%2Fdms%2Fimage%2FD4D10AQEiTsx-63PAvw%2Fvideocover-high%2F0%2F1721923264009%3Fe%3D2147483647%26v%3Dbeta%26t%3DfiBnL6uuOljaPjrmms7AtDY5y8ZkBnp9i8I-QgA3uR4&f=1&nofb=1&ipt=8daa8bf574837c47619d3b52ea01639aa20a025d8f42952c81d4c0f5464a9f13',
  },
  {
    id: 'trustpilot-banner',
    description: 'Trustpilot 5-star reviews banner, transparent background, social proof',
    tags: ['trust', 'reviews', 'social-proof', 'banner', 'trustpilot', 'stars'],
    dimensions: '840x139',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.clipartmax.com%2Fpng%2Fmiddle%2F439-4394777_explore-wall-art-trustpilot-5-star-reviews.png&f=1&nofb=1&ipt=eda5da6d292d19c092bc95d17a9f7a2652da85d143ca82f589a9c5264238f521',
  },
  {
    id: 'it-team-talking',
    description: 'IT/informatics team members in discussion, tech office environment',
    tags: ['tech', 'it', 'team', 'office', 'discussion', 'developer'],
    dimensions: '1197x733',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.europeanbusinessreview.com%2Fwp-content%2Fuploads%2F2023%2F03%2FIT-Teams.jpeg&f=1&nofb=1&ipt=5fa515c0c1def1ce2a7895be53fac385768c79f814feaa22205120fd54993e56',
  },
  {
    id: 'seniors-phone',
    description: 'Three older ladies looking at a phone together, interested and engaged',
    tags: ['seniors', 'elderly', 'phone', 'technology', 'social', 'women'],
    dimensions: '972x447',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fassets-us-01.kc-usercontent.com%2Fffacfe7d-10b6-0083-2632-604077fd4eca%2F16a3fe13-fdce-4de4-9860-08aea933dcc6%2FSenior-Asians-sitting-on-couch-using-cellphones_iStock-1171416081_2022-02_hero-1336x614.jpg%3Fw%3D486%26dpr%3D2%26fm%3Dpjpg%26q%3D60&f=1&nofb=1&ipt=190862ef421fae19b673d2d35dca816e699055abfb6a62d6a006c231615466e7',
  },
  {
    id: 'tech-support-team',
    description: 'Technical support staff group photo, professional, headsets',
    tags: ['tech', 'support', 'team', 'customer-service', 'professional'],
    dimensions: '1200x400',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fupspir.com%2Fwp-content%2Fuploads%2F2023%2F03%2FTechnical-Support-Best-Practices-v2-1200400.png&f=1&nofb=1&ipt=d3d5db302aebc83079bcac35fed268914ce84b2a9386b156969ddb53ac8eab81',
  },
  {
    id: 'ceo-portrait-2',
    description: 'Alternative CEO/executive portrait, professional headshot style',
    tags: ['business', 'ceo', 'executive', 'portrait', 'professional', 'leader'],
    dimensions: '1200x400',
    url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fnovayagazeta.eu%2Fstatic%2Frecords%2F20af2838664747fdb71f1e41038a31be.jpeg&f=1&nofb=1&ipt=b175ccd44a11009ee13142c05f87ac57d879ba424d22a70bdbbcc9e2cec0b2ee',
  },
]

/**
 * Get the full image catalog formatted for agent context.
 * Agents use this to pick real images for <img> tags in the HTML.
 */
export function getImageCatalog() {
  return IMAGE_CATALOG
}

/**
 * Get images matching specific tags (for targeted suggestions).
 */
export function getImagesByTags(tags) {
  return IMAGE_CATALOG.filter(img =>
    tags.some(tag => img.tags.includes(tag.toLowerCase()))
  )
}

/**
 * Format the image catalog as a string for agent context injection.
 */
export function formatImageCatalogForAgent() {
  return IMAGE_CATALOG.map(img =>
    `- "${img.description}" (${img.dimensions}) — tags: [${img.tags.join(', ')}]\n  URL: ${img.url}`
  ).join('\n')
}
