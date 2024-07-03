
const ordersUrl = 'http://localhost:8080/api/get-orders?page=0';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const balanceUrl = 'http://localhost:8080/api/get-money';
const addOrderUrl = 'http://localhost:8080/api/set-order';
const saveOrderUrl = 'http://localhost:8080/api/save-orders';
const apiListUrl = 'http://localhost:8080/api/list';
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
    //consoleOutput.scrollTop = consoleOutput.scrollHeight;
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
    // Элементы DOM
    const apiSelect = document.getElementById('apiSelect');
    const addOrderForm = document.getElementById('addOrderForm');
    const consoleOutput = document.getElementById('consoleOutput');

    if (!apiSelect || !addOrderForm || !consoleOutput) {
        console.error('Не удается найти один из элементов DOM: apiSelect, addOrderForm, или consoleOutput.');
        return;
    }

    // Функция для вывода сообщений в консоль
    function logToConsole(message, type = 'info') {
        const newMessage = document.createElement('div');
        newMessage.classList.add('console-message');
        newMessage.classList.add(type);
        newMessage.textContent = message;
        consoleOutput.appendChild(newMessage);
        // Прокручиваем вниз при добавлении нового сообщения
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Функция для вывода ошибок
    function displayError(message) {
        logToConsole(`Ошибка: ${message}`, 'error');
    }

    // Загрузка доступных API
    async function loadApis() {
        try {
            const response = await fetch(apiListUrl);
            const apis = await response.json();
            apis.forEach(api => {
                const option = document.createElement('option');
                option.value = api.url;
                option.textContent = api.name;
                apiSelect.appendChild(option);
            });
        } catch (error) {
            displayError(`Ошибка при загрузке API: ${error.message}`);
        }
    }

    // Обработка формы добавления заказа
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
            // Отправляем данные на сервер для сохранения
            const response = await fetch(saveOrderUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderItem)
            });

            if (!response.ok) {
                throw new Error(`Ошибка: ${response.statusText}`);
            }

            const result = await response.json();

            // Отображаем сообщение об успешном добавлении
            logToConsole(`Заказ добавлен: ${JSON.stringify(result)}`);

            // Обновляем отображение ордеров
            displayOrders();
        } catch (error) {
            displayError(`Ошибка при добавлении заказа: ${error.message}`);
        }
    });

    // Запуск обработки заказов
    startOrderProcessing();
    displayOrders();
    displayBalance();

    // Загрузка доступных API
    loadApis();

    // Обновление отображаемых ордеров при изменении выбранного API
    apiSelect.addEventListener('change', displayOrders);
});

// Функция для обработки ордеров
function startOrderProcessing() {
    processOrders();
}

// Обработка отдельного ордера с тайм-аутом
async function processSingleOrderWithTimeout(order, prices, balance, timeout = 10000) {
    return Promise.race([
        processSingleOrder(order, prices, balance),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Время обработки ордера истекло')), timeout)
        )
    ]);
}

// Основная функция обработки ордеров
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
                .catch(error => console.log(`Ошибка при обработке ордера на ${order.hash_name}: ${error.message}`))
        );

        await Promise.allSettled(promises);
        logToConsole('Все ордера обработаны.');

    } catch (error) {
        displayError(`Ошибка при обработке ордеров: ${error.message}`);
    }

    setTimeout(processOrders, 3000);
}

// Получение ордеров
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

// Получение ордеров из API
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

// Получение цен
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

// Получение баланса
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

