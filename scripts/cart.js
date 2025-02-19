import { API, Cart, Notifications } from './api.js';

async function loadCartItems() {
    try {
        const cartItemsContainer = document.querySelector('.cart-items');
        const cartEmptyMessage = document.querySelector('.cart-empty');
        const orderForm = document.querySelector('.order-form-section');

        const cartProducts = await Cart.getCartProducts();

        if (cartProducts.length === 0) {
            cartItemsContainer.style.display = 'none';
            cartEmptyMessage.style.display = 'block';
            orderForm.style.display = 'none';
            return;
        }

        const orders = await API.getOrders();
        if (orders.length >= 10) {
            Notifications.show('У вас уже есть 10 активных заказов. Удалите старые заказы перед оформлением нового.', 'error');
            return;
        }

        cartItemsContainer.style.display = 'grid';
        cartEmptyMessage.style.display = 'none';
        orderForm.style.display = 'block';

        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;

        cartProducts.forEach(product => {
            cartItemsContainer.appendChild(createCartItemCard(product));
            totalPrice += product.discount_price || product.actual_price;
        });

        updateTotalPrice(totalPrice);
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
}

function createCartItemCard(product) {
    const card = document.createElement('div');
    card.className = 'cart-item';
    card.dataset.id = product.id;

    const price = product.discount_price ? 
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
            <div class="price-block">${price}</div>
            <button class="remove-from-cart">Удалить</button>
        </div>
    `;

    card.querySelector('.remove-from-cart').addEventListener('click', () => {
        Cart.removeItem(product.id);
        loadCartItems();
        Notifications.show('Товар удален из корзины', 'success');
    });

    return card;
}

function updateTotalPrice(productsPrice) {
    const totalPriceElement = document.querySelector('.total-price');
    const deliveryPriceElement = document.querySelector('.delivery-price');
    
    if (!totalPriceElement || !deliveryPriceElement) {
        return;
    }

    const deliveryDate = document.getElementById('delivery-date').value;
    const deliveryTime = document.getElementById('delivery-time').value;
    
    if (!deliveryDate || !deliveryTime) {
        totalPriceElement.textContent = `${productsPrice} ₽`;
        deliveryPriceElement.textContent = 'Выберите дату и время доставки';
        return;
    }

    const deliveryPrice = Cart.calculateDeliveryPrice(deliveryDate, deliveryTime);
    const totalPrice = productsPrice + deliveryPrice;

    totalPriceElement.textContent = `${totalPrice} ₽`;
    deliveryPriceElement.textContent = `Доставка: ${deliveryPrice} ₽`;
}

document.querySelector('.order-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    try {
        const orders = await API.getOrders();
        if (orders.length >= 10) {
            Notifications.show('У вас уже есть 10 активных заказов. Удалите старые заказы перед оформлением нового.', 'error');
            return;
        }

        const rawDate = document.getElementById('delivery-date').value;
        const date = new Date(rawDate);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).replace(/\//g, '.');

        const timeValue = document.getElementById('delivery-time').value;
        const timeIntervals = {
            '8': '08:00-12:00',
            '12': '12:00-14:00',
            '14': '14:00-18:00',
            '18': '18:00-22:00'
        };
        const deliveryInterval = timeIntervals[timeValue];

        const cartItems = Cart.getItems();
        let goodIds = [];
        for (let i = 0; i < cartItems.length; i++) {
            goodIds.push(cartItems[i]);
        }

        const formData = {
            full_name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            delivery_address: document.getElementById('address').value,
            delivery_date: formattedDate,
            delivery_interval: deliveryInterval,
            comment: document.getElementById('comment').value || '',
            subscribe: document.getElementById('newsletter').checked ? 1 : 0,
            good_ids: goodIds
        };

        await API.createOrder(formData);
        Cart.clear();
        Notifications.show('Заказ успешно оформлен', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
});

document.getElementById('delivery-date').addEventListener('change', () => {
    const cartItems = Cart.getItems();
    if (cartItems.length > 0) {
        loadCartItems();
    }
});

document.getElementById('delivery-time').addEventListener('change', () => {
    const cartItems = Cart.getItems();
    if (cartItems.length > 0) {
        loadCartItems();
    }
});

document.addEventListener('DOMContentLoaded', loadCartItems);
