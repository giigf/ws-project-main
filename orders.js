const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD';
const ordersUrl = 'http://localhost:8080/api/get-orders?page=0';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const balanceUrl = 'http://localhost:8080/api/get-money';
const addOrderUrl = 'http://localhost:8080/api/set-order';
const saveOrderUrl = 'http://localhost:8080/api/save-orders';
const ordersTable = document.getElementById('ordersTable').querySelector('tbody');
const balanceDiv = document.getElementById('balance');

// Функция для вывода сообщений в консоль
function logToConsole(message, type = 'info') {
    const consoleOutput = document.getElementById('consoleOutput');
    const newMessage = document.createElement('div');
    newMessage.classList.add('console-message');
    newMessage.classList.add(type);
    newMessage.textContent = message;
    consoleOutput.appendChild(newMessage);

    // Прокручиваем вниз при добавлении нового сообщения
 //   consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Функция для вывода сообщений об ошибках
function displayError(message) {
    logToConsole(`Ошибка: ${message}`, 'error');
}

// Функция для вывода предупреждений
function displayWarning(message) {
    logToConsole(`Предупреждение: ${message}`, 'warning');
}

// Используем новые функции в коде
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

async function processSingleOrderWithTimeout(order, prices, balance, timeout = 10000) {
    return Promise.race([
        processSingleOrder(order, prices, balance),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Время обработки ордера истекло')), timeout)
        )
    ]);
}



async function processOrders() {
    try {
        logToConsole('Получаем текущие заказы...');
        const orders = await fetchOrders();
        logToConsole(`Найдено ${orders.length} ордеров.`);

        if (orders.length === 0) {
            logToConsole('Нет ордеров для обработки.');
            return;
        }

        logToConsole('Получаем текущие цены...');
        const prices = await fetchPrices();
        logToConsole(`Получено ${prices.length} цен.`);

        logToConsole('Получаем текущий баланс...');
        const balance = await fetchBalance();
        logToConsole(`Текущий баланс: ${balance.money} ${balance.currency}`);

        const promises = orders.map(order =>
            processSingleOrderWithTimeout(order, prices, balance, 10000)
                .catch(error => displayError(`Ошибка при обработке ордера на ${order.hash_name}: ${error.message}`))
        );

        await Promise.allSettled(promises);
        logToConsole('Все ордера обработаны.');

    } catch (error) {
        displayError(`Ошибка при обработке ордеров: ${error.message}`);
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
        displayError(`Ошибка при чтении ордеров: ${error.message}`);
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
            displayError(`Не удалось получить ордера: ${data.message}`);
            return [];
        }
    } catch (error) {
        displayError(`Ошибка при получении ордеров: ${error.message}`);
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
        displayError(`Ошибка при получении цен: ${error.message}`);
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
        displayError(`Ошибка при получении баланса: ${error.message}`);
        return { money: 0, currency: 'RUB' };
    }
}

async function processSingleOrder(order, prices, balance) {
    const itemData = await fetchItemPrice(order.hash_name);
    const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);
    if(priceInfo){
    const currentPrice = parseFloat(priceInfo.price);
    if (itemData) {
        const averagePrice = itemData.average;
        const discountedPrice = averagePrice * 0.9;
        const orderPrice = parseFloat(order.price);

        if (averagePrice) {
            logToConsole(`Средняя цена для ${order.hash_name}: ${averagePrice}`);
            logToConsole(`Цена со скидкой 10%: ${discountedPrice}`);
            
            const myOrders = await fetchOrdersFromAPI();
            const myOrder = myOrders.find(o => o.hash_name === order.hash_name);

            if (myOrder) {
                const myOrderPrice = parseFloat(myOrder.price) / 100;
                console.log(`name: ${order.hash_name}    ${myOrderPrice}`);
                if (discountedPrice === myOrderPrice) {
                    logToConsole(`Текущая цена ${discountedPrice} равна цене ордера ${myOrderPrice} для ${order.hash_name}`);
                }else if (currentPrice > discountedPrice) {
                    logToConsole(`Текущая цена на ${order.hash_name} (${discountedPrice}) выше цены ордера (${currentPrice}). Выставляем ордер по цене 1.`);
                    await addOrder(order.hash_name, 1, 1, balance);
                }else if (discountedPrice < myOrderPrice){
                    logToConsole(`Текущая цена ${discountedPrice} меньше ${myOrderPrice} для ${order.hash_name}`);
                    await addOrder(order.hash_name, 1, 1, balance);
                } else if (currentPrice > myOrderPrice) {
                    logToConsole(`Обновление ордера на ${order.hash_name} по цене ${currentPrice + 0.01}`);
                    await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
                }  else {
                    logToConsole(`Текущая цена на ${order.hash_name} (${discountedPrice}) не ниже цены ордера (${myOrderPrice}).`);
                    await addOrder(order.hash_name, 1, 1, balance);
                }
            }
        } else {
            logToConsole(`Средняя цена для ${order.hash_name} не найдена.`);
        }
    } else {
        logToConsole(`Информация о предмете ${order.hash_name} не найдена.`);
    }
}
}

