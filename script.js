// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== Mobile nav toggle =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
    });
});

// ===== Active nav link on scroll =====
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

function highlightNav() {
    const scrollPos = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
            navItems.forEach(a => a.classList.remove('active'));
            const active = document.querySelector(`.nav-links a[href="#${id}"]`);
            if (active) active.classList.add('active');
        }
    });
}

window.addEventListener('scroll', highlightNav);
highlightNav();

// ===== Scroll animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for scroll animation
document.querySelectorAll('.timeline-item, .project-card, .publication, .highlight-card, .teaching-card, .skill-category').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});
