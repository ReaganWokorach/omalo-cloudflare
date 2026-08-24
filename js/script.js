/* =========================================================
   OMALO GRAPHICS CENTRE LTD: site script
   Vanilla JS, no dependencies. Progressively enhances the
   markup in index/about/services/approach/market/contact/404.
   ========================================================= */
(function () {
  'use strict';

  /* ===================== SCROLL LOCK ===================== */
  /* Shared by the mobile nav, service modal and gallery lightbox. Pairs
     with the body.nav-open rule in styles.css (position:fixed, not
     overflow:hidden) so it never breaks the sticky header in Safari. */
  var lockedScrollY = 0;

  var lockScroll = function () {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = -lockedScrollY + 'px';
    document.body.classList.add('nav-open');
  };

  var unlockScroll = function () {
    document.body.classList.remove('nav-open');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  };

  /* ===================== MOBILE NAV ===================== */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    var closeNav = function () {
      mainNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      unlockScroll();
    };
    var openNav = function () {
      mainNav.classList.add('is-open');
      navToggle.classList.add('is-open');
      navToggle.setAttribute('aria-expanded', 'true');
      lockScroll();
    };

    navToggle.addEventListener('click', function () {
      if (mainNav.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    Array.prototype.forEach.call(mainNav.querySelectorAll('a'), function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    // If the viewport is resized back to desktop while the mobile
    // menu is open, reset everything so it doesn't get stuck.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ===================== BACK TO TOP ===================== */
  var toTop = document.getElementById('toTop');

  if (toTop) {
    var toggleToTop = function () {
      if (window.scrollY > 420) {
        toTop.classList.add('is-visible');
      } else {
        toTop.classList.remove('is-visible');
      }
    };
    window.addEventListener('scroll', toggleToTop, { passive: true });
    toggleToTop();

    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Note: the WhatsApp bubble next to this button is a plain <a href="https://wa.me/...">
     link in the markup, no JS needed, it just opens WhatsApp with the first phone number. */

  /* ===================== ANIMATED STAT COUNTERS ===================== */
  var counters = document.querySelectorAll('[data-count-to]');

  if (counters.length) {
    var animateCount = function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
      var duration = 1100;
      var start = null;

      var step = function (timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.textContent = target;
        }
      };
      window.requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      Array.prototype.forEach.call(counters, function (el) {
        counterObserver.observe(el);
      });
    } else {
      Array.prototype.forEach.call(counters, animateCount);
    }
  }

  /* ===================== REVEAL ON SCROLL ===================== */
  var reveals = document.querySelectorAll('.reveal');

  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      Array.prototype.forEach.call(reveals, function (el) {
        revealObserver.observe(el);
      });
    } else {
      Array.prototype.forEach.call(reveals, function (el) {
        el.classList.add('is-visible');
      });
    }
  }

  /* ===================== SERVICES QUICK NAV (services.html) ===================== */
  /* Every category and every service is already printed on the page, nothing is
     hidden behind a click. These pills are just a shortcut to jump down to a
     category, and they highlight themselves as you scroll past each section. */
  var quicknav = document.getElementById('servicesQuicknav');

  if (quicknav) {
    var quicknavLinks = quicknav.querySelectorAll('.quicknav-btn');
    var categorySections = document.querySelectorAll('.service-category');

    var setActiveQuicknav = function (id) {
      Array.prototype.forEach.call(quicknavLinks, function (link) {
        link.classList.toggle('is-active', link.getAttribute('data-quicknav') === id);
      });
    };

    if ('IntersectionObserver' in window && categorySections.length) {
      var spyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveQuicknav(entry.target.id);
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      Array.prototype.forEach.call(categorySections, function (section) {
        spyObserver.observe(section);
      });
    }
  }

  /* ===================== GALLERY LIGHTBOX (index.html) ===================== */
  var lightbox = document.getElementById('lightbox');

  if (lightbox) {
    var lightboxImg = lightbox.querySelector('img');
    var lightboxCap = lightbox.querySelector('.lightbox-cap');
    var lightboxClose = lightbox.querySelector('.lightbox-close');

    var openLightbox = function (item) {
      var img = item.querySelector('img');
      var cap = item.querySelector('.cap');
      if (!img || !lightboxImg) return;

      lightboxImg.src = img.getAttribute('data-full') || img.src;
      lightboxImg.alt = img.alt || '';
      if (lightboxCap) lightboxCap.textContent = cap ? cap.textContent : '';

      lightbox.classList.add('is-open');
      lockScroll();
    };

    var closeLightbox = function () {
      lightbox.classList.remove('is-open');
      unlockScroll();
      if (lightboxImg) lightboxImg.src = '';
    };

    Array.prototype.forEach.call(document.querySelectorAll('.gallery-item'), function (item) {
      item.style.cursor = 'zoom-in';
      item.addEventListener('click', function () {
        openLightbox(item);
      });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  }

  /* ===================== CONTACT FORM (contact.html) ===================== */
  var contactForm = document.getElementById('contactForm');

  if (contactForm) {
    var formStatus = document.getElementById('formStatus');
    var submitBtn = contactForm.querySelector('button[type="submit"]');

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: real visitors never see or fill this field.
      var honeypot = contactForm.querySelector('#website');
      if (honeypot && honeypot.value) {
        if (formStatus) {
          formStatus.classList.remove('is-error');
          formStatus.textContent = 'Thanks, we will be in touch shortly.';
        }
        contactForm.reset();
        return;
      }

      var nameField = contactForm.querySelector('#name');
      var emailField = contactForm.querySelector('#email');
      if ((nameField && !nameField.value.trim()) || (emailField && !emailField.value.trim())) {
        if (formStatus) {
          formStatus.classList.add('is-error');
          formStatus.textContent = 'Please fill in your name and a way to reach you.';
        }
        return;
      }

      var formData = new FormData(contactForm);
      var payload = {};
      formData.forEach(function (value, key) { payload[key] = value; });

      if (submitBtn) submitBtn.disabled = true;
      if (formStatus) {
        formStatus.classList.remove('is-error');
        formStatus.textContent = 'Sending…';
      }

      // Cloudflare Pages Function at /functions/api/contact.js. It emails
      // the alert using Resend — see SETUP.md for the one-time Cloudflare
      // + Resend configuration this depends on. The function always
      // replies with JSON, whether it succeeded or not.
      fetch(contactForm.getAttribute('action') || '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
            if (formStatus) {
              formStatus.classList.remove('is-error');
              formStatus.textContent = 'Thanks, your message has been sent. We will be in touch shortly.';
            }
            contactForm.reset();
            if (window.turnstile) window.turnstile.reset();
          });
        })
        .catch(function (err) {
          if (formStatus) {
            formStatus.classList.add('is-error');
            formStatus.textContent = (err && err.message) || 'Something went wrong sending your message. Please try again, or reach us directly by phone.';
          }
          if (window.turnstile) window.turnstile.reset();
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  // Footer copyright year: keeps "All rights reserved" current without
  // needing a manual edit every January.
  var copyrightYear = document.getElementById('copyrightYear');
  if (copyrightYear) {
    copyrightYear.textContent = new Date().getFullYear();
  }

})();
