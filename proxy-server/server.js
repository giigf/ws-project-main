const express = require('express');
const request = require('request');
const fs = require('fs');
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
    return (...args) => {
        return fn(...args).catch(err => {
            if (retries > 1) {
                console.log(`Retrying ${fn.name}, retries left: ${retries - 1}`);
                return new Promise(res => setTimeout(res, delay)).then(() => retry(fn, retries - 1, delay)(...args));
            }
            throw err;
        });
    };
}

const fetchJson = retry((url) => new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            return reject(error || new Error(`Failed with status ${response.statusCode}`));
        }
        try {
            resolve(JSON.parse(body));
        } catch (e) {
            reject(e);
        }
    });
}), 3, 2000);

app.get('/api/get-ws-token', (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-ws-token?key=${apiKey}`;
    
    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error fetching WebSocket token: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.get('/api/dictionary-names', (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/dictionary/names.json';
    
    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error fetching dictionary names: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.get('/api/items', (req, res) => {
    const filePath = path.join(__dirname, 'items_data.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading items file: ${err.message}`);
            return res.status(500).json({ type: 'error', message: 'Error reading items file' });
        }
        res.json(JSON.parse(data));
    });
});

app.post('/api/save-items', (req, res) => {
    const items = req.body;
    const filePath = path.join(__dirname, 'items_data.json');

    fs.writeFile(filePath, JSON.stringify(items, null, 2), (err) => {
        if (err) {
            console.error(`Error saving items file: ${err.message}`);
            return res.status(500).json({ type: 'error', message: 'Error saving items file' });
        }
        res.status(200).json({ type: 'success', message: 'File saved successfully' });
    });
});

// Проксирование запросов к API market.csgo.com
app.get('/api/get-orders', (req, res) => {
    const page = req.query.page || 0;
    const targetUrl = `https://market.csgo.com/api/v2/get-orders?key=${apiKey}&page=${page}`;

    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error fetching orders: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.post('/api/set-order', (req, res) => {
    const { market_hash_name, count, price, partner, token } = req.body;
    const query = new URLSearchParams({
        key: apiKey,
        market_hash_name,
        count: count.toString(),
        price: price.toString(),
        partner: partner || '',
        token: token || ''
    });
    const targetUrl = `https://market.csgo.com/api/v2/set-order?${query}`;

    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error setting order: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.get('/api/prices', (req, res) => {
    const targetUrl = 'https://market.csgo.com/api/v2/prices/orders/RUB.json';

    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error fetching prices: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.get('/api/get-money', (req, res) => {
    const targetUrl = `https://market.csgo.com/api/v2/get-money?key=${apiKey}`;

    fetchJson(targetUrl)
        .then(data => res.json(data))
        .catch(err => {
            console.error(`Error fetching balance: ${err.message}`);
            res.status(500).json({ type: 'error', message: err.message });
        });
});

app.get('/api/orders', (req, res) => {
    const filePath = path.join(__dirname, 'order_item.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading orders file: ${err.message}`);
            return res.status(500).json({ type: 'error', message: 'Error reading orders file' });
        }
        res.json(JSON.parse(data));
    });
});



app.post('/api/save-orders', (req, res) => {
    const newOrder = req.body;
    const filePath = path.join(__dirname, 'order_item.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла:', err);
            return res.status(500).json({ success: false, message: 'Ошибка при чтении файла' });
        }

        let orders = [];
        if (data) {
            orders = JSON.parse(data);
        }
        
        orders.push(newOrder);

        fs.writeFile(filePath, JSON.stringify(orders, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Ошибка при записи файла:', err);
                return res.status(500).json({ success: false, message: 'Ошибка при записи файла' });
            }

            res.json({ success: true, message: 'Ордер успешно сохранен' });
        });
    });
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
