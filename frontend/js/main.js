const API_URL = '/api';
let currentCategory = '';
let currentSearch = '';
let currentPage = 1;

// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Auth state
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

function updateAuthUI() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    const user = getUser();
    const isInsidePages = window.location.pathname.includes('/pages/');
    const basePath = isInsidePages ? '' : 'pages/';

    if (user) {
        authLinks.innerHTML = `

            <a href="${basePath}create-prompt.html" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Yeni Prompt</a>
            <a href="${basePath}profile.html" class="btn btn-ghost"><i class="fa-solid fa-user"></i> ${user.username}</a>
            <button onclick="logout()" class="btn btn-ghost" style="color:var(--danger)"><i class="fa-solid fa-sign-out-alt"></i></button>
        `;
    } else {
        authLinks.innerHTML = `
            <a href="${basePath}login.html" class="btn btn-ghost">Giriş Yap</a>
            <a href="${basePath}register.html" class="btn btn-primary">Kayıt Ol</a>
        `;
    }
}

async function loadCategories() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;

    try {
        const res = await fetch(`${API_URL}/categories`);
        const categories = await res.json();

        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-name="${cat.name}">${cat.name}</a>`;
            categoryList.appendChild(li);
        });

        categoryList.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                categoryList.querySelectorAll('a').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
                currentCategory = a.getAttribute('data-name');
                loadPrompts();
            });
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadPrompts(append = false) {
    const promptGrid = document.getElementById('promptGrid');
    if (!promptGrid) return;

    if (!append) {
        promptGrid.innerHTML = '<p>Yükleniyor...</p>';
        currentPage = 1;
    }

    try {
        let url = new URL(`${API_URL}/prompts`, window.location.origin);
        if (currentCategory) url.searchParams.append('category', currentCategory);
        if (currentSearch) url.searchParams.append('search', currentSearch);
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', 12);

        const res = await fetch(url);
        const data = await res.json();
        const prompts = data.prompts || (Array.isArray(data) ? data : []);

        if (prompts.length === 0) {
            if (!append) promptGrid.innerHTML = '<p>Hiç prompt bulunamadı.</p>';
            let btn = document.getElementById('loadMoreBtn');
            if (btn) btn.style.display = 'none';
            return;
        }

        if (!append) promptGrid.innerHTML = '';

        prompts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.style = 'flex-direction: column; gap: 1rem;';
            
            const escapedTitle = escapeHTML(p.title);
            const escapedDesc = escapeHTML(p.description);
            const escapedAuthor = escapeHTML(p.author_name);
            const escapedCategory = escapeHTML(p.category_name);

            card.innerHTML = `
                <div class="prompt-content">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                        <span class="prompt-category">${escapedCategory}</span>
                        <div class="prompt-author">
                            <i class="fa-solid fa-user-circle"></i> ${escapedAuthor}
                        </div>
                    </div>
                    <a href="p/${p.id}" class="prompt-title">${escapedTitle}</a>
                    <p class="prompt-description">${escapedDesc}</p>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <button class="action-btn" title="Kopyala" data-text="${encodeURIComponent(p.prompt_text)}" onclick="copyPromptText(${p.id}, this)">
                            <i class="fa-regular fa-copy"></i> <span class="copy-count">${p.copy_count || 0}</span>
                        </button>
                        <button class="action-btn" onclick="likePrompt(${p.id}, this)">
                            <i class="fa-regular fa-heart"></i> <span class="like-count">${p.likes_count || 0}</span>
                        </button>
                        <a href="p/${p.id}" class="action-btn" style="text-decoration:none;">
                            <i class="fa-regular fa-comment"></i> <span>${p.comments_count || 0}</span>
                        </a>
                        <button class="action-btn" style="margin-left:auto;" onclick="savePrompt(${p.id}, this)">
                            <i class="fa-regular fa-bookmark"></i>
                        </button>
                        ${getUser() && getUser().role === 'admin' ? `<button class="action-btn" style="color:var(--danger); margin-left:0.5rem;" onclick="deletePromptByAdmin(${p.id}, this)" title="Sil"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
            promptGrid.appendChild(card);
        });

        // Pagination UI
        let loadBtn = document.getElementById('loadMoreBtn');
        if (data.pagination && currentPage < data.pagination.totalPages) {
            if (!loadBtn) {
                loadBtn = document.createElement('button');
                loadBtn.id = 'loadMoreBtn';
                loadBtn.className = 'btn btn-ghost';
                loadBtn.style = 'margin: 2.5rem auto; display: block; width: 220px; text-align: center; border: 1px solid var(--primary); color: var(--primary); padding: 0.8rem; border-radius: 8px; cursor: pointer;';
                loadBtn.onclick = () => {
                    currentPage++;
                    loadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
                    loadPrompts(true);
                };
                promptGrid.parentNode.appendChild(loadBtn);
            }
            loadBtn.style.display = 'block';
            loadBtn.innerHTML = 'Daha Fazla Yükle';
        } else if (loadBtn) {
            loadBtn.style.display = 'none';
        }

    } catch (err) {
        console.error(err);
        if (!append) promptGrid.innerHTML = '<p class="error-message">Promptlar yüklenirken hata oluştu.</p>';
    }
}

window.likePrompt = async function (promptId, btnElement) {
    if (!getToken()) {
        window.location.href = 'pages/login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ prompt_id: promptId })
        });

        const data = await res.json();
        if (res.ok) {
            const icon = btnElement.querySelector('i');
            const countSpan = btnElement.querySelector('.like-count');
            let count = parseInt(countSpan.textContent) || 0;

            if (data.action === 'liked') {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                btnElement.classList.add('liked');
                countSpan.textContent = count + 1;
            } else {
                icon.classList.add('fa-regular');
                icon.classList.remove('fa-solid');
                btnElement.classList.remove('liked');
                countSpan.textContent = Math.max(0, count - 1);
            }
        }
    } catch (err) {
        console.error(err);
    }
};

window.savePrompt = async function (promptId, btnElement) {
    if (!getToken()) {
        window.location.href = 'pages/login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ prompt_id: promptId })
        });

        const data = await res.json();
        if (res.ok) {
            const icon = btnElement.querySelector('i');
            if (data.action === 'saved') {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid');
                btnElement.classList.add('saved');
            } else {
                icon.classList.add('fa-regular');
                icon.classList.remove('fa-solid');
                btnElement.classList.remove('saved');
            }
        }
    } catch (err) {
        console.error(err);
    }
};

window.copyPromptText = async function (promptId, btnElement) {
    try {
        const textToCopy = decodeURIComponent(btnElement.getAttribute('data-text'));
        await navigator.clipboard.writeText(textToCopy);
        
        const icon = btnElement.querySelector('i');
        icon.className = 'fa-solid fa-check';
        icon.style.color = 'var(--success)';
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
            icon.style.color = '';
        }, 2000);

        const token = getToken();
        if (token) {
            const res = await fetch(`${API_URL}/prompts/${promptId}/copy`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.incremented) {
                    const countSpan = btnElement.querySelector('.copy-count');
                    if(countSpan) countSpan.textContent = parseInt(countSpan.textContent || 0) + 1;
                }
            }
        }
    } catch (err) {
        console.error('Kopyalama hatası:', err);
    }
};

window.deletePromptByAdmin = async function(id, btn) {
    if(!confirm("Yönetici Yetkisi: Bu promptu tamamen silmek istediğinize emin misiniz?")) return;
    
    // Disable button to prevent spam
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const res = await fetch(`${API_URL}/admin/prompts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if(res.ok) {
            btn.closest('.prompt-card').remove();
        } else {
            alert("Silme işlemi başarısız. Yetkiniz reddedildi.");
            btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btn.disabled = false;
        }
    } catch(err) {
        console.error(err);
        alert("Bağlantı hatası.");
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btn.disabled = false;
    }
}

// Search debounce
let searchTimeout;
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            loadPrompts();
        }, 300);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    if (document.getElementById('categoryList') && document.getElementById('promptGrid')) {
        loadCategories();
        loadPrompts();
    }
});
