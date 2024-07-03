const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 8080;

const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD';

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

function retry(fn, retries = 3, delay = 1000) {
    return async (...args) => {
        while (retries > 0) {
            try {
                return await fn(...args);
            } catch (error) {
                if (retries > 1) {
                    console.log(`Retrying ${fn.name}, retries left: ${retries - 1}`);
                    await new Promise(res => setTimeout(res, delay));
                }
                retries--;
            }
        }
        throw new Error(`Failed after ${retries} retries`);
    };
}

const fetchJson = retry(async (url) => {
    const response = await axios.get(url);
    return response.data;
}, 3, 2000);

const apiDataFile = path.join(__dirname, 'api_data.json');
let dynamicApis = [];

async function loadApis() {
    try {
        const data = await fs.readFile(apiDataFile, 'utf8');
        dynamicApis = JSON.parse(data);
        dynamicApis.forEach(api => addDynamicEndpoint(api.name, api.url));
    } catch (error) {
        console.error(`Error loading API data: ${error.message}`);
    }
}

function addDynamicEndpoint(name, url) {
    app.get(`/api/${name}`, async (req, res) => {
        const targetUrl = url.replace('<key>', apiKey);
        try {
            const data = await fetchJson(targetUrl);
            res.json(data);
        } catch (error) {
            console.error(`Error fetching data from ${name}: ${error.message}`);
            res.status(500).json({ type: 'error', message: error.message });
        }
    });
}

app.post('/api/add', async (req, res) => {
    const { name, url } = req.body;

    if (!name || !url) {
        return res.status(400).json({ error: 'Имя и URL API обязательны' });
    }

    if (dynamicApis.find(api => api.name === name)) {
        return res.status(400).json({ error: 'API с таким именем уже существует' });
    }

    const newApi = { name, url };
    dynamicApis.push(newApi);
    addDynamicEndpoint(name, url);

    try {
        await fs.writeFile(apiDataFile, JSON.stringify(dynamicApis, null, 2));
        res.json({ message: `API ${name} добавлен`, endpoint: `/api/${name}` });
    } catch (error) {
        console.error(`Error saving API data: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Error saving API data' });
    }
});

app.get('/api/list', async (req, res) => {
    try {
        const data = await fs.readFile(apiDataFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Error reading API list: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Error reading API list' });
    }
});

app.get('/api/get-ws-token', async (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-ws-token?key=${apiKey}`;
    
    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching WebSocket token: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/dictionary-names', async (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/dictionary/names.json';
    
    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching dictionary names: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/items', async (req, res) => {
    const filePath = path.join(__dirname, 'items_data.json');

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Error reading items file: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Error reading items file' });
    }
});

app.post('/api/save-items', async (req, res) => {
    const items = req.body;
    const filePath = path.join(__dirname, 'items_data.json');

    try {
        await fs.writeFile(filePath, JSON.stringify(items, null, 2));
        res.status(200).json({ type: 'success', message: 'File saved successfully' });
    } catch (error) {
        console.error(`Error saving items file: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Error saving items file' });
    }
});

app.get('/api/get-orders', async (req, res) => {
    const page = req.query.page || 0;
    const targetUrl = `https://market.csgo.com/api/v2/get-orders?key=${apiKey}&page=${page}`;

    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching orders: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.post('/api/set-order', async (req, res) => {
    const { key ,market_hash_name, count, price, partner, token } = req.body;

    if (!market_hash_name || !count || !price) {
        return res.status(400).json({ type: 'error', message: 'Missing required parameters' });
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

    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error setting order: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/prices', async (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/prices/orders/RUB.json';

    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching prices: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/get-money', async (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-money?key=${apiKey}`;

    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching balance: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/orders', async (req, res) => {
    const filePath = path.join(__dirname, 'order_item.json');

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Error reading orders file: ${error.message}`);
        res.status(500).json({ type: 'error', message: 'Error reading orders file' });
    }
});

app.post('/api/save-orders', async (req, res) => {
    const newOrder = req.body;
    const filePath = path.join(__dirname, 'order_item.json');

    try {
        const data = await fs.readFile(filePath, 'utf8');
        let orders = JSON.parse(data);
        orders.push(newOrder);

        await fs.writeFile(filePath, JSON.stringify(orders, null, 2));
        res.json({ success: true, message: 'Ордер успешно сохранен' });
    } catch (error) {
        console.error('Ошибка при записи файла:', error);
        res.status(500).json({ success: false, message: 'Ошибка при записи файла' });
    }
});

app.get('/api/remove-all-from-sale', async (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/remove-all-from-sale?key=${apiKey}`;
    
    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error removing items from sale: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.get('/api/get-item-info', async (req, res) => {
    const marketHashName = req.query.market_hash_name;

    if (!marketHashName) {
        return res.status(400).json({ type: 'error', message: 'Параметр market_hash_name обязателен' });
    }

    const targetUrl = `https://market.csgo.com/api/v2/get-list-items-info?key=${apiKey}&list_hash_name[]=${encodeURIComponent(marketHashName)}`;

    try {
        const data = await fetchJson(targetUrl);
        res.json(data);
    } catch (error) {
        console.error(`Error fetching item info: ${error.message}`);
        res.status(500).json({ type: 'error', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Load dynamic APIs at startup
loadApis();