// Обработка отдельного ордера
async function processSingleOrder(order, prices, balance) {
    const itemData = await fetchItemPrice(order.hash_name);
    const priceInfo = prices.find(item => item.market_hash_name === order.hash_name);
    if (priceInfo) {
         currentPrice = parseFloat(priceInfo.price);
        if (itemData) {
            const averagePrice = itemData.average;
             discountedPrice = averagePrice * 0.9;
          
            discountedPrice = parseFloat(discountedPrice.toFixed(2));
            currentPrice = parseFloat(currentPrice.toFixed(2));
            if (averagePrice) {
                
                logToConsole(`Средняя цена для ${order.hash_name}: ${averagePrice}`);
                logToConsole(`Цена со скидкой 10%: ${discountedPrice}`);
                    if (discountedPrice === currentPrice) {
                        logToConsole(`Текущая цена ${discountedPrice} равна цене ордера ${myOrderPrice} для ${order.hash_name}`);
                        console.log(1);
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (currentPrice > discountedPrice) {
                        logToConsole(`Текущая цена на ${order.hash_name} (${discountedPrice}) выше цены ордера (${currentPrice}). Выставляем ордер по цене 1.`);
                        console.log(2);
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (discountedPrice > currentPrice) {
                        logToConsole(`Текущая цена ${discountedPrice} больше ${currentPrice} для ${order.hash_name}`);
                        console.log(3);
                        await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
                    } 
                  else {
                    console.log(`Unexpected condition for ${order.hash_name}. Discounted price: ${discountedPrice}, Current price: ${currentPrice}`);
                    console.log(typeof discountedPrice, typeof currentPrice);
                  }
                
            }
        } else {
            logToConsole(`Информация о предмете ${order.hash_name} не найдена.`);
        }
    }
}

// Получение информации о предмете
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

async function fetchOrderApiKey(hashName) {
    try {
        const orders = await fetchOrders(); // Укажите правильный путь к вашему JSON файлу
      
        const order = orders.find(item => item.hash_name === hashName);
        return order ? order.url : null; // Извлекаем api_key для конкретного hashName
    } catch (error) {
        console.error(`Ошибка при получении API ключа: ${error.message}`);
        return null;
    }
}

async function addOrder(hashName, count, price, balance) {


    
    const apiKey = await fetchOrderApiKey(hashName);
        console.log(`${apiKey} ${hashName}`);
    if (!apiKey) {
        displayError(`API ключ для ${hashName} не найден.`);
        return;
    }

    try {
        const response = await fetch(addOrderUrl, { // Используйте ваш URL для добавления ордера
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: apiKey, // Используем API ключ для этого ордера
                market_hash_name: hashName,
                count: count,
                price: Math.round(price * 100) // Приводим цену к целому числу в центах или копейках
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


// Сохранение ордера в файл
async function saveOrderToFile(orderItem, allOrders) {
    try {
        // Ищем существующий ордер по hash_name
        const existingOrderIndex = allOrders.findIndex(order => order.hash_name === orderItem.hash_name);

        // Если ордер уже существует, обновляем его
        if (existingOrderIndex !== -1) {
            allOrders[existingOrderIndex] = orderItem;
        } else {
            // Если ордер не существует, добавляем его в список
            allOrders.push(orderItem);
        }

        // Сохраняем обновленный список ордеров в файл
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

// Отображение ордеров
async function displayOrders() {
    try {
        const selectedApiUrl = document.getElementById('apiSelect').value;
        const orders = await fetchOrders();
        
        ordersTable.innerHTML = '';

        orders.forEach(order => {
            if(selectedApiUrl == order.url){
            const row = ordersTable.insertRow();
            const cellHashName = row.insertCell(0);
            console.log(order.url);
            cellHashName.textContent = order.hash_name;
            }
        });
    } catch (error) {
        displayError(`Ошибка при отображении ордеров: ${error.message}`);
    }
}

// Получение ордеров с выбранного API
async function fetchOrdersFromApi(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при получении ордеров с ${apiUrl}: ${response.status}, ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
            return data.orders;
        } else {
            throw new Error(`Не удалось получить ордера с ${apiUrl}: ${data.message}`);
        }
    } catch (error) {
        console.log(`Ошибка при получении ордеров с ${apiUrl}: ${error.message}`);
        return [];
    }
}

// Отображение баланса
async function displayBalance() {
    try {
        const balance = await fetchBalance();
        balanceDiv.textContent = `Баланс: ${balance.money} ${balance.currency}`;
    } catch (error) {
        displayError(`Ошибка при отображении баланса: ${error.message}`);
        balanceDiv.textContent = 'Ошибка при получении баланса';
    }
}

// Обработка формы добавления ордера
// Обработка формы добавления ордера
async function handleAddOrderForm() {
    const form = document.getElementById('addOrderForm');
    const formData = new FormData(form);
    const hashName = formData.get('hashName');

    if (!hashName) {
        alert('Пожалуйста, введите корректные данные.');
        return;
    }

    const selectedApiUrl = document.getElementById('apiSelect').value;
    
    // Создаём объект ордера с hash_name и URL выбранного API
    const orderItem = {
        hash_name: hashName,
        url: selectedApiUrl
    };

    // Получаем все существующие ордера (для примера, используем пустой массив)
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

    // Вызываем функцию для сохранения ордера
    await saveOrderToFile(orderItem, allOrders);

    // Сброс формы и обновление отображения ордеров
    form.reset();
    displayOrders();
}

// Пауза
function sleep(ms) {
    return new Promise(resolve => {
        logToConsole(`Пауза началась на ${ms} мс`);
        setTimeout(() => {
            logToConsole(`Пауза завершена через ${ms} мс`);
            resolve();
        }, ms);
    });
}
