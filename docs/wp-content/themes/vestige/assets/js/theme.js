/**
 * Vestige — front-end motion & interaction layer.
 *
 * Progressive enhancement only: every feature guards on its library
 * and DOM hooks, and everything degrades to the plain, fully readable
 * site. Motion is keyed off classes / data attributes carried in the
 * block-pattern markup (data-vestige-reveal, .vestige-marquee,
 * .vestige-card, .vestige-grain …), so sections a buyer drags,
 * duplicates or reorders in the block editor keep animating.
 *
 * Libraries (bundled locally, free licenses): GSAP + ScrollTrigger,
 * Lenis smooth scroll. All motion is disabled under
 * prefers-reduced-motion.
 */
(function () {
	'use strict';

	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var cfg = window.vestigeTheme || {};
	var hasGsap = typeof window.gsap !== 'undefined';
	var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';

	/* ------------------------------------------------------------------
	   Lenis smooth scroll (GSAP ticker drives it when both exist)
	   ------------------------------------------------------------------ */
	if (!reduced && typeof window.Lenis !== 'undefined') {
		var lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
		if (hasGsap && hasST) {
			lenis.on('scroll', window.ScrollTrigger.update);
			window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
			window.gsap.ticker.lagSmoothing(0);
		} else {
			var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
			requestAnimationFrame(raf);
		}
		// Anchor links (menu categories, back-to-top) ride the scroller.
		document.querySelectorAll('a[href^="#"]').forEach(function (a) {
			a.addEventListener('click', function (e) {
				var id = a.getAttribute('href');
				if (id.length > 1) {
					var target = document.querySelector(id);
					if (target) { e.preventDefault(); lenis.scrollTo(target); }
				} else if (id === '#top' || id === '#') {
					e.preventDefault(); lenis.scrollTo(0);
				}
			});
		});
	}

	/* ------------------------------------------------------------------
	   Scroll reveals — GSAP + ScrollTrigger, IO fallback.
	   Variants (from the patterns' data-vestige-reveal values):
	     rise — fade + rise (AnimatedContent / FadeContent feel)
	     blur — fade + un-blur + slight rise (ScrollReveal feel)
	     fade — opacity only, batched with stagger (bento tiles)
	     hero — load-in timeline incl. the headline treatment
	   ------------------------------------------------------------------ */
	var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-vestige-reveal], .vestige-reveal'));

	function revealFallback(els) {
		if (!('IntersectionObserver' in window)) {
			els.forEach(function (el) { el.classList.add('is-in'); });
			return;
		}
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -10% 0px' });
		els.forEach(function (el) { io.observe(el); });
	}

	if (reduced) {
		revealEls.forEach(function (el) { el.classList.add('is-in'); el.style.opacity = '1'; });
	} else if (hasST) {
		window.gsap.registerPlugin(window.ScrollTrigger);
		var others = [];
		revealEls.forEach(function (el) {
			var kind = el.getAttribute('data-vestige-reveal') || 'rise';
			el.classList.add('gsap-driven');
			if (kind === 'hero') {
				var tl = window.gsap.timeline({ defaults: { ease: 'power3.out' } });
				tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 })
					.fromTo(el.querySelectorAll('.eyebrow, .hero-title, .lede, .hero-ctas, .hero-stats'),
						{ opacity: 0, y: 44, filter: 'blur(8px)' },
						{ opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.95, stagger: 0.09 }, '-=0.15')
					.fromTo(el.querySelectorAll('.hero-media'),
						{ opacity: 0, scale: 1.04 },
						{ opacity: 1, scale: 1, duration: 1.1 }, '-=0.7');
			} else if (kind === 'fade') {
				others.push(el); // batched below for stagger.
			} else if (kind === 'blur') {
				window.gsap.fromTo(el,
					{ opacity: 0, y: 18, filter: 'blur(6px)' },
					{
						opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out',
						scrollTrigger: { trigger: el, start: 'top 86%' }
					});
			} else { // rise
				window.gsap.fromTo(el,
					{ opacity: 0, y: 38 },
					{
						opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
						scrollTrigger: { trigger: el, start: 'top 88%' }
					});
			}
		});
		if (others.length) {
			window.ScrollTrigger.batch(others, {
				start: 'top 90%',
				onEnter: function (batch) {
					window.gsap.fromTo(batch, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', overwrite: true });
				}
			});
			// Safety: anything already past the fold shows immediately.
			others.forEach(function (el) {
				if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
					window.gsap.set(el, { opacity: 1, y: 0 });
				}
			});
		}
	} else {
		revealFallback(revealEls);
	}

	/* ------------------------------------------------------------------
	   Hero flipping word — SELVEDGE DENIM ⇄ RAW DENIM (source:
	   FlippingWordSwap in the hero lede). Runs on the lede text, so
	   Customizer/pattern edits that keep the phrase keep the effect.
	   ------------------------------------------------------------------ */
	var lede = document.querySelector('.vestige-hero .lede');
	if (lede && !reduced) {
		var match = lede.innerHTML.match(/selvedge denim/i);
		if (match) {
			lede.innerHTML = lede.innerHTML.replace(/selvedge denim/i, '<span class="flip-word">SELVEDGE DENIM</span>');
			var flip = lede.querySelector('.flip-word');
			var words = ['SELVEDGE DENIM', 'RAW DENIM'];
			var wi = 0;
			setInterval(function () {
				flip.classList.add('is-out');
				setTimeout(function () {
					wi = (wi + 1) % words.length;
					flip.textContent = words[wi];
					flip.classList.remove('is-out');
				}, 320);
			}, 3000);
		}
	}

	/* ------------------------------------------------------------------
	   Marquee safety: the CSS loop needs two identical tracks.
	   ------------------------------------------------------------------ */
	document.querySelectorAll('.vestige-marquee').forEach(function (mq) {
		var tracks = mq.querySelectorAll('.marquee-track');
		if (tracks.length === 1) {
			var clone = tracks[0].cloneNode(true);
			mq.appendChild(clone);
		}
	});

	/* ------------------------------------------------------------------
	   Product cards — pointer-tracked spotlight / glare variables.
	   ------------------------------------------------------------------ */
	document.addEventListener('pointermove', function (e) {
		var card = e.target.closest ? e.target.closest('.vestige-card') : null;
		if (!card) { return; }
		var r = card.getBoundingClientRect();
		card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100) + '%');
		card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100) + '%');
	}, { passive: true });

	/* ------------------------------------------------------------------
	   Overlay menu
	   ------------------------------------------------------------------ */
	var menuBtn = document.querySelector('.vestige-menu-toggle');
	var menu = document.getElementById('site-menu');
	function setMenu(open) {
		if (!menu || !menuBtn) { return; }
		menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
		if (open) {
			menu.hidden = false;
			// Next frame so the CSS transition runs.
			requestAnimationFrame(function () { menu.classList.add('open'); });
			document.body.classList.add('menu-open');
			var first = menu.querySelector('a');
			if (first) { first.focus(); }
		} else {
			menu.classList.remove('open');
			document.body.classList.remove('menu-open');
			setTimeout(function () { menu.hidden = true; }, 320);
			menuBtn.focus();
		}
	}
	if (menuBtn && menu) {
		menuBtn.addEventListener('click', function () {
			setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
		});
		menu.querySelectorAll('a').forEach(function (a) {
			a.addEventListener('click', function () { setMenu(false); });
		});
	}

	/* ------------------------------------------------------------------
	   Cart drawer
	   ------------------------------------------------------------------ */
	var drawerRoot = document.querySelector('.vestige-drawer-root');
	var lastFocus = null;
	function setDrawer(open) {
		if (!drawerRoot) { return; }
		if (open) {
			lastFocus = document.activeElement;
			drawerRoot.classList.add('open');
			drawerRoot.setAttribute('aria-hidden', 'false');
			document.body.classList.add('drawer-open');
			var close = drawerRoot.querySelector('.drawer-close');
			if (close) { close.focus(); }
		} else {
			drawerRoot.classList.remove('open');
			drawerRoot.setAttribute('aria-hidden', 'true');
			document.body.classList.remove('drawer-open');
			if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
		}
	}
	document.querySelectorAll('.vestige-open-cart').forEach(function (btn) {
		btn.addEventListener('click', function () { setDrawer(true); });
	});
	if (drawerRoot) {
		drawerRoot.querySelectorAll('.vestige-close-cart').forEach(function (el) {
			el.addEventListener('click', function () { setDrawer(false); });
		});
	}
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			if (drawerRoot && drawerRoot.classList.contains('open')) { setDrawer(false); }
			if (menu && menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); }
		}
	});
	// Woo's AJAX add-to-cart (shop cards / related) opens the drawer,
	// like the source template opening on add.
	if (window.jQuery) {
		window.jQuery(document.body).on('added_to_cart', function () { setDrawer(true); });
	}

	/* ------------------------------------------------------------------
	   Drawer quantity / remove — AJAX, fragments swapped in place.
	   ------------------------------------------------------------------ */
	function applyFragments(fragments) {
		if (!fragments) { return; }
		Object.keys(fragments).forEach(function (selector) {
			var targets = document.querySelectorAll(selector);
			targets.forEach(function (target) {
				var tmp = document.createElement('div');
				tmp.innerHTML = fragments[selector];
				var replacement = tmp.firstElementChild;
				if (replacement) { target.replaceWith(replacement); }
			});
		});
	}
	function cartPost(action, key, delta) {
		if (!cfg.ajaxUrl) { return; }
		var body = new URLSearchParams();
		body.set('action', action);
		body.set('_ajax_nonce', cfg.nonce || '');
		body.set('key', key);
		if (typeof delta !== 'undefined') { body.set('delta', String(delta)); }
		fetch(cfg.ajaxUrl, { method: 'POST', credentials: 'same-origin', body: body })
			.then(function (r) { return r.json(); })
			.then(function (data) { if (data && data.fragments) { applyFragments(data.fragments); } })
			.catch(function () { /* Cart page remains the fallback. */ });
	}
	document.addEventListener('click', function (e) {
		var qtyBtn = e.target.closest ? e.target.closest('.vestige-qty') : null;
		if (qtyBtn) {
			cartPost('vestige_set_qty', qtyBtn.getAttribute('data-key'), qtyBtn.getAttribute('data-delta'));
			return;
		}
		var rmBtn = e.target.closest ? e.target.closest('.vestige-remove') : null;
		if (rmBtn) {
			cartPost('vestige_remove_item', rmBtn.getAttribute('data-key'));
		}
	});
	// Woo's own fragment refresh (add-to-cart) uses the same selectors;
	// nothing extra needed — our fragment keys match its mechanism.

	/* ------------------------------------------------------------------
	   Single product — thumbnail gallery swap
	   ------------------------------------------------------------------ */
	var mainImg = document.getElementById('vestige-main-image');
	if (mainImg) {
		document.querySelectorAll('.product-thumb').forEach(function (thumb) {
			thumb.addEventListener('click', function () {
				var full = thumb.getAttribute('data-full');
				if (!full) { return; }
				mainImg.src = full;
				mainImg.removeAttribute('srcset');
				document.querySelectorAll('.product-thumb').forEach(function (t) {
					t.classList.remove('is-active');
					t.setAttribute('aria-pressed', 'false');
				});
				thumb.classList.add('is-active');
				thumb.setAttribute('aria-pressed', 'true');
			});
		});
	}

	/* ------------------------------------------------------------------
	   Single product — variation buttons & colour swatches.
	   The native Woo <select>s remain the source of truth (and the
	   no-JS fallback); buttons mirror them and fire real change
	   events so Woo's variation script does its own stock/price work.
	   ------------------------------------------------------------------ */
	var colourMap = {};
	var mapEl = document.getElementById('vestige-colour-map');
	if (mapEl) {
		try { colourMap = JSON.parse(mapEl.textContent) || {}; } catch (err) { colourMap = {}; }
	}
	document.querySelectorAll('form.variations_form .variations select').forEach(function (select) {
		var group = document.createElement('div');
		group.className = 'vestige-var-btns';
		group.setAttribute('role', 'group');
		var isColour = (select.id || '').indexOf('colour') !== -1 || (select.id || '').indexOf('color') !== -1;

		Array.prototype.forEach.call(select.options, function (option) {
			if (!option.value) { return; }
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'vestige-var-btn';
			btn.setAttribute('data-value', option.value);
			btn.setAttribute('aria-pressed', select.value === option.value ? 'true' : 'false');
			if (select.value === option.value) { btn.classList.add('is-selected'); }
			if (isColour && colourMap[option.value]) {
				var sw = document.createElement('span');
				sw.className = 'vestige-swatch';
				sw.style.background = colourMap[option.value];
				sw.setAttribute('aria-hidden', 'true');
				btn.appendChild(sw);
			}
			btn.appendChild(document.createTextNode(option.textContent.trim()));
			btn.addEventListener('click', function () {
				select.value = option.value;
				select.dispatchEvent(new Event('change', { bubbles: true }));
				if (window.jQuery) { window.jQuery(select).trigger('change'); }
				sync();
			});
			group.appendChild(btn);
		});

		function sync() {
			group.querySelectorAll('.vestige-var-btn').forEach(function (b) {
				var on = b.getAttribute('data-value') === select.value;
				b.classList.toggle('is-selected', on);
				b.setAttribute('aria-pressed', on ? 'true' : 'false');
			});
		}
		select.addEventListener('change', sync);
		select.parentNode.insertBefore(group, select.nextSibling);
		select.style.display = 'none';
	});
})();
