const ordersUrl = 'http://localhost:8080/api/get-orders';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const balanceUrl = 'http://localhost:8080/api/get-money';
const addOrderUrl = 'http://localhost:8080/api/set-order';
const saveOrderUrl = 'http://localhost:8080/api/save-orders';
const apiListUrl = 'http://localhost:8080/api/list';
const updateOrderUrlsUrl = 'http://localhost:8080/api/update-all-order-urls';
const transferBalanceUrl = 'http://localhost:8080/api/transfer-balance';
const ordersTable = document.getElementById('ordersTable').querySelector('tbody');
const balanceDiv = document.getElementById('balance');
const accountBalance = document.getElementById('accountBalance');
const updateUrlSelect = document.getElementById('updateUrlSelect');
const updateUrlButton = document.getElementById('updateUrlButton');
const transferBalanceForm = document.getElementById('transferBalanceForm');
const transferApiSelect = document.getElementById('transferApiSelect');

// Функция для вывода сообщений в консоль
function logToConsole(message, type = 'info') {
    const consoleOutput = document.getElementById('consoleOutput');
    const newMessage = document.createElement('div');
    newMessage.classList.add('console-message');
    newMessage.classList.add(type);
    newMessage.textContent = message;
    consoleOutput.appendChild(newMessage);
    // Прокручиваем вниз при добавлении нового сообщения
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
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
    const apiSelect = document.getElementById('apiSelect');
    const addOrderForm = document.getElementById('addOrderForm');
    const consoleOutput = document.getElementById('consoleOutput');

    if (!apiSelect || !addOrderForm || !consoleOutput || !transferBalanceForm || !transferApiSelect) {
        console.error('Не удается найти один из элементов DOM: apiSelect, addOrderForm, consoleOutput, transferBalanceForm, или transferApiSelect.');
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

                const updateOption = document.createElement('option');
                updateOption.value = api.url;
                updateOption.textContent = api.name;
                updateUrlSelect.appendChild(updateOption);

                const transferOption = document.createElement('option');
                transferOption.value = api.url;
                transferOption.textContent = api.name;
                transferApiSelect.appendChild(transferOption);
            });
        } catch (error) {
            displayError(`Ошибка при загрузке API: ${error.message}`);
        }
    }

    async function fetchAccountBalance() {
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

    addOrderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const hashName = document.getElementById('hashName').value;
        const selectedApiUrl = apiSelect.value;

        if (!hashName || !selectedApiUrl) {
            displayError('Пожалуйста, заполните все поля.');
            return;
        }

        const orderItem = {
            hash_name: hashName,
            url: selectedApiUrl
        };

        try {
            const response = await fetch(saveOrderUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderItem)
            });

            if (!response.ok) {
                throw new Error(`Ошибка: ${response.statusText}`);
            }

            const result = await response.json();
            logToConsole(`Заказ добавлен: ${JSON.stringify(result)}`);
            displayOrders();
        } catch (error) {
            displayError(`Ошибка при добавлении заказа: ${error.message}`);
        }
    });

    updateUrlButton.addEventListener('click', async () => {
        const newUrl = updateUrlSelect.value;
        try {
            const response = await fetch(updateOrderUrlsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newUrl })
            });

            if (!response.ok) {
                throw new Error(`Ошибка: ${response.statusText}`);
            }

            const result = await response.json();
            logToConsole(`Все URL ордеров обновлены: ${JSON.stringify(result)}`);
            displayOrders();
        } catch (error) {
            displayError(`Ошибка при обновлении URL ордеров: ${error.message}`);
        }
    });

    transferBalanceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = document.getElementById('amount').value;
        const selectedApiUrl = transferApiSelect.value;

        if (!amount || !selectedApiUrl) {
            displayError('Пожалуйста, заполните все поля.');
            return;
        }

        try {
            const response = await fetch(`${transferBalanceUrl}/${amount * 100}/${selectedApiUrl}?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD&pay_pass=${15122005}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Ошибка: ${response.statusText}. Сообщение сервера: ${errorData.message}`);
            }

            const result = await response.json();
            console.log(`Баланс успешно перенесен: ${JSON.stringify(result)}`);
            fetchAccountBalance(); // Обновляем баланс после переноса
        } catch (error) {
            console.log(`Ошибка при переносе баланса: ${error.message}`);
        }
    });

    startOrderProcessing();
    displayOrders();
    displayBalance();
    loadApis();
    fetchAccountBalance();
    apiSelect.addEventListener('change', displayOrders);
    apiSelect.addEventListener('change', displayBalance);
});

async function startOrderProcessing() {
    processOrders();
}

