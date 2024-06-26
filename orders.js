const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD';
const ordersUrl = 'http://localhost:8080/api/get-orders?page=0';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const balanceUrl = 'http://localhost:8080/api/get-money';
const addOrderUrl = 'http://localhost:8080/api/set-order';
const saveOrderUrl = 'http://localhost:8080/api/save-orders';
const ordersTable = document.getElementById('ordersTable').querySelector('tbody');
const balanceDiv = document.getElementById('balance');

document.addEventListener('DOMContentLoaded', () => {
    startOrderProcessing();
    displayOrders();
    displayBalance();

    document.getElementById('addOrderForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleAddOrderForm();
    });
});

function startOrderProcessing() {
    processOrders();
}

// Установим тайм-аут для функции processSingleOrder
async function processSingleOrderWithTimeout(order, prices, balance, timeout = 10000) {
    return Promise.race([
        processSingleOrder(order, prices, balance),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Processing order timed out')), timeout)
        )
    ]);
}

async function processOrders() {
    try {
        console.log('Получаем текущие заказы...');
        const orders = await fetchOrders();
        console.log(`Найдено ${orders.length} ордеров.`);

        if (orders.length === 0) {
            console.log('Нет ордеров для обработки.');
            return;
        }

        console.log('Получаем текущие цены...');
        const prices = await fetchPrices();
        console.log(`Получено ${prices.length} цен.`);

        console.log('Получаем текущий баланс...');
        const balance = await fetchBalance();
        console.log(`Текущий баланс: ${balance.money} ${balance.currency}`);

        const promises = orders.map(order =>
            processSingleOrderWithTimeout(order, prices, balance, 10000) // Используем timeout
                .catch(error => console.error(`Ошибка при обработке ордера на ${order.hash_name}:`, error))
        );

        await Promise.allSettled(promises);
        console.log('Все ордера обработаны.');

    } catch (error) {
        console.error('Ошибка при обработке ордеров:', error);
    }

    setTimeout(processOrders, 3000);
}

