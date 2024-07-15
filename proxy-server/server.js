const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');
const app = express();
const PORT = 8080;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8081');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(bodyParser.json());

const apiDataFile = path.join(__dirname, 'api_data.json');
const ordersFilePath = path.join(__dirname, 'order_item.json');
let dynamicApis = [];

async function loadApis() {
    try {
        const data = await fs.readFile(apiDataFile, 'utf8');
        dynamicApis = JSON.parse(data);
        dynamicApis.forEach(api => addDynamicEndpoint(api.name, api.url));
    } catch (error) {
        console.error(`Ошибка загрузки данных API: ${error.message}`);
    }
}

function addDynamicEndpoint(name, url) {
    app.get(`/api/${name}`, (req, res) => {
        const worker = new Worker(path.join(__dirname, 'worker.js'), {
            workerData: { url }
        });

        worker.on('message', data => {
            if (data.error) {
                console.error(`Ошибка получения данных с ${name}: ${data.error}`);
                res.status(500).json({ type: 'error', message: data.error });
            } else {
                res.json(data);
            }
        });

        worker.on('error', error => {
            console.error(`Ошибка в worker thread: ${error.message}`);
            res.status(500).json({ type: 'error', message: 'Ошибка в worker thread' });
        });
    });
}

app.post('/api/add', async (req, res) => {
    const { name, url } = req.body;

    if (!name || !url) {
        return res.status(400).json({ error: 'Имя и URL API обязательны' });
    }

    if (dynamicApis.some(api => api.name === name)) {
        return res.status(400).json({ error: 'API с таким именем уже существует' });
    }

    const newApi = { name, url };
    dynamicApis.push(newApi);
    addDynamicEndpoint(name, url);

    try {
        await fs.writeFile(apiDataFile, JSON.stringify(dynamicApis, null, 2));
        res.json({ message: `API ${name} добавлен`, endpoint: `/api/${name}` });
    } catch (error) {
        console.error(`Ошибка сохранения данных API: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка сохранения данных API' });
    }
});

app.get('/api/list', async (req, res) => {
    try {
        const data = await fs.readFile(apiDataFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Ошибка чтения списка API: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка чтения списка API' });
    }
});

function handleRequestWithWorker(targetUrl, res) {
    console.log(`Starting worker for URL: ${targetUrl}`);
    const worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: { url: targetUrl }
    });

    worker.on('message', data => {
        if (data.error) {
            console.error(`Ошибка получения данных: ${data.error}`);
            res.status(500).json({ type: 'error', message: data.error });
        } else {
            res.json(data);
        }
    });

    worker.on('error', error => {
        console.error(`Ошибка в worker thread: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка в worker thread' });
    });

    worker.on('exit', code => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        } else {
            console.log(`Worker completed successfully for URL: ${targetUrl}`);
        }
    });
}

app.get('/api/get-ws-token', (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-ws-token?key=${req.query.key}`;
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/dictionary-names', (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/dictionary/names.json';
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/items', async (req, res) => {
    const filePath = path.join(__dirname, 'items_data.json');

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Ошибка чтения файла items: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка чтения файла items' });
    }
});

app.post('/api/save-items', async (req, res) => {
    const items = req.body;
    const filePath = path.join(__dirname, 'items_data.json');

    try {
        await fs.writeFile(filePath, JSON.stringify(items, null, 2));
        res.status(200).json({ type: 'success', message: 'Файл успешно сохранен' });
    } catch (error) {
        console.error(`Ошибка сохранения файла items: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка сохранения файла items' });
    }
});

app.get('/api/get-orders', (req, res) => {
    const page = req.query.page || 0;
    const targetUrl = `https://market.csgo.com/api/v2/get-orders?key=${req.query.key}&page=${page}`;
    handleRequestWithWorker(targetUrl, res);
});