async function fetchItemPrice(marketHashName) {
    // Новый URL для локального маршрута
    const apiUrl = `http://localhost:8080/api/get-item-info?market_hash_name=${encodeURIComponent(marketHashName)}`;

    try {
        // Выполняем запрос к локальному серверу
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при получении данных о предмете: ${response.status}, ${response.statusText}`);
        }

        // Обрабатываем ответ
        const data = await response.json();
        if (data.success && data.data && data.data[marketHashName]) {
            return data.data[marketHashName];
        } else {
            throw new Error(`Не удалось получить данные о предмете: ${data.message || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        // Отображаем ошибку
        displayError(`Ошибка при получении данных о предмете ${marketHashName}: ${error.message}`);
        return null;
    }
}

async function addOrder(marketHashName, count, price, balance) {
    if (balance.money < price) {
        displayError(`Недостаточно средств для ордера на ${marketHashName}`);
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
            displayError(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
            throw new Error(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            logToConsole(`Ордер на предмет ${marketHashName} успешно добавлен.`);
        } else {
            displayError(`Ошибка при добавлении ордера: ${data.message}`);
        }
    } catch (error) {
        displayError(`Ошибка при добавлении ордера: ${error.message}`);
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

        logToConsole(`Ордер на ${orderItem.hash_name} успешно сохранен.`);
    } catch (error) {
        displayError(`Ошибка при сохранении ордера: ${error.message}`);
    }
}

async function displayOrders() {
    try {
        const orders = await fetchOrders();
        ordersTable.innerHTML = '';

        orders.forEach(order => {
            const row = ordersTable.insertRow();
            const cellHashName = row.insertCell(0);
           

            cellHashName.textContent = order.hash_name;
         
        });
    } catch (error) {
        displayError(`Ошибка при отображении ордеров: ${error.message}`);
    }
}

async function displayBalance() {
    try {
        const balance = await fetchBalance();
        balanceDiv.textContent = `Баланс: ${balance.money} ${balance.currency}`;
    } catch (error) {
        displayError(`Ошибка при отображении баланса: ${error.message}`);
        balanceDiv.textContent = 'Ошибка при получении баланса';
    }
}

async function handleAddOrderForm() {
    const form = document.getElementById('addOrderForm');
    const formData = new FormData(form);
    const hashName = formData.get('hashName');
    if (!hashName) {
        alert('Пожалуйста, введите корректные данные.');
        return;
    }

    const orderItem = {
        hash_name: hashName,
    };

    const response = await fetch(saveOrderUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderItem)
    });

    if (!response.ok) {
        displayError(`Ошибка при сохранении ордера: ${response.status}, ${response.statusText}`);
        return;
    }

    const result = await response.json();
    if (result.success) {
        logToConsole('Ордер успешно сохранен.');
    } else {
        displayError(`Ошибка при сохранении ордера: ${result.message}`);
    }

    form.reset();
    displayOrders();
}

function sleep(ms) {
    return new Promise(resolve => {
        logToConsole(`Пауза началась на ${ms} мс`);
        setTimeout(() => {
            logToConsole(`Пауза завершена через ${ms} мс`);
            resolve();
        }, ms);
    });
}
