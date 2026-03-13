// ============================================
// DADRIS DESIGNERS — MAIN JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Navbar Scroll ----
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ---- Hamburger Menu ----
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    const closeBtn = mobileMenu.querySelector('.mobile-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // ---- Active Nav Link ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  // ---- Fade Up Animation ----
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // ---- Portfolio Filters ----
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      portfolioItems.forEach(item => {
        const match = filter === 'all' || item.dataset.category === filter;
        item.style.display = match ? 'block' : 'none';
      });
    });
  });

  // ---- Contact Form ----
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      showToast('✅ Message sent! We\'ll get back to you soon.');
      this.reset();
    });
  }

  // ---- Toast Notification ----
  window.showToast = function(msg, duration = 3500) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast'; toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  };

  // ---- Animate hero stats count ----
  const stats = document.querySelectorAll('.hero-stat .num[data-count]');
  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        let count = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = count + (el.dataset.suffix || '');
          if (count >= target) clearInterval(timer);
        }, 25);
        statsObserver.unobserve(el);
      }
    });
  });
  stats.forEach(el => statsObserver.observe(el));
});
