const xss = require('xss');

/**
 * Sanitization utility
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * XSS filter options
 */
const xssOptions = {
  whiteList: {
    a: ['href', 'title', 'target'],
    abbr: ['title'],
    address: [],
    area: ['shape', 'coords', 'href', 'alt'],
    article: [],
    aside: [],
    audio: ['autoplay', 'controls', 'loop', 'preload', 'src'],
    b: [],
    bdi: ['dir'],
    bdo: ['dir'],
    big: [],
    blockquote: ['cite'],
    body: [],
    br: [],
    button: ['autofocus', 'disabled', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'name', 'type', 'value'],
    canvas: ['width', 'height'],
    caption: [],
    center: [],
    cite: [],
    code: [],
    col: ['align', 'valign', 'span', 'width'],
    colgroup: ['align', 'valign', 'span', 'width'],
    dd: [],
    del: ['datetime'],
    details: ['open'],
    dfn: [],
    dialog: ['open'],
    div: [],
    dl: [],
    dt: [],
    em: [],
    embed: ['src', 'type', 'width', 'height'],
    fieldset: ['disabled', 'form', 'name'],
    figcaption: [],
    figure: [],
    font: ['color', 'size', 'face'],
    footer: [],
    form: ['accept', 'accept-charset', 'action', 'autocomplete', 'enctype', 'method', 'name', 'novalidate', 'target'],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    head: [],
    header: [],
    hgroup: [],
    hr: [],
    html: ['manifest', 'xmlns'],
    i: [],
    iframe: ['src', 'srcdoc', 'name', 'width', 'height', 'sandbox', 'seamless'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    input: ['accept', 'alt', 'autocomplete', 'autofocus', 'checked', 'disabled', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'height', 'list', 'max', 'maxlength', 'min', 'multiple', 'name', 'pattern', 'placeholder', 'readonly', 'required', 'size', 'src', 'step', 'type', 'value', 'width'],
    ins: ['datetime'],
    kbd: [],
    keygen: ['autofocus', 'challenge', 'disabled', 'form', 'keytype', 'name'],
    label: ['form', 'for'],
    legend: [],
    li: ['value'],
    link: ['href', 'rel', 'media', 'hreflang', 'type', 'sizes'],
    main: [],
    map: ['name'],
    mark: [],
    menu: ['label', 'type'],
    menuitem: ['checked', 'command', 'default', 'disabled', 'icon', 'label', 'radiogroup', 'type'],
    meta: ['charset', 'http-equiv', 'name', 'content'],
    meter: ['value', 'min', 'max', 'low', 'high', 'optimum', 'form'],
    nav: [],
    noscript: [],
    object: ['data', 'type', 'name', 'usemap', 'form', 'width', 'height'],
    ol: ['reversed', 'start', 'type'],
    optgroup: ['disabled', 'label'],
    option: ['disabled', 'selected', 'label', 'value'],
    output: ['for', 'form', 'name'],
    p: [],
    param: ['name', 'value'],
    picture: [],
    pre: [],
    progress: ['value', 'max', 'form'],
    q: ['cite'],
    rp: [],
    rt: [],
    ruby: [],
    s: [],
    samp: [],
    script: ['async', 'charset', 'defer', 'src', 'type'],
    section: [],
    select: ['autofocus', 'disabled', 'form', 'multiple', 'name', 'required', 'size'],
    small: [],
    source: ['src', 'type', 'media', 'srcset', 'sizes'],
    span: [],
    strong: [],
    style: ['type', 'media', 'scoped'],
    sub: [],
    summary: [],
    sup: [],
    table: ['width', 'border', 'align', 'valign'],
    tbody: ['align', 'valign'],
    td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
    textarea: ['autofocus', 'cols', 'disabled', 'form', 'maxlength', 'name', 'placeholder', 'readonly', 'required', 'rows', 'wrap'],
    tfoot: ['align', 'valign'],
    th: ['width', 'rowspan', 'colspan', 'align', 'valign', 'scope'],
    thead: ['align', 'valign'],
    time: ['datetime'],
    title: [],
    tr: ['rowspan', 'align', 'valign'],
    track: ['default', 'kind', 'label', 'src', 'srclang'],
    u: [],
    ul: [],
    var: [],
    video: ['autoplay', 'controls', 'height', 'loop', 'muted', 'poster', 'preload', 'src', 'width'],
    wbr: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
  allowList: xss.getDefaultWhiteList(),
};

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML string
 */
const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return xss(html, xssOptions);
};

/**
 * Sanitize plain text string
 * @param {string} text - Text string to sanitize
 * @returns {string} Sanitized text string
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Remove any HTML tags
  return text.replace(/<[^>]*>/g, '').trim();
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

/**
 * Sanitize user input from request body
 * @param {Object} data - Request body data
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Sanitize string fields
  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const value = sanitized[key];
      if (typeof value === 'string') {
        // Preserve HTML for content fields (like post content)
        if (key === 'content' || key === 'description' || key === 'html') {
          sanitized[key] = sanitizeHTML(value);
        } else {
          sanitized[key] = sanitizeText(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeInput(value);
      }
    }
  }

  return sanitized;
};

/**
 * Escape special characters in a string for use in HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHTML = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate and sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
const sanitizeURL = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    return null;
  }
};

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.toLowerCase().trim();
};

module.exports = {
  sanitizeHTML,
  sanitizeText,
  sanitizeObject,
  sanitizeInput,
  escapeHTML,
  sanitizeURL,
  sanitizeEmail,
};