app.post('/api/set-order', (req, res) => {
    const { key, market_hash_name, count, price, partner, token } = req.body;

    if (!market_hash_name || !count || !price) {
        return res.status(400).json({ type: 'error', message: 'Отсутствуют обязательные параметры' });
    }

    const query = new URLSearchParams({
        key,
        market_hash_name,
        count: count.toString(),
        price: price.toString(),
        partner: partner || '',
        token: token || ''
    });

    const targetUrl = `https://market.csgo.com/api/v2/set-order?${query.toString()}`;
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/prices', (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/prices/orders/RUB.json';
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/get-money', (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-money?key=${req.query.key}`;
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/orders', async (req, res) => {
    try {
        const data = await fs.readFile(ordersFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Ошибка чтения файла orders: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Ошибка чтения файла orders' });
    }
});

app.post('/api/save-orders', async (req, res) => {
    const newOrder = req.body;

    try {
        const data = await fs.readFile(ordersFilePath, 'utf8');
        let orders = JSON.parse(data);
        orders.push(newOrder);

        await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));
        res.json({ success: true, message: 'Ордер успешно сохранен' });
    } catch (error) {
        console.error('Ошибка при записи файла:', error);
        res.status(500).json({ success: false, message: 'Ошибка при записи файла' });
    }
});

app.get('/api/remove-all-from-sale', (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/remove-all-from-sale?key=${req.query.key}`;
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/get-item-info', (req, res) => {
    const marketHashName = req.query.market_hash_name;

    if (!marketHashName) {
        return res.status(400).json({ type: 'error', message: 'Параметр market_hash_name обязателен' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/get-list-items-info?key=${req.query.key}&list_hash_name[]=${encodeURIComponent(marketHashName)}`;
    handleRequestWithWorker(targetUrl, res);
});

app.delete('/api/delete-order', async (req, res) => {
    const { hash_name } = req.body;

    try {
        const data = await fs.readFile(ordersFilePath, 'utf8');
        const orders = JSON.parse(data);
        const newOrders = orders.filter(order => order.hash_name !== hash_name);

        await fs.writeFile(ordersFilePath, JSON.stringify(newOrders, null, 2));
        res.json({ success: true, message: `Ордер ${hash_name} успешно удален` });
    } catch (error) {
        console.error(`Ошибка при удалении ордера: ${error.message}`);
        res.status(500).json({ success: false, message: 'Ошибка при удалении ордера' });
    }
});

app.post('/api/update-all-order-urls', async (req, res) => {
    const { newUrl } = req.body;

    try {
        const data = await fs.readFile(ordersFilePath, 'utf8');
        let orders = JSON.parse(data);
        orders = orders.map(order => ({ ...order, url: newUrl }));

        await fs.writeFile(ordersFilePath, JSON.stringify(orders, null, 2));
        res.json({ success: true, message: 'URL всех ордеров успешно обновлены' });
    } catch (error) {
        console.error('Ошибка при обновлении URL ордеров:', error);
        res.status(500).json({ success: false, message: 'Ошибка при обновлении URL ордеров' });
    }
});

