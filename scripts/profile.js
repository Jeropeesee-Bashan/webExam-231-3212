import { API, Notifications } from './api.js';

async function loadOrders() {
    try {
        const orders = await API.getOrders();
        const tbody = document.querySelector('.orders-table tbody');
        tbody.innerHTML = '';

        const orderRows = await Promise.all(
            orders.map((order, index) => createOrderRow(order, index + 1))
        );
        
        orderRows.forEach(row => tbody.appendChild(row));
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
}

async function createOrderRow(order, index) {
    const tr = document.createElement('tr');

    const products = await Promise.all(
        order.good_ids.map(id => API.getProduct(id))
    );

    const totalPrice = products.reduce((sum, product) => 
        sum + (product.discount_price || product.actual_price), 0);

    const orderDate = new Date(order.created_at).toLocaleString('ru-RU');
    
    const productsList = products
        .map(p => p.name)
        .join(', ')
        .substring(0, 100) + (products.length > 100 ? '...' : '');

    tr.innerHTML = `
        <td>${index}</td>
        <td>${orderDate}</td>
        <td title="${products.map(p => p.name).join(', ')}">${productsList}</td>
        <td>${totalPrice} ₽</td>
        <td>${order.delivery_date}</td>
        <td>${order.delivery_interval}</td>
        <td>
            <button class="action-button view-button" title="Просмотр">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-button edit-button" title="Редактировать">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-button delete-button" title="Удалить">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    tr.querySelector('.view-button').addEventListener('click', () => showOrderDetails(order, products));
    tr.querySelector('.edit-button').addEventListener('click', () => showEditOrder(order));
    tr.querySelector('.delete-button').addEventListener('click', () => showDeleteConfirmation(order.id));

    return tr;
}

function showOrderDetails(order, products) {
    const modal = document.getElementById('viewOrderModal');
    const details = modal.querySelector('.order-details');
    
    const totalPrice = products.reduce((sum, product) => 
        sum + (product.discount_price || product.actual_price), 0);

    details.innerHTML = `
        <p><strong>Номер заказа:</strong> ${order.id}</p>
        <p><strong>Дата создания:</strong> ${new Date(order.created_at).toLocaleString('ru-RU')}</p>
        <p><strong>ФИО:</strong> ${order.full_name}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Телефон:</strong> ${order.phone}</p>
        <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
        <p><strong>Дата доставки:</strong> ${order.delivery_date}</p>
        <p><strong>Время доставки:</strong> ${order.delivery_interval}</p>
        <p><strong>Товары:</strong></p>
        <ul>
            ${products.map(p => `
                <li>${p.name} - ${p.discount_price || p.actual_price} ₽</li>
            `).join('')}
        </ul>
        <p><strong>Итого:</strong> ${totalPrice} ₽</p>
        ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
    `;

    openModal('viewOrderModal');
}

function showEditOrder(order) {
    const form = document.getElementById('editOrderForm');
    
    form.dataset.orderId = order.id;
    // Используем querySelector для поиска полей ввода
    form.querySelector('[name="fullName"]').value = order.full_name;
    form.querySelector('[name="email"]').value = order.email;
    form.querySelector('[name="phone"]').value = order.phone;
    form.querySelector('[name="address"]').value = order.delivery_address;
    form.querySelector('[name="deliveryDate"]').value = order.delivery_date;
    form.querySelector('[name="deliveryTime"]').value = order.delivery_interval;
    form.querySelector('[name="comment"]').value = order.comment || '';
    
    openModal('editOrderModal');
}

document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const orderId = form.dataset.orderId;
    const orderData = {
        full_name: form.querySelector('[name="fullName"]').value,
        email: form.querySelector('[name="email"]').value,
        phone: form.querySelector('[name="phone"]').value,
        delivery_address: form.querySelector('[name="address"]').value,
        delivery_date: form.querySelector('[name="deliveryDate"]').value,
        delivery_interval: form.querySelector('[name="deliveryTime"]').value,
        comment: form.querySelector('[name="comment"]').value
    };

    try {
        await API.updateOrder(orderId, orderData);
        closeModal('editOrderModal');
        await loadOrders();
        Notifications.show('Заказ успешно обновлен', 'success');
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
});

document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const orderId = this.dataset.orderId;
    const orderData = {
        full_name: this.elements['edit-name'].value,
        email: this.elements['edit-email'].value,
        phone: this.elements['edit-phone'].value,
        delivery_address: this.elements['edit-address'].value,
        delivery_date: this.elements['edit-delivery-date'].value,
        delivery_interval: this.elements['edit-delivery-time'].value,
        comment: this.elements['edit-comment'].value
    };

    try {
        await API.updateOrder(orderId, orderData);
        closeModal('editOrderModal');
        await loadOrders();
        Notifications.show('Заказ успешно обновлен', 'success');
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
});

function showDeleteConfirmation(orderId) {
    const modal = document.getElementById('deleteOrderModal');
    modal.dataset.orderId = orderId;
    openModal('deleteOrderModal');
}

document.querySelector('.confirm-delete').addEventListener('click', async function() {
    const orderId = this.closest('.modal').dataset.orderId;
    try {
        await API.deleteOrder(orderId);
        closeModal('deleteOrderModal');
        loadOrders();
        Notifications.show('Заказ успешно удален', 'success');
    } catch (error) {
        Notifications.show(error.message, 'error');
    }
});

document.querySelector('.cancel-delete').addEventListener('click', function() {
    closeModal('deleteOrderModal');
});

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        modal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', loadOrders);
