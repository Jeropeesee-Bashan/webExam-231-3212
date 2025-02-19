const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = 'APIAPI';

class API {
    static getUrl(endpoint) {
        return `${API_BASE_URL}${endpoint}?api_key=${API_KEY}`;
    }

    static async getProducts() {
        try {
            const response = await fetch(this.getUrl('/goods'));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка загрузки товаров');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось загрузить товары: ' + error.message);
        }
    }

    static async getProduct(productId) {
        try {
            const response = await fetch(this.getUrl(`/goods/${productId}`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Товар не найден');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось загрузить информацию о товаре: ' + error.message);
        }
    }

    static async getAutocomplete(query) {
        try {
            const response = await fetch(this.getUrl(`/autocomplete?query=${encodeURIComponent(query)}`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка автодополнения');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось получить варианты автодополнения: ' + error.message);
        }
    }

    static async getOrders() {
        try {
            const response = await fetch(this.getUrl('/orders'));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка загрузки заказов');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось загрузить заказы: ' + error.message);
        }
    }

    static async getOrder(orderId) {
        try {
            const response = await fetch(this.getUrl(`/orders/${orderId}`));
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Заказ не найден');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось загрузить информацию о заказе: ' + error.message);
        }
    }

    static async createOrder(orderData) {
        try {
            const response = await fetch(this.getUrl('/orders'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка создания заказа');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось создать заказ: ' + error.message);
        }
    }

    static async updateOrder(orderId, orderData) {
        try {
            const response = await fetch(this.getUrl(`/orders/${orderId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    full_name: orderData.name,
                    email: orderData.email,
                    phone: orderData.phone,
                    delivery_address: orderData.address,
                    delivery_date: orderData.deliveryDate,
                    delivery_interval: orderData.deliveryTime,
                    comment: orderData.comment,
                    subscribe: orderData.subscribe || false
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка обновления заказа');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось обновить заказ: ' + error.message);
        }
    }

    static async deleteOrder(orderId) {
        try {
            const response = await fetch(this.getUrl(`/orders/${orderId}`), {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка удаления заказа');
            }
            return await response.json();
        } catch (error) {
            throw new Error('Не удалось удалить заказ: ' + error.message);
        }
    }
}

class Cart {
    static getItems() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    }

    static addItem(productId) {
        const cart = this.getItems();
        if (!cart.includes(productId)) {
            cart.push(productId);
            localStorage.setItem('cart', JSON.stringify(cart));
            return true;
        }
        return false;
    }

    static removeItem(productId) {
        const cart = this.getItems();
        const updatedCart = cart.filter(id => id !== productId);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    }

    static clear() {
        localStorage.removeItem('cart');
    }

    static async getCartProducts() {
        const cartItems = this.getItems();
        if (cartItems.length === 0) return [];
        
        try {
            return await Promise.all(
                cartItems.map(id => API.getProduct(id))
            );
        } catch (error) {
            throw new Error('Не удалось загрузить товары корзины');
        }
    }

    static async getTotalPrice() {
        const products = await this.getCartProducts();
        return products.reduce((sum, product) => 
            sum + (product.discount_price || product.actual_price), 0);
    }

    static getCount() {
        return this.getItems().length;
    }
}

class Notifications {
    static show(message, type = 'info') {
        const container = document.querySelector('.notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        container.appendChild(notification);

        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => this.remove(notification));

        setTimeout(() => this.remove(notification), 5000);
    }

    static remove(notification) {
        if (!notification.classList.contains('removing')) {
            notification.classList.add('removing');
            notification.addEventListener('animationend', () => {
                notification.remove();
            });
        }
    }
}

export { API, Cart, Notifications };
