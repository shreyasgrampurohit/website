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

// ===== Dark Mode Toggle =====
const darkModeToggle = document.getElementById('darkModeToggle');
const htmlElement = document.documentElement;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
htmlElement.setAttribute('data-theme', currentTheme);
updateDarkModeIcon(currentTheme);

darkModeToggle.addEventListener('click', () => {
    const theme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateDarkModeIcon(theme);
});

function updateDarkModeIcon(theme) {
    const icon = darkModeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== Publication Filters =====
const yearFilter = document.getElementById('year-filter');
const venueFilter = document.getElementById('venue-filter');
const topicFilter = document.getElementById('topic-filter');
const resetFilters = document.getElementById('reset-filters');
const publications = document.querySelectorAll('.publication');

// Only enable filters if they exist (publications.html page)
if (yearFilter && venueFilter && topicFilter && resetFilters) {
    function filterPublications() {
        const year = yearFilter.value;
        const venue = venueFilter.value;
        const topic = topicFilter.value;

        publications.forEach(pub => {
            const pubYear = pub.dataset.year;
            const pubVenue = pub.dataset.venue;
            const pubTopics = pub.dataset.topics || '';

            const matchYear = year === 'all' || pubYear === year;
            const matchVenue = venue === 'all' || pubVenue === venue;
            const matchTopic = topic === 'all' || pubTopics.includes(topic);

            if (matchYear && matchVenue && matchTopic) {
                pub.classList.remove('hidden');
            } else {
                pub.classList.add('hidden');
            }
        });
    }

    yearFilter.addEventListener('change', filterPublications);
    venueFilter.addEventListener('change', filterPublications);
    topicFilter.addEventListener('change', filterPublications);

    resetFilters.addEventListener('click', () => {
        yearFilter.value = 'all';
        venueFilter.value = 'all';
        topicFilter.value = 'all';
        filterPublications();
    });
}

// ===== Global Search =====
const searchToggle = document.getElementById('searchToggle');
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');
const searchResults = document.getElementById('searchResults');

// Build search index
const searchIndex = [];

// Index publications
document.querySelectorAll('.publication').forEach(pub => {
    const title = pub.querySelector('.pub-title')?.textContent || '';
    const authors = pub.querySelector('.pub-authors')?.textContent || '';
    const venue = pub.querySelector('.pub-venue')?.textContent || '';
    searchIndex.push({
        type: 'Publication',
        title: title,
        content: `${title} ${authors} ${venue}`,
        element: pub,
        link: pub.querySelector('.pub-link')?.href || '#publications'
    });
});

// Index research items
document.querySelectorAll('.timeline-item').forEach(item => {
    const title = item.querySelector('h3')?.textContent || '';
    const content = Array.from(item.querySelectorAll('li')).map(li => li.textContent).join(' ');
    searchIndex.push({
        type: 'Research',
        title: title,
        content: `${title} ${content}`,
        element: item,
        link: '#research'
    });
});

// Index projects
document.querySelectorAll('.project-card').forEach(card => {
    const title = card.querySelector('h3')?.textContent || '';
    const desc = card.querySelector('p:not(.project-course)')?.textContent || '';
    searchIndex.push({
        type: 'Project',
        title: title,
        content: `${title} ${desc}`,
        element: card,
        link: '#projects'
    });
});

// Index skills
document.querySelectorAll('.skill-category').forEach(category => {
    const title = category.querySelector('h3')?.textContent || '';
    const skills = Array.from(category.querySelectorAll('.tag')).map(tag => tag.textContent).join(' ');
    searchIndex.push({
        type: 'Skill',
        title: title,
        content: `${title} ${skills}`,
        element: category,
        link: '#skills'
    });
});

searchToggle.addEventListener('click', () => {
    searchModal.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
});

searchClose.addEventListener('click', closeSearch);

searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) closeSearch();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        closeSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchModal.classList.add('active');
        setTimeout(() => searchInput.focus(), 100);
    }
});

function closeSearch() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '<div class=\"search-hint\"><i class=\"fas fa-lightbulb\"></i><p>Try searching for \"tomography\", \"computer architecture\", \"pytorch\", or any keyword</p></div>';
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
        searchResults.innerHTML = '<div class=\"search-hint\"><i class=\"fas fa-lightbulb\"></i><p>Try searching for \"tomography\", \"computer architecture\", \"pytorch\", or any keyword</p></div>';
        return;
    }

    const results = searchIndex.filter(item => 
        item.content.toLowerCase().includes(query)
    ).slice(0, 10);

    if (results.length === 0) {
        searchResults.innerHTML = '<div class=\"no-results\"><i class=\"fas fa-search\"></i><p>No results found for \"' + query + '\"</p></div>';
        return;
    }

    searchResults.innerHTML = results.map(result => {
        const snippet = getSnippet(result.content, query);
        return `
            <div class="search-result-item" onclick="window.location.href='${result.link}'; document.getElementById('searchModal').classList.remove('active');">
                <span class="search-result-type">${result.type}</span>
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-snippet">${snippet}</div>
            </div>
        `;
    }).join('');
});

function getSnippet(content, query) {
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(query);
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet += '...';
    
    // Highlight query
    const regex = new RegExp(`(${query})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
    
    return snippet;
}

// ===== Google Scholar Citation Stats =====
// Note: Direct API access is not available. This is a placeholder.
// For production, use a backend proxy or manual update.
async function loadCitationStats() {
    // Placeholder values - update these manually or use a backend service
    const stats = {
        citations: '245',  // Update with your actual citation count
        hIndex: '8'        // Update with your actual h-index
    };
    
    document.getElementById('total-citations').textContent = stats.citations;
    document.getElementById('h-index').textContent = stats.hIndex;
}

// Load stats on page load
loadCitationStats();

// ===== Interactive Timeline Enhancement =====
const timeline = document.querySelector('.timeline');
if (timeline) {
    let isDown = false;
    let startY;
    let scrollTop;

    // Add smooth scrolling behavior for timeline
    timeline.style.cursor = 'grab';
    
    timeline.addEventListener('mousedown', (e) => {
        if (e.target.closest('.timeline-content')) return;
        isDown = true;
        timeline.style.cursor = 'grabbing';
        startY = e.pageY - timeline.offsetTop;
        scrollTop = timeline.scrollTop;
    });

    timeline.addEventListener('mouseleave', () => {
        isDown = false;
        timeline.style.cursor = 'grab';
    });

    timeline.addEventListener('mouseup', () => {
        isDown = false;
        timeline.style.cursor = 'grab';
    });

    timeline.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const y = e.pageY - timeline.offsetTop;
        const walk = (y - startY) * 2;
        timeline.scrollTop = scrollTop - walk;
    });
}
