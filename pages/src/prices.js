const pricesUrl = 'http://localhost:8080/api/prices/class_instance?currency=RUB';

async function fetchPrices() {
    try {
        const response = await fetch(pricesUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при получении цен: ${response.status}`);
        }
        const data = await response.json();
        console.log(data.items);
        return data.items;
    } catch (error) {
        console.error(`Ошибка при получении цен: ${error.message}`);
        return {};
    }
}

function displayPrices(prices) {
    const pricesContainer = document.getElementById('pricesContainer');
    pricesContainer.innerHTML = ''; // Очищаем контейнер перед заполнением

    for (const key in prices) {
        if (prices.hasOwnProperty(key)) {
            const priceInfo = prices[key];
            console.log(priceInfo);
            const priceElement = document.createElement('div');
            priceElement.className = 'price-item';
            priceElement.innerHTML = `
                <p><strong>${priceInfo.market_hash_name}</strong></p>
                <p>Цена: ${priceInfo.price} RUB</p>
                <p>Buy Order: ${priceInfo.buy_order} RUB</p>
                <p>Средняя цена: ${priceInfo.avg_price} RUB</p>
                <p>Популярность за 7 дней: ${priceInfo.popularity_7d}</p>
                <hr>
            `;
            pricesContainer.appendChild(priceElement);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const prices = await fetchPrices();
    displayPrices(prices);
});
