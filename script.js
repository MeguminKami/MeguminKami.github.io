// ============================================
// THEME TOGGLE
// ============================================

const themeBtn = document.getElementById('themeBtn');
const THEME_KEY = 'portfolio_theme';

function applyTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
        applyTheme(saved);
    } else {
        // Respect system preference
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        applyTheme(prefersLight ? 'light' : 'dark');
    }
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light');
        const newTheme = isLight ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });
}

initTheme();

// ============================================
// PROJECT FILTERS
// ============================================

const pills = document.querySelectorAll('.pill');
const cards = document.querySelectorAll('.card');

pills.forEach(pill => {
    pill.addEventListener('click', () => {
        // Update active state
        pills.forEach(p => p.classList.remove('isActive'));
        pill.classList.add('isActive');

        // Filter cards
        const filter = pill.dataset.filter;
        cards.forEach(card => {
            const tags = (card.dataset.tags || '').split(' ');
            const shouldShow = filter === 'all' || tags.includes(filter);
            card.style.display = shouldShow ? '' : 'none';
        });
    });
});

// ============================================
// MODAL (Quick Preview)
// ============================================

const modal = document.getElementById('modal');
if (modal) {
    const closeBtn = document.getElementById('closeBtn');
    const mTitle = document.getElementById('mTitle');
    const mSub = document.getElementById('mSub');
    const mDesc = document.getElementById('mDesc');
    const mImg = document.getElementById('mImg');
    const mVideo = document.getElementById('mVideo');
    const videoWrap = document.getElementById('videoWrap');

    // Open modal
    document.querySelectorAll('button[data-modal-title]').forEach(btn => {
        btn.addEventListener('click', () => {
            mTitle.textContent = btn.dataset.modalTitle || '';
            mSub.textContent = btn.dataset.modalSub || '';
            mDesc.textContent = btn.dataset.modalDesc || '';

            const img = btn.dataset.modalImg || '';
            mImg.src = img;
            mImg.alt = `${mTitle.textContent} preview`;

            const video = (btn.dataset.modalVideo || '').trim();
            if (video) {
                mVideo.src = video;
                videoWrap.style.display = 'block';
            } else {
                mVideo.src = '';
                videoWrap.style.display = 'none';
            }

            modal.showModal();
        });
    });

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.close();
        }
    });

    // Clean up on close
    modal.addEventListener('close', () => {
        if (mVideo) mVideo.src = '';
        if (videoWrap) videoWrap.style.display = 'none';
    });
}

// ============================================
// CONTACT MODAL
// ============================================

const contactModal = document.getElementById('contactModal');
const contactBtn = document.getElementById('contactBtn');
const contactCloseBtn = document.getElementById('contactCloseBtn');

if (contactModal && contactBtn) {
    contactBtn.addEventListener('click', () => {
        contactModal.showModal();
    });

    if (contactCloseBtn) {
        contactCloseBtn.addEventListener('click', () => contactModal.close());
    }

    // Close on backdrop click
    contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
            contactModal.close();
        }
    });
}

// ============================================
// FOOTER YEAR
// ============================================

const yearElement = document.getElementById('year');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// ============================================
// SMOOTH SCROLL (with offset for fixed nav)
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const offset = 80;
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// IMAGE LIGHTBOX
// ============================================

const lightbox = document.getElementById('lightbox');
if (lightbox) {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.querySelector('.lightboxClose');

    // Open lightbox on gallery image click
    document.querySelectorAll('.galleryImage').forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightboxCaption.textContent = img.alt;
            lightbox.classList.add('active');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

// ============================================
// BEFORE/AFTER SLIDER
// ============================================

const baSlider = document.querySelector('.baSlider');
if (baSlider) {
    const baImageAfter = document.querySelector('.baImageAfter');
    const baLine = document.querySelector('.baLine');

    function updateSlider(value) {
        if (baImageAfter) baImageAfter.style.width = `${value}%`;
        if (baLine) baLine.style.left = `${value}%`;
    }

    baSlider.addEventListener('input', (e) => {
        updateSlider(e.target.value);
    });

    // Initialize
    updateSlider(baSlider.value);
}

// ============================================
// CODE COPY BUTTON
// ============================================

document.querySelectorAll('.copyBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        const codeBlock = btn.closest('.codeBlock');
        const code = codeBlock.querySelector('code');

        if (code) {
            const text = code.textContent;

            // Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                // Visual feedback
                btn.classList.add('copied');
                const originalText = btn.querySelector('.copyText').textContent;
                btn.querySelector('.copyText').textContent = 'Copied!';

                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('.copyText').textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy code:', err);
            });
        }
    });
});
