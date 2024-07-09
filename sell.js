const balanceUrl = 'http://localhost:8080/api/get-money';
const apiListUrl = 'http://localhost:8080/api/list';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const addOrderUrl = 'http://localhost:8080/api/set-order';

const apiSelect = document.getElementById('apiSelect');
const accountBalance = document.getElementById('accountBalance');
const balanceDiv = document.getElementById('balance');

// Функция для вывода сообщений в консоль браузера
function logToConsole(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Функция для вывода сообщений об ошибках
function displayError(message) {
    logToConsole(`Ошибка: ${message}`, 'error');
}

// Функция для вывода предупреждений
function displayWarning(message) {
    logToConsole(`Предупреждение: ${message}`, 'warning');
}

document.addEventListener('DOMContentLoaded', () => {
    if (!apiSelect) {
        console.error('Не удается найти элемент DOM: apiSelect.');
        return;
    }

    async function loadApis() {
        try {
            const response = await fetch(apiListUrl);
            const apis = await response.json();
            apis.forEach(api => {
                const option = document.createElement('option');
                option.value = api.url;
                option.textContent = api.name;
                apiSelect.appendChild(option);

                // Отображаем баланс для первого API в списке
                if (apis.length > 0) {
                    fetchApiBalance(apis[0].url);
                }
            });
        } catch (error) {
            displayError(`Ошибка при загрузке API: ${error.message}`);
        }
    }

    async function fetchApiBalance(apiUrl) {
        try {
            const response = await fetch(`${balanceUrl}?key=${apiUrl}`);
            if (!response.ok) {
                throw new Error(`Ошибка при получении баланса: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                balanceDiv.textContent = `Баланс: ${data.money} ${data.currency}`;
            } else {
                balanceDiv.textContent = 'Не удалось получить баланс';
            }
        } catch (error) {
            balanceDiv.textContent = `Ошибка: ${error.message}`;
        }
    }

    async function fetchBalance() {
        try {
            const response = await fetch(`${balanceUrl}?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD`);
            if (!response.ok) {
                throw new Error(`Ошибка при получении баланса: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                accountBalance.textContent = `Баланс: ${data.money} ${data.currency}`;
            } else {
                accountBalance.textContent = 'Не удалось получить баланс';
            }
        } catch (error) {
            accountBalance.textContent = `Ошибка: ${error.message}`;
        }
    }

    async function fetchOrders() {
        try {
            const selectedApiUrl = apiSelect.value;
            const response = await fetch(`${orderUrl}?key=${selectedApiUrl}`);
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
            let balance;
            try {
                balance = await fetchApiBalance(apiSelect.value);
                logToConsole(`Текущий баланс: ${balance.money} ${balance.currency}`);
            } catch (error) {
                displayError(`Ошибка при получении баланса: ${error.message}`);
                balance = { money: 0, currency: 'RUB' }; // Устанавливаем баланс в 0 при ошибке
            }

            const promises = orders.map(order =>
                processSingleOrderWithTimeout(order, prices, balance, 10000)
                    .catch(error => logToConsole(`Ошибка при обработке ордера на ${order.hash_name}: ${error.message}`, 'error'))
            );

            await Promise.allSettled(promises);
            logToConsole('Все ордера обработаны.');
        } catch (error) {
            displayError(`Ошибка при обработке ордеров: ${error.message}`);
        }

        setTimeout(processOrders, 3000);
    }

    async function processSingleOrder(order, prices, balance) {
        const itemData = await fetchItemPrice(order.hash_name);
        const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);
        if (priceInfo) {
            const currentPrice = parseFloat(priceInfo.price);
            if (itemData) {
                const averagePrice = itemData.average;
                const discountedPrice = parseFloat((averagePrice * 0.9).toFixed(2));
                if (averagePrice) {
                    logToConsole(`Средняя цена для ${order.hash_name}: ${averagePrice}`);
                    logToConsole(`Цена со скидкой 10%: ${discountedPrice}`);
                    if (discountedPrice === currentPrice) {
                        logToConsole(`Текущая цена ${discountedPrice} равна цене ордера ${currentPrice} для ${order.hash_name}`);
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (currentPrice > discountedPrice) {
                        logToConsole(`Текущая цена на ${order.hash_name} (${currentPrice}) выше цены ордера (${discountedPrice}). Выставляем ордер по цене 1.`);
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (discountedPrice > currentPrice) {
                        logToConsole(`Текущая цена ${discountedPrice} больше ${currentPrice} для ${order.hash_name}`);
                        await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
                    } else {
                        console.log(`Unexpected condition for ${order.hash_name}. Discounted price: ${discountedPrice}, Current price: ${currentPrice}`);
                        console.log(typeof discountedPrice, typeof currentPrice);
                    }
                }
            } else {
                logToConsole(`Информация о предмете ${order.hash_name} не найдена.`);
            }
        }
    }

    async function fetchItemPrice(marketHashName) {
        const selectedApiUrl = apiSelect.value;
        const apiUrl = `http://localhost:8080/api/get-item-info?market_hash_name=${encodeURIComponent(marketHashName)}&key=${selectedApiUrl}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Ошибка при получении данных о предмете: ${response.status}, ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && data.data && data.data[marketHashName]) {
                return data.data[marketHashName];
            } else {
                throw new Error(`Не удалось получить данные о предмете: ${data.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            displayError(`Ошибка при получении данных о предмете ${marketHashName}: ${error.message}`);
            return null;
        }
    }

    async function fetchOrderApiKey(hashName) {
        try {
            const orders = await fetchOrders();
            const order = orders.find(item => item.hash_name === hashName);
            return order ? order.url : null;
        } catch (error) {
            console.error(`Ошибка при получении API ключа: ${error.message}`);
            return null;
        }
    }

    async function addOrder(hashName, count, price, balance) {
        const apiKey = await fetchOrderApiKey(hashName);
        if (!apiKey) {
            displayError(`API ключ для ${hashName} не найден.`);
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
                    market_hash_name: hashName,
                    count: count,
                    price: Math.round(price * 100)
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
                throw new Error(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                logToConsole(`Ордер на предмет ${hashName} успешно добавлен.`);
            } else {
                console.log(`Ошибка при добавлении ордера: ${data.message}`);
            }
        } catch (error) {
            console.log(`Ошибка при добавлении ордера: ${error.message}`);
        }
    }

    apiSelect.addEventListener('change', () => {
        const selectedApiUrl = apiSelect.value;
        fetchApiBalance(selectedApiUrl);
    });
    fetchBalance();
    loadApis();
    processOrders();
});