app.post('/api/transfer-balance/:amount/:userApiKey', (req, res) => {
    const { amount, userApiKey } = req.params;
    const { key, pay_pass } = req.query;

    if (!amount || !userApiKey) {
        return res.status(400).json({ type: 'error', message: 'Отсутствуют обязательные параметры' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/money-send/${amount}/${userApiKey}?key=${key}&pay_pass=${pay_pass}`;
    handleRequestWithWorker(targetUrl, res);
});

// Новый маршрут для выставления предметов на продажу
app.post('/api/add-to-sale', (req, res) => {
    const { key, id, price, cur } = req.body;
    if (!id || !price || !cur) {
        return res.status(400).json({ type: 'error', message: `${key}, ${id}, ${price}, ${cur}` });
    }

    const targetUrl = `https://market.csgo.com/api/v2/add-to-sale?key=${key}&id=${id}&price=${price}&cur=${cur}`;
    handleRequestWithWorker(targetUrl, res);
});

// Новый маршрут для получения инвентаря
app.get('/api/my-inventory', (req, res) => {
    const { key } = req.query;

    if (!key) {
        return res.status(400).json({ type: 'error', message: 'Параметр key обязателен' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/my-inventory?key=${key}`;
    handleRequestWithWorker(targetUrl, res);
});

// Новый маршрут для получения истории
app.get('/api/history', (req, res) => {
    const { key, date, date_end } = req.query;

    if (!key || !date) {
        return res.status(400).json({ success: false, message: 'Отсутствуют обязательные параметры' });
    }

    let targetUrl = `https://market.csgo.com/api/v2/history?key=${key}&date=${date}`;
    if (date_end) {
        targetUrl += `&date_end=${date_end}`;
    }

    handleRequestWithWorker(targetUrl, res);
});

// Новый маршрут для установки цены на предмет
app.post('/api/set-price', (req, res) => {
    const { key, item_id, price, cur } = req.body;

    if (!key || !item_id || !price || !cur) {
        return res.status(400).json({ type: 'error', message: 'Отсутствуют обязательные параметры' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/set-price?key=${key}&item_id=${item_id}&price=${price}&cur=${cur}`;
    handleRequestWithWorker(targetUrl, res);
});


// Новый маршрут для получения списка цен
app.get('/api/prices/class_instance', (req, res) => {
    const currency = req.query.currency || 'RUB';
    const targetUrl = `https://market.csgo.com/api/v2/prices/class_instance/${currency}.json`;
    handleRequestWithWorker(targetUrl, res);
});

app.get('/api/search-item-by-hash-name', (req, res) => {
    const { key, hash_name } = req.query;

    if (!key || !hash_name) {
        return res.status(400).json({ type: 'error', message: 'Отсутствуют обязательные параметры' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/search-item-by-hash-name?key=${key}&hash_name=${encodeURIComponent(hash_name)}`;
    handleRequestWithWorker(targetUrl, res);
});

loadApis();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Функция для переноса баланса
const transferBalance = async (amount, userApiKey, pay_pass = '15122005') => {
    const response = await fetch(`http://localhost:8080/api/transfer-balance/${amount}/${userApiKey}?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD&pay_pass=${pay_pass}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ошибка при переносе баланса: ${response.statusText}. Сообщение сервера: ${errorData.message}`);
    }

    const result = await response.json();
    console.log(`Баланс успешно перенесен: ${JSON.stringify(result)}`);
};

// Функция для получения времени в формате UNIX
const getUnixTime = (minutesAgo = 0) => {
    return Math.floor((Date.now() - (minutesAgo * 60 * 1000)) / 1000);
};

const checkSalesAndTransfer = async (apiKey) => {
    try {
        const currentDateUnix = getUnixTime();
        const fiveMinutesAgoUnix = getUnixTime(5);

        const historyUrl = `http://localhost:8080/api/history?key=${apiKey}&date=${fiveMinutesAgoUnix}&date_end=${currentDateUnix}`;
        const response = await fetch(historyUrl);

        if (!response.ok) {
            throw new Error(`Ошибка при получении истории продаж: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data) {
            let totalSoldAmount = 0;
            data.data.forEach(item => {
                if (item.event === 'sell') {
                    totalSoldAmount += parseFloat(item.paid);
                }
            });

            if (totalSoldAmount > 0) {
                await transferBalance(totalSoldAmount * 100, apiKey);
                console.log(`Перенесено ${totalSoldAmount} на основной баланс.`);
            }
        } else {
            console.log('Нет продаж за последние 5 минут.');
        }
    } catch (error) {
        console.error(`Ошибка при проверке продаж и переносе баланса: ${error.message}`);
    }
};

// Регулярно вызывать функцию проверки продаж каждые 5 минут для каждого API
const startMonitoring = (apiKey) => {
    setInterval(() => checkSalesAndTransfer(apiKey), 5 * 60 * 1000);
};

// Загружаем список API и запускаем мониторинг для каждого
loadApis().then(() => {
    dynamicApis.forEach(api => startMonitoring(api.url));
});