async function processSingleOrderWithTimeout(order, prices, marketOrders, timeout = 30000) {
    return Promise.race([
        processSingleOrder(order, prices , marketOrders),
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

        const promises = orders.map(async order => {
            const marketOrders = await fetchMarketOrders(order.url); // fetch market orders for the specific API
            return processSingleOrderWithTimeout(order, prices, marketOrders, 10000)
                .catch(error => logToConsole(`Ошибка при обработке ордера на ${order.hash_name}: ${error.message}`, 'error'));
        });

        await Promise.allSettled(promises);
        logToConsole('Все ордера обработаны.');
    } catch (error) {
        displayError(`Ошибка при обработке ордеров: ${error.message}`);
    }

    setTimeout(processOrders, 3000);
}

async function fetchOrders() {
    try {
        const selectedApiUrl = document.getElementById('apiSelect').value;
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

async function fetchMarketOrders(apiKey) {
    try {
        const response = await fetch(`${ordersUrl}?key=${apiKey}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при получении ордеров с рынка: ${response.status}, ${errorText}`);
        }
        const data = await response.json();
        if (data.success) {
            console.log(data);
            return data.orders;
        } else {
            throw new Error('Не удалось получить ордера с рынка');
        }
    } catch (error) {
        displayError(`Ошибка при получении ордеров с рынка: ${error.message}`);
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
        const selectedApiUrl = document.getElementById('apiSelect').value;
        console.log(selectedApiUrl);
        const response = await fetch(`${balanceUrl}?key=${selectedApiUrl}`);
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

async function processSingleOrder(order, prices, marketOrders) {
    const itemData = await fetchItemPrice(order.hash_name);
    const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);
    const marketOrder = marketOrders.find(marketOrder => marketOrder.hash_name === order.hash_name);

    if (priceInfo) {
        const currentPrice = parseFloat(priceInfo.price);
      

        if (itemData) {
            const averagePrice = itemData.average;
            const discountedPrice = parseFloat((averagePrice * 0.9).toFixed(2));
            if (averagePrice && marketOrder) {
                const orderPrice = parseFloat(marketOrder.price);
                logToConsole(`Средняя цена для ${order.hash_name}: ${averagePrice}`);
                logToConsole(`Цена со скидкой 10%: ${discountedPrice}`);
                if (discountedPrice === currentPrice) {
                    logToConsole(`Средняя цена ${discountedPrice} равна цене ордера ${currentPrice} для ${order.hash_name}`);
                    addOrder(order.hash_name, 1, 1);
                } else if (currentPrice > discountedPrice) {
                    logToConsole(`Текущая цена на ${order.hash_name} (${currentPrice}) выше средней цены (${discountedPrice}). Выставляем ордер по цене 1.`);
                    addOrder(order.hash_name, 1, 1);
                } else if (discountedPrice > currentPrice && currentPrice > orderPrice / 100) {
                    logToConsole(`Средняя цена ${discountedPrice} больше ${currentPrice} для ${order.hash_name}`);
                    addOrder(order.hash_name, 1, currentPrice + 0.01);
                } else {
                   
                    console.log(`Unexpected condition for ${order.hash_name}. Discounted price: ${discountedPrice}, Current price: ${currentPrice}`);
                    console.log(typeof discountedPrice, typeof currentPrice);
                }
            }else {
                if (discountedPrice > currentPrice) {
                    logToConsole(`Средняя цена ${discountedPrice} больше ${currentPrice} для ${order.hash_name}`);
                    addOrder(order.hash_name, 1, currentPrice + 0.01);
                }
            }
        } 
    }   
}


async function fetchItemPrice(marketHashName) {
    const selectedApiUrl = document.getElementById('apiSelect').value;
    const apiUrl = `http://localhost:8080/api/get-item-info?market_hash_name=${encodeURIComponent(marketHashName)}&key=${selectedApiUrl}`;
    console.log(apiUrl);
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
        console.log(`Ошибка при получении данных о предмете ${marketHashName}: ${error.message}`);
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

async function addOrder(hashName, count, price) {
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
        const selectedApiUrl = document.getElementById('apiSelect').value;

        ordersTable.innerHTML = '';  // Очищаем таблицу

        orders.forEach(order => {
            if (selectedApiUrl === order.url) {
                const row = ordersTable.insertRow();
                const cellHashName = row.insertCell(0);
                cellHashName.textContent = order.hash_name;

                // Добавляем кнопку удаления
                const cellDelete = row.insertCell(1);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Удалить';
                deleteButton.className = 'delete-button'; // Добавляем класс delete-button
                deleteButton.onclick = () => deleteOrder(order.hash_name);
                cellDelete.appendChild(deleteButton);
                
            }
        });
    } catch (error) {
        displayError(`Ошибка при отображении ордеров: ${error.message}`);
    }
}

async function deleteOrder(hashName) {
    try {
        addOrder(hashName, 1,1);
        const response = await fetch('http://localhost:8080/api/delete-order', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash_name: hashName })
        });
         
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка при удалении ордера: ${response.statusText}. Сообщение сервера: ${errorData.message}`);
        }

        const result = await response.json();
        console.log(`Ордер ${hashName} удален: ${JSON.stringify(result)}`);
        displayOrders();  // Обновляем список ордеров
    } catch (error) {
        console.log(`Ошибка при удалении ордера: ${error.message}`);
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

    const selectedApiUrl = document.getElementById('apiSelect').value;
    const orderItem = {
        hash_name: hashName,
        url: selectedApiUrl
    };

    let allOrders = [];
    try {
        const response = await fetch(saveOrderUrl);
        if (response.ok) {
            allOrders = await response.json();
        } else {
            logToConsole('Не удалось загрузить текущие ордера, сохранение будет выполнено с нуля.');
        }
    } catch (error) {
        displayError(`Ошибка при получении текущих ордеров: ${error.message}`);
    }

    await saveOrderToFile(orderItem, allOrders);
    form.reset();
    displayOrders();
}

orders.js 

