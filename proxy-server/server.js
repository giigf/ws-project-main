const express = require('express');
const request = require('request');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 8080;

// Добавляем заголовки CORS ко всем запросам
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  next();
});

// Парсинг JSON тела запросов
app.use(bodyParser.json());

// Прокси для получения токена WebSocket
app.get('/api/get-ws-token', (req, res) => {
  const targetUrl = 'https://market.csgo.com/api/v2/get-ws-token?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD';
  
  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Прокси для получения словаря имен
app.get('/api/dictionary-names', (req, res) => {
  const targetUrl = 'https://market.csgo.com/api/v2/dictionary/names.json';
  
  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Обработчик для получения предметов из items_data.json
app.get('/api/items', (req, res) => {
  const filePath = path.join(__dirname, 'items_data.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ type: 'error', message: 'Ошибка при чтении файла' });
    }
    res.status(200).json(JSON.parse(data));
  });
});

// Обработчик для сохранения предметов в items_data.json
app.post('/api/save-items', (req, res) => {
  const items = req.body;
  const filePath = path.join(__dirname, 'items_data.json');

  fs.writeFile(filePath, JSON.stringify(items, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ type: 'error', message: 'Ошибка при сохранении файла' });
    }
    res.status(200).json({ type: 'success', message: 'Файл успешно сохранен' });
  });
});

// Прокси для получения ордеров
app.get('/api/get-orders', (req, res) => {
  const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD'; // Замените на реальный ключ API
  const page = req.query.page || 0;
  const targetUrl = `https://market.csgo.com/api/v2/get-orders?key=${apiKey}&page=${page}`;

  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Прокси для установки ордера
app.post('/api/set-order', (req, res) => {
  const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD'; // Замените на реальный ключ API
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

  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Прокси для получения цен
app.get('/api/prices', (req, res) => {
  const targetUrl = 'https://market.csgo.com/api/v2/prices/orders/RUB.json';
  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Обработчик для получения баланса
app.get('/api/get-money', (req, res) => {
  const apiKey = 'o7XrJgt38LM72UmT3f9i8NhTOxFY0cD'; // Замените на реальный ключ API
  const targetUrl = `https://market.csgo.com/api/v2/get-money?key=${apiKey}`;

  request(targetUrl, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      return res.status(500).json({ type: 'error', message: error ? error.message : `Server returned status code ${response.statusCode}` });
    }
    res.json(JSON.parse(body));
  });
});

// Обработчик для получения ордеров из локального JSON
app.get('/api/orders', (req, res) => {
  const filePath = path.join(__dirname, 'order_item.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ type: 'error', message: 'Ошибка при чтении файла ордеров' });
    }
    res.status(200).json(JSON.parse(data));
  });
});

// Обработчик для сохранения ордеров в локальный JSON
app.post('/api/save-orders', (req, res) => {
  const orders = req.body;
  const filePath = path.join(__dirname, 'order_item.json');

  fs.writeFile(filePath, JSON.stringify(orders, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ type: 'error', message: 'Ошибка при сохранении ордеров' });
    }
    res.status(200).json({ message: 'Заказы успешно сохранены' });
  });
});


// Обработчик для запросов методом OPTIONS
app.options('*', (req, res) => {
  res.status(200).send();
});

// Запускаем сервер на указанном порту
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