async function fetchOrders() {
    try {
        const response = await fetch(orderUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при чтении ордеров: ${response.status}, ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при чтении ордеров:', error);
        return [];
    }
}

async function fetchOrdersFromAPI() {
    try {
        const response = await fetch(ordersUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при получении ордеров: ${response.status}, ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            return data.orders;
        } else {
            console.error('Не удалось получить ордера:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Ошибка при получении ордеров:', error);
        return [];
    }
}

async function fetchPrices() {
    try {
        const response = await fetch(pricesUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при получении цен: ${response.status}`);
        }
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error('Ошибка при получении цен:', error);
        return [];
    }
}

async function fetchBalance() {
    try {
        const response = await fetch(balanceUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при получении баланса: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error('Не удалось получить баланс');
        }
        return data;
    } catch (error) {
        console.error('Ошибка при получении баланса:', error);
        return { money: 0, currency: 'RUB' };
    }
}

async function processSingleOrder(order, prices, balance) {
    // Находим цену для текущего ордера
    const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);

    if (priceInfo) {
        const currentPrice = parseFloat(priceInfo.price);
        const orderPrice = parseFloat(order.price);

        // Сравнение currentPrice с myOrders.price
        const myOrders = await fetchOrdersFromAPI();
        const myOrder = myOrders.find(o => o.hash_name === order.hash_name);

        if (myOrder) {
            const myOrderPrice = parseFloat(myOrder.price) / 100;
            console.log(myOrderPrice);
            console.log(currentPrice);
            if (currentPrice == myOrderPrice) {
                console.log(`Текущая цена ${currentPrice} равна цене ордера ${myOrderPrice} для ${order.hash_name}`);
            } else if (currentPrice < orderPrice) {
                console.log(`Обновление ордера на ${order.hash_name} по цене ${currentPrice + 0.01}`);
                // Обновляем ордер с новой ценой
                await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
            } else if (currentPrice > orderPrice) {
                console.log(`Текущая цена на ${order.hash_name} (${currentPrice}) выше цены ордера (${orderPrice}). Выставляем ордер по цене 1.`);
                // Выставляем ордер по цене 1
                await addOrder(order.hash_name, 1, 1, balance);
            } else {
                console.log(`Текущая цена на ${order.hash_name} (${currentPrice}) не ниже цены ордера (${orderPrice}).`);
            }
        } else {
            if (currentPrice < orderPrice) {
                console.log(`Обновление ордера на ${order.hash_name} по цене ${currentPrice + 0.01}`);
                // Обновляем ордер с новой ценой
                await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
            } else if (currentPrice > orderPrice) {
                console.log(`Текущая цена на ${order.hash_name} (${currentPrice}) выше цены ордера (${orderPrice}). Выставляем ордер по цене 1.`);
                // Выставляем ордер по цене 1
                await addOrder(order.hash_name, 1, 1, balance);
            } else {
                console.log(`Текущая цена на ${order.hash_name} (${currentPrice}) не ниже цены ордера (${orderPrice}).`);
            }
        }
    } else {
        console.log(`Цена для ${order.hash_name} не найдена.`);
    }
}


async function addOrder(marketHashName, count, price, balance) {
    const orderItem = {
        hash_name: marketHashName,
        price: parseFloat(price)
    };

    if (balance.money < price) {
        console.error(`Недостаточно средств для ордера на ${marketHashName}`);
        return;
    }
    try {
        const response = await fetch(addOrderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: apiKey,
                market_hash_name: marketHashName,
                count: count,
                price: Math.round(price * 100)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка при добавлении ордера: ${response.status}, Текст ошибки: ${errorText}`);
            throw new Error(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            console.log(`Ордер на предмет ${marketHashName} успешно добавлен.`);
        } else {
            console.error(`Ошибка при добавлении ордера: ${data.message}`);
        }
    } catch (error) {
        console.error(`Ошибка при добавлении ордера: ${error}`);
    }
}

async function saveOrderToFile(orderItem, allOrders) {
    try {
        const existingOrderIndex = allOrders.findIndex(order => order.hash_name === orderItem.hash_name);

        if (existingOrderIndex !== -1) {
            allOrders[existingOrderIndex] = orderItem;
        } else {
            allOrders.push(orderItem);
        }

        const response = await fetch(saveOrderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allOrders)
        });

        if (!response.ok) {
            throw new Error(`Ошибка при сохранении ордера: ${response.status}`);
        }

        console.log(`Ордер на ${orderItem.hash_name} успешно сохранен.`);
    } catch (error) {
        console.error(`Ошибка при сохранении ордера: ${error}`);
    }
}

async function displayOrders() {
    try {
        const orders = await fetchOrders();
        ordersTable.innerHTML = '';

        orders.forEach(order => {
            const row = ordersTable.insertRow();
            const cellHashName = row.insertCell(0);
            const cellPrice = row.insertCell(1);

            cellHashName.textContent = order.hash_name;
            cellPrice.textContent = order.price;
        });
    } catch (error) {
        console.error('Ошибка при отображении ордеров:', error);
    }
}

async function displayBalance() {
    try {
        const balance = await fetchBalance();
        balanceDiv.textContent = `Баланс: ${balance.money} ${balance.currency}`;
    } catch (error) {
        console.error('Ошибка при отображении баланса:', error);
        balanceDiv.textContent = 'Ошибка при получении баланса';
    }
}

async function handleAddOrderForm() {
    const form = document.getElementById('addOrderForm');
    const formData = new FormData(form);
    const hashName = formData.get('hashName');
    const price = parseFloat(formData.get('price'));
    const balance = await fetchBalance();

    if (!hashName || isNaN(price) || price <= 0) {
        alert('Пожалуйста, введите корректные данные.');
        return;
    }

    const orderItem = {
        hash_name: hashName,
        price: price
    };

    const response = await fetch(saveOrderUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderItem)
    });

    if (!response.ok) {
        console.error(`Ошибка при сохранении ордера: ${response.status}, ${response.statusText}`);
        return;
    }

    const result = await response.json();
    if (result.success) {
        console.log('Ордер успешно сохранен.');
    } else {
        console.error('Ошибка при сохранении ордера:', result.message);
    }

    form.reset();
    displayOrders();
}

// Функция для паузы на заданное количество миллисекунд
function sleep(ms) {
    return new Promise(resolve => {
        console.log("Пауза началась на", ms, "мс");
        setTimeout(() => {
            console.log("Пауза завершена через", ms, "мс");
            resolve();
        }, ms);
    });
}
