/**
 * Ecommerce Attribution Tracker
 * Universal tracking snippet for any website
 */
(function() {
  'use strict';

  // Configuration
  const API_URL = (document.currentScript?.getAttribute('data-api-url') || 
                   window.ATTRIBUTION_TRACKER_API_URL || 
                   'http://localhost:3000').replace(/\/$/, '');
  
  const STORAGE_KEY_VID = '_att_vid';
  const STORAGE_KEY_SID = '_att_sid';
  const STORAGE_KEY_LAST_TOUCH = '_att_last_touch';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Storage helpers (prefer localStorage, fallback to cookie)
  const storage = {
    get: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return getCookie(key);
      }
    },
    set: function(key, value, days) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        setCookie(key, value, days || 365);
      }
    }
  };

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  // Get or create visitor ID
  function getVisitorId() {
    let vid = storage.get(STORAGE_KEY_VID);
    if (!vid) {
      vid = generateId();
      storage.set(STORAGE_KEY_VID, vid);
    }
    return vid;
  }

  // Get or create session ID
  function getSessionId() {
    const lastSessionTime = storage.get('_att_session_time');
    const now = Date.now();
    
    // Check if session expired
    if (lastSessionTime && (now - parseInt(lastSessionTime)) > SESSION_TIMEOUT) {
      // Create new session
      const sid = generateId();
      storage.set(STORAGE_KEY_SID, sid);
      storage.set('_att_session_time', now.toString());
      return sid;
    }
    
    let sid = storage.get(STORAGE_KEY_SID);
    if (!sid) {
      sid = generateId();
      storage.set(STORAGE_KEY_SID, sid);
    }
    storage.set('_att_session_time', now.toString());
    return sid;
  }

  // Generate random ID
  function generateId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Parse URL parameters
  function getUrlParams() {
    const url = new URL(window.location.href);
    return {
      utm_source: url.searchParams.get('utm_source'),
      utm_medium: url.searchParams.get('utm_medium'),
      utm_campaign: url.searchParams.get('utm_campaign'),
      utm_content: url.searchParams.get('utm_content'),
      utm_term: url.searchParams.get('utm_term'),
      fbclid: url.searchParams.get('fbclid'),
      ttclid: url.searchParams.get('ttclid'),
      gclid: url.searchParams.get('gclid'),
      wbraid: url.searchParams.get('wbraid'),
      gbraid: url.searchParams.get('gbraid'),
      msclkid: url.searchParams.get('msclkid'),
      sccid: url.searchParams.get('sccid'),
    };
  }

  // Check if this is a new session (has UTM params or click IDs)
  function isNewSession() {
    const params = getUrlParams();
    return !!(params.utm_source || params.utm_medium || params.fbclid || 
              params.ttclid || params.gclid || params.msclkid || params.sccid);
  }

  // Store last non-direct touchpoint
  function updateLastTouch() {
    const params = getUrlParams();
    const hasAttribution = params.utm_source || params.utm_medium || 
                          params.fbclid || params.ttclid || params.gclid;
    
    if (hasAttribution) {
      storage.set(STORAGE_KEY_LAST_TOUCH, JSON.stringify({
        ...params,
        timestamp: Date.now(),
        referrer: document.referrer,
        landing_url: window.location.href,
      }), 30); // Store for 30 days
    }
  }

  // Send event to API
  function sendEvent(eventType, additionalData = {}) {
    const vid = getVisitorId();
    const sid = getSessionId();
    const params = getUrlParams();
    const lastTouch = storage.get(STORAGE_KEY_LAST_TOUCH);
    
    // Use current URL params if available, otherwise use last touch
    const attributionData = (params.utm_source || params.fbclid || params.ttclid) 
      ? params 
      : (lastTouch ? JSON.parse(lastTouch) : {});
    
    const payload = {
      vid,
      sid,
      eventType,
      ...attributionData,
      referrer: document.referrer || undefined,
      landing_url: window.location.href,
      current_url: window.location.href,
      user_agent: navigator.userAgent,
      ...additionalData,
    };

    // Send via fetch (with fallback to image beacon)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/collect`, blob);
    } else {
      fetch(`${API_URL}/api/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silent fail - tracking should not break the site
      });
    }
  }

  // Track page view
  function trackPageView() {
    updateLastTouch();
    
    // Check if this is a new session
    if (isNewSession()) {
      sendEvent('session_start');
    }
    
    sendEvent('page_view');
  }

  // Public API
  window.AttributionTracker = {
    track: sendEvent,
    trackPageView: trackPageView,
    trackAddToCart: function(productId, productName, price, quantity = 1) {
      sendEvent('add_to_cart', {
        product_id: productId,
        product_name: productName,
        price: price,
        quantity: quantity,
      });
    },
    trackBeginCheckout: function() {
      sendEvent('begin_checkout');
    },
    trackPurchase: function(orderId, total, currency = 'USD') {
      sendEvent('purchase', {
        order_id: orderId,
        total: total,
        currency: currency,
      });
    },
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
  };

  // Auto-track page view on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // Track page views on navigation (for SPAs)
  let lastUrl = window.location.href;
  setInterval(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      trackPageView();
    }
  }, 1000);

  // Helper: Inject visitor ID into forms (for order linking)
  function injectVisitorIdIntoForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      // Check if form already has vid field
      if (form.querySelector('input[name="_att_vid"]')) return;
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_att_vid';
      input.value = getVisitorId();
      form.appendChild(input);
    });
  }

  // Inject vid into forms when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectVisitorIdIntoForms);
  } else {
    injectVisitorIdIntoForms();
  }

  // Re-inject on dynamic form additions
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'FORM') {
            injectVisitorIdIntoForms();
          } else if (node.querySelectorAll) {
            const forms = node.querySelectorAll('form');
            forms.forEach(function(form) {
              injectVisitorIdIntoForms();
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

})();
