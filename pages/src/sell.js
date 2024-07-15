const balanceUrl = 'http://localhost:8080/api/get-money';
const apiListUrl = 'http://localhost:8080/api/list';
const orderUrl = 'http://localhost:8080/api/orders';
const pricesUrl = 'http://localhost:8080/api/prices';
const addOrderUrl = 'http://localhost:8080/api/set-order';
const inventoryUrl = 'http://localhost:8080/api/my-inventory';
const addToSaleUrl = 'http://localhost:8080/api/add-to-sale';
const searchItemUrl = 'http://localhost:8080/api/search-item-by-hash-name';
const setPriceUrl = 'http://localhost:8080/api/set-price';

const apiSelect = document.getElementById('apiSelect');
const accountBalance = document.getElementById('accountBalance');
const balanceDiv = document.getElementById('balance');

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

            // Запуск мониторинга и обновления цен для всех API
            setInterval(() => monitorInventory(apis.map(api => api.url)), 30000); // Проверка каждые 30 секунд
            setInterval(() => updatePrices(apis.map(api => api.url)), 10000); // Обновление цен каждые 10 секунд
            apis.forEach(api => startMonitoring(api.url)); // Запуск мониторинга для каждого API
        } catch (error) {
            console.error(`Ошибка при загрузке API: ${error.message}`);
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

    async function fetchInventory(apiUrl) {
        try {
            const response = await fetch(`${inventoryUrl}?key=${apiUrl}`);
            if (!response.ok) {
                throw new Error(`Ошибка при получении инвентаря: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка при получении инвентаря: ${error.message}`);
            return { success: false, items: [] };
        }
    }

    async function addToSale(apiUrl, itemId, price, currency) {
        try {
            const response = await fetch(`http://localhost:8080/api/add-to-sale`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: apiUrl, id: itemId, price, cur: currency })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка при выставлении на продажу: ${response.status}, ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка при выставлении на продажу: ${error.message}`);
            return { success: false };
        }
    }

    async function fetchMinPrice(apiUrl, marketHashName) {
        try {
            const response = await fetch(`${searchItemUrl}?key=${apiUrl}&hash_name=${encodeURIComponent(marketHashName)}`);
            if (!response.ok) {
                throw new Error(`Ошибка при получении минимальной цены: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.data.length > 0) {
                return data.data[0].price;
            } else {
                throw new Error('Не удалось получить минимальную цену');
            }
        } catch (error) {
            console.error(`Ошибка при получении минимальной цены: ${error.message}`);
            return null;
        }
    }

    async function updatePrices(apiUrls) {
        for (const apiUrl of apiUrls) {
            try {
                const inventoryData = await fetchInventory(apiUrl);
                if (!inventoryData.success) {
                    console.error('Не удалось получить инвентарь для обновления цен.');
                    return;
                }

                const promises = inventoryData.items.map(async item => {
                    const minPrice = await fetchMinPrice(apiUrl, item.market_hash_name);
                    if (minPrice !== null) {
                        const price = Math.round(minPrice); // Цена в копейках
                        await setPrice(apiUrl, item.id, price, 'RUB');
                    } else {
                        console.error(`Не удалось получить минимальную цену для ${item.market_hash_name}.`);
                    }
                });

                await Promise.all(promises);
            } catch (error) {
                console.error(`Ошибка при обновлении цен: ${error.message}`);
            }
        }
    }

    async function setPrice(apiUrl, itemId, price, currency) {
        try {
            const response = await fetch(`http://localhost:8080/api/set-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: apiUrl, item_id: itemId, price, cur: currency })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка при установке цены: ${response.status}, ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                console.log(`Цена на предмет с ID ${itemId} успешно установлена.`);
            } else {
                console.error(`Не удалось установить цену на предмет с ID ${itemId}.`);
            }
        } catch (error) {
            console.error(`Ошибка при установке цены на предмет с ID ${itemId}: ${error.message}`);
        }
    }

    async function sellItems(apiUrl) {
        console.log(apiUrl);
        const inventoryData = await fetchInventory(apiUrl);
        if (!inventoryData.success) {
            console.error('Не удалось получить инвентарь для продажи.');
            return;
        }

        const promises = inventoryData.items.map(async item => {
            const minPrice = await fetchMinPrice(apiUrl, item.market_hash_name);
            if (minPrice !== null) {
                const price = Math.round(minPrice); // Цена в копейках
                const result = await addToSale(apiUrl, item.id, price, 'RUB');
                if (result.success) {
                    console.log(`Предмет ${item.market_hash_name} успешно выставлен на продажу по цене ${price / 100} RUB.`);
                } else {
                    console.error(`Не удалось выставить предмет ${item.market_hash_name} на продажу.`);
                }
            } else {
                console.error(`Не удалось получить минимальную цену для ${item.market_hash_name}.`);
            }
        });

        await Promise.all(promises);
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
            console.error(`Ошибка при чтении ордеров: ${error.message}`);
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
            console.error(`Ошибка при получении цен: ${error.message}`);
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
            const orders = await fetchOrders();
            if (orders.length === 0) {
                console.log('Нет ордеров для обработки.');
                return;
            }

            const prices = await fetchPrices();

            let balance;
            try {
                balance = await fetchApiBalance(apiSelect.value);
            } catch (error) {
                balance = { money: 0, currency: 'RUB' }; // Устанавливаем баланс в 0 при ошибке
            }

            const promises = orders.map(order =>
                processSingleOrderWithTimeout(order, prices, balance, 10000)
                    .catch(error => console.error(`Ошибка при обработке ордера на ${order.hash_name}: ${error.message}`))
            );

            await Promise.allSettled(promises);
        } catch (error) {
            console.error(`Ошибка при обработке ордеров: ${error.message}`);
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
                    if (discountedPrice === currentPrice) {
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (currentPrice > discountedPrice) {
                        await addOrder(order.hash_name, 1, 1, balance);
                    } else if (discountedPrice > currentPrice) {
                        await addOrder(order.hash_name, 1, currentPrice + 0.01, balance);
                    }
                }
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
            console.error(`Ошибка при получении данных о предмете ${marketHashName}: ${error.message}`);
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
            console.error(`API ключ для ${hashName} не найден.`);
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
                console.error(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
                throw new Error(`Ошибка при добавлении ордера: ${response.status}, ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                console.log(`Ордер на предмет ${hashName} успешно добавлен.`);
            } else {
                console.error(`Ошибка при добавлении ордера: ${data.message}`);
            }
        } catch (error) {
            console.error(`Ошибка при добавлении ордера: ${error.message}`);
        }
    }

    async function monitorInventory(apiUrls) {
        for (const apiUrl of apiUrls) {
            await sellItems(apiUrl);
        }
    }

    async function transferBalance(amount, userApiKey, pay_pass = '15122005') {
        const response = await fetch(`http://localhost:8080/api/transfer-balance/${amount}/o7XrJgt38LM72UmT3f9i8NhTOxFY0cD?key=${userApiKey}&pay_pass=${pay_pass}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка при переносе баланса: ${response.statusText}. Сообщение сервера: ${errorData.message}`);
        }

        const result = await response.json();
        console.log(`Баланс успешно перенесен: ${JSON.stringify(result)}`);
    }

    function getUnixTime(minutesAgo = 0) {
        return Math.floor((Date.now() - (minutesAgo * 60 * 1000)) / 1000);
    }

    async function checkSalesAndTransfer(apiKey) {
        try {
            const currentDateUnix = getUnixTime();
            const fiveMinutesAgoUnix = getUnixTime(5);

            const historyUrl = `http://localhost:8080/api/history?key=${apiKey}&date=${fiveMinutesAgoUnix}&date_end=${currentDateUnix}`;
            const response = await fetch(historyUrl);
            console.log(response);
            if (!response.ok) {
                throw new Error(`Ошибка при получении истории продаж: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.data) {
                let totalSoldAmount = 0;
                data.data.forEach(item => {
                    if (item.event === 'sell') {
                        totalSoldAmount += parseFloat(item.received);
                    }
                });

                if (totalSoldAmount > 0) {
                    await transferBalance(totalSoldAmount, apiKey);
                    console.log(`Перенесено ${totalSoldAmount} на основной баланс.`);
                }
            } else {
                console.log('Нет продаж за последние 5 минут.');
            }
        } catch (error) {
            console.error(`Ошибка при проверке продаж и переносе баланса: ${error.message}`);
        }
    }

    function startMonitoring(apiKey) {
        setInterval(() => checkSalesAndTransfer(apiKey), 60000); // Каждую минуту
    }

    fetchBalance();
    loadApis();
    processOrders();
});
