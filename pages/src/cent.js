// URL для получения токена
const url = "https://market.csgo.com/api/v2/get-ws-token?key=o7XrJgt38LM72UmT3f9i8NhTOxFY0cD";

// Функция для получения токена
async function getToken() {
    const res = await fetch('http://localhost:8080/api/get-ws-token');
    if (!res.ok) {
        if (res.status === 403) {
            throw new Centrifuge.UnauthorizedError();
        }
        throw new Error(`Unexpected status code ${res.status}`);
    }
    const data = await res.json();
    console.log(data.token);
    return data.token;
}

// Функция для загрузки предметов с id из JSON файла
async function loadItemsWithIdFromJson() {
    try {
        const response = await fetch('proxy-server/items_data.json');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке JSON файла');
        }
        const data = await response.json();
        console.log('Загружены предметы с id из JSON файла:', data);
        return data;
    } catch (error) {
        console.error('Ошибка загрузки данных из JSON файла:', error);
        return [];
    }
}

// Инициализация клиента Centrifuge с WebSocket URL и функцией получения токена
const client = new Centrifuge('wss://wsprice.csgo.com/connection/websocket', {
    getToken: getToken
});

// Загрузка предметов один раз при инициализации
let cachedItems = [];

// Асинхронно загружаем предметы при запуске
(async function() {
    cachedItems = await loadItemsWithIdFromJson();
})();

// Подписка на канал и обработка данных
const sub = client.newSubscription('public:items:730:rub').on('publication', function(ctx) {
    var data = ctx.data;

    // Проверяем каждый предмет из загруженных JSON данных
    cachedItems.forEach(item => {
        if (data.name_id == item.id && parseFloat(data.price) <= item.price) {
            console.log(`Предмет ${item.hash_name} соответствует условиям: id = ${data.name_id}, Цена = ${data.price}`);
        }
    });
});

// Обработчики событий для подключения и ошибок
client.on('connecting', function(ctx) {
    console.log('Подключение', ctx);
});

client.on('connected', function(ctx) {
    console.log('Подключено', ctx);
});

client.on('disconnected', function(ctx) {
    console.log('Отключено', ctx);
});

client.on('error', function(ctx) {
    console.log('Ошибка клиента', ctx);
});

// Подписка на события подписки
sub.on('subscribing', function(ctx) {
    console.log('Подписка');
});

sub.on('subscribed', function(ctx) {
    console.log('Подписан');
});

sub.on('unsubscribed', function(ctx) {
    console.log('Отписан');
});

sub.on('error', function(ctx) {
    console.log("Ошибка подписки", ctx);
});

// Подписка на канал
sub.subscribe();

// Подключение клиента
client.connect();
