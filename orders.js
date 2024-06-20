const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD';
const ordersUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const balanceUrl = `http://localhost:8080/api/get-money?key=${apiKey}`;
const addOrderUrl = 'http://localhost:8080/api/set-order';
const orderFilePath = 'proxy-server/order_item.json'; // Путь к файлу с заказами
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

async function processOrders() {
    while (true) {
        try {
            console.log('Получаем текущие заказы...');
            const orders = await fetchOrdersFromFile();
            if (orders.length === 0) {
                console.log('Нет ордеров для обработки.');
                return;
            }

            console.log('Получаем текущие цены...');
            const prices = await fetchPrices();

            console.log('Получаем текущий баланс...');
            const balance = await fetchBalance();

            for (const order of orders) {
                await processSingleOrder(order, prices, balance);
            }

            console.log('Все ордера обработаны. Начинаем новый цикл...');
        } catch (error) {
            console.error('Ошибка при обработке ордеров:', error);
        }
    }
}

async function processSingleOrder(order, prices, balance) {
    const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);
    if (priceInfo) {
        const currentPrice = parseFloat(priceInfo.price);
        const orderPrice = parseFloat(order.price);

        if (currentPrice < orderPrice) {
            console.log(`Обновление ордера на ${order.hash_name} по цене ${currentPrice}`);
            await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
        } else {
            console.log(`Ордер на ${order.hash_name} уже обновлен.`);
        }
    } else {
        console.log(`Цена для ${order.hash_name} не найдена.`);
    }
}

async function fetchOrdersFromFile() {
    try {
        const response = await fetch(orderFilePath);
        if (!response.ok) {
            throw new Error(`Ошибка при чтении файла: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при чтении ордеров:', error);
        return [];
    }
}

async function fetchPrices() {
    try {
        const response = await fetch(pricesUrl);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP при получении цен: ${response.status}`);
        }
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error('Ошибка при получении цен:', error);
        return [];
    }
}
async function fetchOrders() {
    try {
        const response = await fetch(ordersUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при чтении файла: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при чтении ордеров:', error);
        return [];
    }
}

async function fetchBalance() {
    try {
        const response = await fetch(balanceUrl);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP при получении баланса: ${response.status}`);
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

async function addOrder(marketHashName, count, price, balance) {
    const orderItem = {
        hash_name: marketHashName,
        price: parseFloat(price)
    };

    if (balance.money < price * count) {
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
                price: Math.round(price * 100) // Конвертируем в копейки
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка HTTP при добавлении ордера: ${response.status}, Текст ошибки: ${errorText}`);
            throw new Error(`Ошибка HTTP при добавлении ордера: ${response.status}, ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            console.log(`Ордер на предмет ${marketHashName} успешно добавлен.`);
            await saveOrderToFile(orderItem); // Сохраняем заказ в файл
        } else {
            console.error(`Ошибка при добавлении ордера: ${data.message}`);
        }
    } catch (error) {
        console.error(`Ошибка при добавлении ордера: ${error}`);
    }
}

async function saveOrderToFile(orderItem) {
    try {
        let orders = await fetchOrdersFromFile();

        const orderIndex = orders.findIndex(order => order.hash_name === orderItem.hash_name);
        if (orderIndex > -1) {
            orders[orderIndex] = orderItem; // Обновляем заказ, если он уже существует
        } else {
            orders.push(orderItem); // Добавляем новый заказ
        }

        await fetch('/save-orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orders, null, 2)
        });

        console.log(`Заказ на ${orderItem.hash_name} успешно сохранен.`);
    } catch (error) {
        console.error(`Ошибка при сохранении заказа: ${error}`);
    }
}
async function displayOrders() {
    try {
        const orders = await fetchOrders();
        ordersTable.innerHTML = ''; // Очищаем таблицу перед заполнением

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
        balanceDiv.textContent = `Текущий баланс: ${balance.money} ${balance.currency}`;
    } catch (error) {
        console.error('Ошибка при отображении баланса:', error);
    }
}

async function handleAddOrderForm() {
    const hashNameInput = document.getElementById('hashName');
    const priceInput = document.getElementById('price');

    const hashName = hashNameInput.value;
    const price = parseFloat(priceInput.value);

    if (!hashName || isNaN(price)) {
        console.error('Неверные данные формы');
        return;
    }

    try {
        const balance = await fetchBalance();
        await addOrder(hashName, 1, price, balance);

        hashNameInput.value = '';
        priceInput.value = '';
    } catch (error) {
        console.error('Ошибка при добавлении ордера через форму:', error);
    }
}

