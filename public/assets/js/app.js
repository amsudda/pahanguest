/* ============================================================
   Pahan Guest — behaviour
   Ported from the DCLogic component in "Kadju House.dc.html".

   Notable departures from the canvas source, all deliberate:
   - wide/narrow layout switching moved to CSS media queries
     (the canvas drove it from window.innerWidth in JS)
   - reveals/counters/SVG draw use IntersectionObserver instead of
     a requestAnimationFrame poll running for the life of the page
   - the room screen is addressable at #/room/<slug> so it can be
     linked, shared, and reached with the browser Back button
   ============================================================ */
(function () {
  'use strict';

  var body   = document.body;
  var PHONE  = body.dataset.phone || '94772813748';
  var HOUSE  = body.dataset.house || 'Pahan Guest';
  var NARROW = window.matchMedia('(max-width: 820px)');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = REDUCE.matches;

  var ROOM_LIST = ['Any room', 'Garden Room', 'Balcony Room', 'Family Room'];

  var ROOMS = {
    'Garden Room': {
      slug: 'garden-room',
      lead: 'Ground floor, double doors straight onto the lawn and the old neem tree.',
      guests: '2 guests',
      beds: 'One king bed.',
      body: 'The coolest room in the house in the middle of the day, because the neem tree shades that side from about eleven. The doors open onto a small private stretch of lawn with two chairs. It is the room we give to guests who want to read.'
    },
    'Balcony Room': {
      slug: 'balcony-room',
      lead: 'Upstairs, with a private balcony you can watch the egrets come in at dusk.',
      guests: '2 guests',
      beds: 'One queen bed.',
      body: 'Up the outside stairs, so you can come and go without passing through the house. The balcony looks over the palms towards Nuwara Wewa; you cannot quite see the water, but the breeze comes off it after dark when the road goes quiet.'
    },
    'Family Room': {
      slug: 'family-room',
      lead: 'Upstairs corner room with two sleeping areas, good for four.',
      guests: '4 guests',
      beds: 'One king bed and two singles in a separate alcove.',
      body: 'The biggest room, on the corner, with windows on two sides and a partition between the beds. Families usually take this one and use the landing outside as a spot for bags and dusty shoes.'
    }
  };

  /* Lightbox captions, in collage slot order — index matches data-lb. */
  var PHOTOS = [
    'the house and garden from the lawn',
    'the upstairs balcony and the mango tree',
    'the house from the garden',
    'a guest room, double and single beds',
    'the dining room, tables set for guests',
    'the stepping stones to the front door'
  ];

  /* ------------------------------ helpers ----------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function waOpen(text) {
    window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  function waHello() {
    waOpen('Hello ' + HOUSE + '! I have a question about staying with you.');
  }

  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function slugToRoom(slug) {
    for (var name in ROOMS) {
      if (ROOMS[name].slug === slug) return name;
    }
    return null;
  }

  /* =====================================================================
     Booking form  (the BookingForm.dc.html component)
     ===================================================================== */
  var bfSeq = 0;

  function BookingForm(mount) {
    var tpl = $('#tpl-booking');
    var node = tpl.content.firstElementChild.cloneNode(true);
    var uid = 'bf' + (++bfSeq);

    this.el = node;
    this.state = {
      checkIn: '', checkOut: '', adults: 2, kids: 0,
      room: mount.dataset.room || 'Any room',
      name: '', errIn: '', errOut: '', opening: false
    };

    if (mount.dataset.onDark === 'true') node.classList.add('bf--on-dark');

    this.in      = $('[data-in]', node);
    this.out     = $('[data-out]', node);
    this.roomSel = $('[data-room]', node);
    this.nameIn  = $('[data-name]', node);
    this.errIn   = $('[data-err-in]', node);
    this.errOut  = $('[data-err-out]', node);
    this.adultsV = $('[data-adults-v]', node);
    this.kidsV   = $('[data-kids-v]', node);
    this.summary = $('[data-summary]', node);
    this.opening = $('[data-opening]', node);
    this.submit  = $('[data-submit]', node);

    // Give every instance its own ids so <label for> stays correct
    // when the form appears four times on one page.
    var pairs = [['in', this.in], ['out', this.out], ['room', this.roomSel], ['name', this.nameIn]];
    pairs.forEach(function (p) {
      var id = uid + '-' + p[0];
      p[1].id = id;
      var label = $('[data-for="' + p[0] + '"]', node);
      if (label) label.setAttribute('for', id);
    });
    this.errIn.id = uid + '-err-in';
    this.errOut.id = uid + '-err-out';

    this.in.min = todayISO();
    this.roomSel.value = this.state.room;

    var self = this;

    this.in.addEventListener('change', function () {
      self.state.checkIn = this.value;
      self.out.min = this.value ? self.dayAfter(this.value) : todayISO();
      if (self.state.errIn || self.state.errOut) self.validate();
      self.render();
    });

    this.out.addEventListener('change', function () {
      self.state.checkOut = this.value;
      if (self.state.errIn || self.state.errOut) self.validate();
      self.render();
    });

    this.roomSel.addEventListener('change', function () { self.state.room = this.value; });
    this.nameIn.addEventListener('input', function () { self.state.name = this.value; });

    $$('[data-adults]', node).forEach(function (b) {
      b.addEventListener('click', function () {
        self.step('adults', parseInt(b.dataset.adults, 10), 1, 6);
      });
    });
    $$('[data-kids]', node).forEach(function (b) {
      b.addEventListener('click', function () {
        self.step('kids', parseInt(b.dataset.kids, 10), 0, 4);
      });
    });

    this.submit.addEventListener('click', function () { self.send(); });

    mount.appendChild(node);
    this.render();
  }

  BookingForm.prototype.dayAfter = function (iso) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  BookingForm.prototype.step = function (key, delta, min, max) {
    this.state[key] = Math.min(max, Math.max(min, this.state[key] + delta));
    this.render();
  };

  BookingForm.prototype.setRoom = function (name) {
    if (ROOM_LIST.indexOf(name) === -1) name = 'Any room';
    this.state.room = name;
    this.roomSel.value = name;
  };

  BookingForm.prototype.fmt = function (iso) {
    if (!iso) return 'Not decided yet';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  BookingForm.prototype.nights = function () {
    var s = this.state;
    if (!s.checkIn || !s.checkOut) return 0;
    var n = Math.round((new Date(s.checkOut) - new Date(s.checkIn)) / 86400000);
    return n > 0 ? n : 0;
  };

  BookingForm.prototype.validate = function () {
    var s = this.state;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var errIn = '', errOut = '';

    if (!s.checkIn) errIn = 'Please pick your arrival date.';
    else if (new Date(s.checkIn + 'T12:00:00') < today) errIn = 'That date has passed — pick a later one.';

    if (!s.checkOut) errOut = 'Please pick your departure date.';
    else if (s.checkIn && new Date(s.checkOut) <= new Date(s.checkIn)) errOut = 'Check-out needs to be after check-in.';

    s.errIn = errIn;
    s.errOut = errOut;
    this.render();
    return !errIn && !errOut;
  };

  BookingForm.prototype.render = function () {
    var s = this.state;

    this.adultsV.textContent = s.adults;
    this.kidsV.textContent = s.kids;

    $$('[data-adults]', this.el).forEach(function (b) {
      var d = parseInt(b.dataset.adults, 10);
      b.disabled = (d < 0 && s.adults <= 1) || (d > 0 && s.adults >= 6);
    });
    $$('[data-kids]', this.el).forEach(function (b) {
      var d = parseInt(b.dataset.kids, 10);
      b.disabled = (d < 0 && s.kids <= 0) || (d > 0 && s.kids >= 4);
    });

    this.field(this.in, this.errIn, s.errIn);
    this.field(this.out, this.errOut, s.errOut);

    var n = this.nights();
    var bits = [];
    if (n) bits.push(n + (n === 1 ? ' night' : ' nights'));
    bits.push(s.adults + (s.adults === 1 ? ' adult' : ' adults'));
    if (s.kids) bits.push(s.kids + (s.kids === 1 ? ' child' : ' children'));
    if (!n) bits.push('dates not set yet');
    this.summary.textContent = bits.join(', ');

    this.opening.hidden = !s.opening;
  };

  BookingForm.prototype.field = function (input, errEl, msg) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errEl.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  };

  BookingForm.prototype.send = function () {
    if (!this.validate()) {
      var bad = this.state.errIn ? this.in : this.out;
      bad.focus();
      return;
    }

    var s = this.state;
    var n = this.nights();
    var lines = [
      'Hello ' + HOUSE + "! I'd like to check availability.",
      'Room: ' + s.room,
      'Check-in: ' + this.fmt(s.checkIn),
      'Check-out: ' + this.fmt(s.checkOut) + ' (' + n + ' ' + (n === 1 ? 'night' : 'nights') + ')',
      'Guests: ' + s.adults + ' adults, ' + s.kids + ' children'
    ];
    if (s.name.trim()) lines.push('Name: ' + s.name.trim());

    waOpen(lines.join('\n'));

    var self = this;
    s.opening = true;
    this.render();
    clearTimeout(this._t);
    this._t = setTimeout(function () {
      self.state.opening = false;
      self.render();
    }, 2200);
  };

  /* build every mounted form */
  var forms = $$('[data-booking-form]').map(function (m) { return new BookingForm(m); });
  var sheetForm = null;
  var roomForm = null;
  $$('[data-booking-form]').forEach(function (m, i) {
    if (m.hasAttribute('data-sheet-form')) sheetForm = forms[i];
    if (m.closest('#screen-room')) roomForm = forms[i];
  });

  /* =====================================================================
     WhatsApp entry points
     ===================================================================== */
  $$('[data-wa-hello]').forEach(function (b) {
    b.addEventListener('click', waHello);
  });

  $$('[data-ask-room]').forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.dataset.askRoom;
      if (NARROW.matches) {
        openSheet(name);
        return;
      }
      waOpen([
        'Hello ' + HOUSE + "! I'd like to check availability.",
        'Room: ' + name,
        'Check-in: Not decided yet',
        'Check-out: Not decided yet',
        'Guests: 2 adults, 0 children'
      ].join('\n'));
    });
  });

  /* =====================================================================
     Overlays — scroll lock, focus trap, Escape
     ===================================================================== */
  var openLayer = null;
  var lastFocus = null;
  var EXIT_MS = 200; // keep in step with --t-exit

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function isOpen(el) { return el.classList.contains('is-open'); }

  function layerOpen(el) {
    clearTimeout(el._exit);
    lastFocus = document.activeElement;
    el.hidden = false;
    body.classList.add('is-locked');
    openLayer = el;
    // Flush the closed state so the entry transition has a start value.
    // Without this the browser coalesces both frames and nothing animates.
    void el.offsetWidth;
    el.classList.add('is-open');
    var first = $(FOCUSABLE, el);
    if (first) first.focus();
  }

  function layerClose(el) {
    if (!isOpen(el)) return;
    el.classList.remove('is-open');
    openLayer = null;
    body.classList.remove('is-locked');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    lastFocus = null;

    // Stay in the DOM until the exit has played, then leave the tree
    // entirely so nothing inside is tabbable or readable.
    clearTimeout(el._exit);
    if (reduced) { el.hidden = true; return; }
    el._exit = setTimeout(function () { el.hidden = true; }, EXIT_MS);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isOpen(lb)) { closeLb(); return; }
      if (isOpen(sheet)) { layerClose(sheet); return; }
      if (isOpen(menu)) { closeMenu(); return; }
    }

    if (isOpen(lb)) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepLb(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stepLb(-1); }
    }

    if (e.key === 'Tab' && openLayer) {
      var items = $$(FOCUSABLE, openLayer).filter(function (n) { return n.getClientRects().length > 0; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------- menu ------------------------------- */
  var menu = $('#menu');
  var burger = $('[data-open-menu]');

  function openMenu() {
    burger.setAttribute('aria-expanded', 'true');
    layerOpen(menu);
  }
  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    layerClose(menu);
  }

  burger.addEventListener('click', openMenu);
  $$('[data-close-menu]', menu).forEach(function (n) {
    n.addEventListener('click', closeMenu);
  });
  $('[data-wa-hello]', menu).addEventListener('click', closeMenu);

  /* ------------------------------ sheet ------------------------------- */
  var sheet = $('#sheet');

  function openSheet(room) {
    if (sheetForm) sheetForm.setRoom(room || 'Any room');
    layerOpen(sheet);
  }

  $$('[data-open-sheet]').forEach(function (b) {
    b.addEventListener('click', function () { openSheet('Any room'); });
  });
  $('[data-close-sheet]').addEventListener('click', function () { layerClose(sheet); });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) layerClose(sheet);
  });

  /* ---------------------------- lightbox ------------------------------ */
  var lb      = $('#lb');
  var lbCap   = $('[data-lb-cap]');
  var lbCount = $('[data-lb-count]');
  var lbIndex = -1;

  function openLb(i) {
    lbIndex = i;
    paintLb();
    layerOpen(lb);
  }
  function closeLb() {
    lbIndex = -1;
    layerClose(lb);
  }
  function stepLb(d) {
    lbIndex = (lbIndex + d + PHOTOS.length) % PHOTOS.length;
    paintLb();
  }
  function paintLb() {
    lbCap.textContent = PHOTOS[lbIndex];
    lbCount.textContent = (lbIndex + 1) + ' of ' + PHOTOS.length;
  }

  $$('[data-lb]').forEach(function (b) {
    b.addEventListener('click', function () { openLb(parseInt(b.dataset.lb, 10)); });
  });
  $('[data-lb-close]').addEventListener('click', closeLb);
  $('[data-lb-prev]').addEventListener('click', function () { stepLb(-1); });
  $('[data-lb-next]').addEventListener('click', function () { stepLb(1); });

  /* =====================================================================
     FAQ
     ===================================================================== */
  $$('.qa__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', String(!open));
    });
  });

  /* =====================================================================
     Hero slideshow

     Plain crossfade cycler: toggle .is-on on the next <img>, CSS does the
     fade (see .hero__slide). Pauses when the tab is hidden so a background
     tab doesn't burn through slides unseen, and the existing pause button
     stops/resumes it on request.
     ===================================================================== */
  var vidBtn = $('[data-video-toggle]');
  var heroFrame = $('#heroFrame');
  var slideshow = $('#heroSlideshow');

  if (slideshow) {
    var slides = $$('.hero__slide', slideshow);
    var slideIx = 0;
    var slideTimer = null;
    var slidesPaused = false;
    var SLIDE_MS = 5000;

    function nextSlide() {
      slides[slideIx].classList.remove('is-on');
      slideIx = (slideIx + 1) % slides.length;
      slides[slideIx].classList.add('is-on');
    }

    function startSlides() {
      stopSlides();
      if (slides.length > 1) slideTimer = setInterval(nextSlide, SLIDE_MS);
    }
    function stopSlides() {
      clearInterval(slideTimer);
      slideTimer = null;
    }

    if (!reduced) startSlides();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopSlides();
      else if (!slidesPaused && !reduced) startSlides();
    });

    vidBtn.addEventListener('click', function () {
      slidesPaused = !slidesPaused;
      if (slidesPaused) stopSlides(); else startSlides();
      vidBtn.setAttribute('aria-pressed', String(slidesPaused));
      vidBtn.textContent = slidesPaused ? 'Play slideshow' : 'Pause slideshow';
    });
  }

  /* =====================================================================
     Reveals, counters, SVG draw
     ===================================================================== */
  function revealAll() {
    $$('[data-reveal], [data-draw]').forEach(function (el) { el.classList.add('is-in'); });
    $$('[data-count]').forEach(function (el) { el.textContent = el.dataset.count; });
    paintMap(true);
  }

  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    var t0 = performance.now();
    el.textContent = '0';
    (function tick(t) {
      var p = Math.min(1, (t - t0) / 900);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  var mapSvg = $('#mapSvg');

  function paintMap(instant) {
    if (!mapSvg) return;

    var routes = $$('[data-route] path', mapSvg);
    var pins = $$('[data-pin] circle, [data-pin] text', mapSvg);

    if (instant) {
      routes.forEach(function (p) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
      pins.forEach(function (p) { p.style.opacity = '1'; });
      return;
    }

    routes.forEach(function (p, i) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
      // force layout so the transition has a start value to run from
      void p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 1000ms cubic-bezier(0.22,1,0.36,1) ' + (i * 180) + 'ms';
      p.style.strokeDashoffset = '0';
    });

    pins.forEach(function (p, i) {
      p.style.transition = 'opacity 500ms ease';
      p.style.transitionDelay = (600 + Math.floor(i / 2) * 180) + 'ms';
      p.style.opacity = '1';
    });
  }

  // Observe the icon <svg> rather than each geometry element inside it —
  // IntersectionObserver on SVG shapes is patchy across browsers.
  var drawSvgs = [];
  $$('[data-draw]').forEach(function (el) {
    var svg = el.ownerSVGElement;
    if (svg && svg !== mapSvg && drawSvgs.indexOf(svg) === -1) drawSvgs.push(svg);
  });

  if (reduced || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);

        if (el === mapSvg) { paintMap(false); return; }
        if (el.hasAttribute('data-count')) { countUp(el); return; }
        if (drawSvgs.indexOf(el) !== -1) {
          $$('[data-draw]', el).forEach(function (p) { p.classList.add('is-in'); });
          return;
        }
        el.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    $$('[data-reveal], [data-count]').forEach(function (el) { io.observe(el); });
    drawSvgs.forEach(function (el) { io.observe(el); });
    if (mapSvg) io.observe(mapSvg);
  }

  /* =====================================================================
     Scroll-driven chrome
     ===================================================================== */
  var hdr       = $('#hdr');
  var heroText  = $('#heroText');
  var fab       = $('#fab');
  var fabTip    = $('#fabTip');
  var mobileBar = $('#mobileBar');
  var bookSec   = $('#book');

  var lastY = 0;
  var ticking = false;
  var tipShown = false;
  var lastP = -1;   // last hero progress written
  var lastR = -1;   // last hero corner radius written

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var vh = window.innerHeight;

    /* header */
    hdr.classList.toggle('is-past', y > vh * 0.7);
    hdr.classList.toggle('is-hidden', y > 260 && y > lastY && !isOpen(menu));

    /* hero parallax */
    if (!reduced) {
      var p = Math.min(1, Math.max(0, y / (vh * 0.9)));

      // Only write when the value actually moved. Redundant inline-style
      // writes still invalidate style, and this runs on every scroll frame.
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p;
        heroFrame.style.transform = 'scale(' + (1 - 0.14 * p).toFixed(4) + ')';
        heroText.style.opacity = String(Math.max(0, 1 - p * 1.25));
        heroText.style.transform = 'translateY(' + (-50 * p).toFixed(1) + 'px)';

        // transform and opacity composite; border-radius repaints the whole
        // full-viewport layer. Quantised to whole pixels so that repaint
        // happens ~20 times over the hero instead of once per frame.
        var r = Math.round(20 * p);
        if (r !== lastR) {
          lastR = r;
          heroFrame.style.borderRadius = r + 'px';
        }
      }
    }

    /* WhatsApp bubble — stands down while the booking section is on screen */
    var show = y > vh * 0.9;
    if (bookSec) {
      var r = bookSec.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) show = false;
    }
    if (NARROW.matches) show = false;

    fab.classList.toggle('is-on', show);

    if (show && !tipShown) {
      tipShown = true;
      fabTip.classList.add('is-on');
      setTimeout(function () { fabTip.classList.remove('is-on'); }, 4200);
    }

    /* mobile action bar */
    mobileBar.classList.toggle('is-on', y > vh * 0.85);

    lastY = y;
    ticking = false;
  }

  function requestScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }

  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });

  /* =====================================================================
     Screens — home / room detail, addressable via #/room/<slug>
     ===================================================================== */
  var screenHome = $('#screen-home');
  var screenRoom = $('#screen-room');
  var homeScrollY = 0;
  var current = 'home';

  function paintRoom(name) {
    var r = ROOMS[name];
    if (!r) return;

    $$('[data-room-name]', screenRoom).forEach(function (n) { n.textContent = name; });
    $('[data-room-lead]', screenRoom).textContent = r.lead;
    $('[data-room-body]', screenRoom).textContent = r.body;
    $('[data-room-beds]', screenRoom).textContent = r.beds;
    $('[data-room-guests]', screenRoom).textContent = r.guests;
    $('[data-room-shot-wide]', screenRoom).setAttribute('data-shot', name + ' — wide shot from the doorway');

    document.title = name + ' — ' + HOUSE;
    if (roomForm) roomForm.setRoom(name);
  }

  function route() {
    var m = /^#\/room\/([a-z-]+)$/.exec(window.location.hash);
    var name = m ? slugToRoom(m[1]) : null;

    if (name) {
      if (current === 'home') homeScrollY = window.scrollY;
      paintRoom(name);
      screenHome.hidden = true;
      screenRoom.hidden = false;
      current = 'room';
      window.scrollTo(0, 0);
      return;
    }

    var wasRoom = current === 'room';
    screenRoom.hidden = true;
    screenHome.hidden = false;
    current = 'home';
    document.title = HOUSE + ' — Your Perfect Stay in Ancient Anuradhapura';

    if (wasRoom) {
      // Come back to where the rooms were, not to the top of the page.
      window.scrollTo(0, homeScrollY);
      requestScroll();
    }
  }

  $$('[data-open-room]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var name = a.dataset.openRoom;
      closeMenu();
      window.location.hash = '#/room/' + ROOMS[name].slug;
    });
  });

  $$('[data-go-home]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (window.location.hash.indexOf('#/room/') === 0) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }
      route();
    });
  });

  window.addEventListener('hashchange', route);

  /* =====================================================================
     Go
     ===================================================================== */
  route();
  onScroll();

  NARROW.addEventListener('change', function () {
    if (!NARROW.matches) layerClose(menu);
    requestScroll();
  });
})();
