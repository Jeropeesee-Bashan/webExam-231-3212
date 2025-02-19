import { API, Cart, Notifications } from './api.js';

async function loadProducts(filters = {}, sortType = 'popular') {
    try {
        const products = await API.getProducts();
        const productsGrid = document.querySelector('.products-grid');
        productsGrid.innerHTML = '';
        
        let filteredProducts = products.filter(product => {
            if (filters.category && product.main_category !== filters.category) {
                return false;
            }
            
            const price = product.discount_price || product.actual_price;
            if (filters.minPrice && price < filters.minPrice) {
                return false;
            }
            if (filters.maxPrice && price > filters.maxPrice) {
                return false;
            }
            
            if (filters.hasDiscount && !product.discount_price) {
                return false;
            }
            
            return true;
        });

        filteredProducts = sortProducts(filteredProducts, sortType);
        
        filteredProducts.forEach(product => {
            productsGrid.appendChild(createProductCard(product));
        });

        updateCategoryFilter(products);
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
}

function sortProducts(products, sortType) {
    switch (sortType) {
        case 'popular':
            return products.sort((a, b) => b.rating - a.rating);
        
        case 'price-asc':
            return products.sort((a, b) => {
                const priceA = a.discount_price || a.actual_price;
                const priceB = b.discount_price || b.actual_price;
                return priceA - priceB;
            });
            
        case 'price-desc':
            return products.sort((a, b) => {
                const priceA = a.discount_price || a.actual_price;
                const priceB = b.discount_price || b.actual_price;
                return priceB - priceA;
            });
            
        default:
            return products;
    }
}

function initializeSorting() {
    const sortSelect = document.querySelector('.sort-select');
    sortSelect.addEventListener('change', (e) => {
        const sortType = e.target.value;
        const filterForm = document.querySelector('.filter-form');
        const formData = new FormData(filterForm);
        
        const filters = {
            category: formData.get('category'),
            minPrice: formData.get('min-price') ? Number(formData.get('min-price')) : null,
            maxPrice: formData.get('max-price') ? Number(formData.get('max-price')) : null,
            hasDiscount: formData.get('has-discount') === 'true'
        };
        
        loadProducts(filters, sortType);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    const discount = product.discount_price ? 
        `<span class="discount-price">${product.discount_price} ₽</span>
         <span class="original-price">${product.actual_price} ₽</span>` :
        `<span class="price">${product.actual_price} ₽</span>`;

    const shortName = product.name.length > 50 ? 
        product.name.substring(0, 47) + '...' : 
        product.name;

    card.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}">
        <div class="product-info">
            <h3 title="${product.name}">${shortName}</h3>
            <div class="category">${product.main_category} - ${product.sub_category}</div>
            <div class="rating">★ ${product.rating}</div>
            <div class="price-block">${discount}</div>
            <button class="add-to-cart">В корзину</button>
        </div>
    `;

    const addButton = card.querySelector('.add-to-cart');
    addButton.addEventListener('click', () => {
        if (Cart.addItem(product.id)) {
            Notifications.show('Товар добавлен в корзину', 'success');
            
            addButton.textContent = '✓ В корзине';
            addButton.classList.add('in-cart');
            setTimeout(() => {
                addButton.textContent = 'В корзину';
                addButton.classList.remove('in-cart');
            }, 2000);
        } else {
            Notifications.show('Товар уже в корзине', 'info');
        }
    });

    return card;
}

function updateCategoryFilter(products) {
    const categories = [...new Set(products.map(p => p.main_category))];
    const categorySelect = document.querySelector('#category-filter');
    categorySelect.innerHTML = '<option value="">Все категории</option>';
    categories.forEach(category => {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

function initializeFilters() {
    const filterForm = document.querySelector('.filter-form');
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(filterForm);
        
        const filters = {
            category: formData.get('category'),
            minPrice: formData.get('min-price') ? Number(formData.get('min-price')) : null,
            maxPrice: formData.get('max-price') ? Number(formData.get('max-price')) : null,
            hasDiscount: formData.get('has-discount') === 'true'
        };
        
        const sortType = document.querySelector('.sort-select').value;
        loadProducts(filters, sortType);
    });
}

async function initializeSearch() {
    const searchInput = document.querySelector('#search-input');
    const searchButton = document.querySelector('#search-button');
    let timeoutId = null;
    let products = [];

    try {
        products = await API.getProducts();
    } catch (error) {
        Notifications.show('Ошибка при загрузке товаров', 'error');
    }

    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (!query) {
            clearSuggestions();
            return;
        }

        timeoutId = setTimeout(() => {
            const suggestions = [...new Set(products
                .filter(product => {
                    const searchQuery = query.toLowerCase();
                    return product.name.toLowerCase().includes(searchQuery) ||
                           product.main_category.toLowerCase().includes(searchQuery) ||
                           product.sub_category.toLowerCase().includes(searchQuery);
                })
                .map(product => product.name)
                .slice(0, 5))];
            
            showSuggestions(suggestions, query);
        }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
}

function showSuggestions(suggestions, query) {
    clearSuggestions();

    if (!suggestions.length) return;

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'search-suggestions';

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const highlightedText = suggestion.replace(
            new RegExp(query, 'gi'),
            match => `<strong>${match}</strong>`
        );
        
        item.innerHTML = highlightedText;
        
        item.addEventListener('click', () => {
            document.querySelector('#search-input').value = suggestion;
            performSearch(suggestion);
            clearSuggestions();
        });
        
        suggestionsContainer.appendChild(item);
    });

    const searchBar = document.querySelector('.search-bar');
    searchBar.appendChild(suggestionsContainer);

    document.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target)) {
            clearSuggestions();
        }
    });
}

function clearSuggestions() {
    const existing = document.querySelector('.search-suggestions');
    if (existing) {
        existing.remove();
    }
}

async function performSearch(query) {
    try {
        const products = await API.getProducts();
        const searchResults = products.filter(product => {
            const searchQuery = query.toLowerCase();
            return product.name.toLowerCase().includes(searchQuery) ||
                   product.main_category.toLowerCase().includes(searchQuery) ||
                   product.sub_category.toLowerCase().includes(searchQuery);
        });

        const productsGrid = document.querySelector('.products-grid');
        productsGrid.innerHTML = '';
        
        if (searchResults.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-results">
                    <p>По запросу "${query}" ничего не найдено</p>
                </div>
            `;
            return;
        }

        const sortType = document.querySelector('.sort-select').value;
        const sortedResults = sortProducts(searchResults, sortType);

        sortedResults.forEach(product => {
            productsGrid.appendChild(createProductCard(product));
        });
    } catch (error) {
        Notifications.show('Ошибка при поиске товаров', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initializeSorting();
    initializeFilters();
    initializeSearch();
});
