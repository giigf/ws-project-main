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

// Новый маршрут для получения информации о предмете
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

// Новый маршрут для переноса баланса
app.post('/api/transfer-balance/:amount/:userApiKey', (req, res) => {
    const { amount, userApiKey } = req.params;
    const { key, pay_pass } = req.query;

    if (!amount || !userApiKey) {
        return res.status(400).json({ type: 'error', message: 'Отсутствуют обязательные параметры' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/money-send/${amount}/${userApiKey}?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD&pay_pass=15122005`;
    handleRequestWithWorker(targetUrl, res);
});

loadApis();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
