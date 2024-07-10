// Функция для получения предметов из словаря
async function fetchItems() {
    try {
        const response = await fetch('proxy-server/items_data.json');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке предметов');
        }
        const data = await response.json();
        displayItems(data);
    } catch (error) {
        console.error('Ошибка загрузки предметов:', error);
    }
}

// Функция для отображения предметов на странице
function displayItems(items) {
    const output = document.getElementById('output');
    output.innerHTML = ''; // Очищаем содержимое перед добавлением новых данных

    if (items.length === 0) {
        output.innerHTML = '<p>Нет доступных предметов для отображения.</p>';
        return;
    }

    const table = document.createElement('table');
    table.border = '1';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Создаем заголовки таблицы
    const header = table.createTHead();
    const headerRow = header.insertRow(0);
    const headers = ['#', 'ID', 'Название', 'Цена'];

    headers.forEach(text => {
        const cell = document.createElement('th');
        cell.textContent = text;
        cell.style.border = '1px solid black';
        cell.style.padding = '8px';
        cell.style.textAlign = 'left';
        headerRow.appendChild(cell);
    });

    // Заполняем таблицу данными
    items.forEach((item, index) => {
        const row = table.insertRow();
        const cellIndex = row.insertCell(); // Добавляем ячейку для номера предмета
        const cellId = row.insertCell();
        const cellName = row.insertCell();
        const cellPrice = row.insertCell();

        cellIndex.textContent = index + 1; // Нумерация предметов начинается с 1
        cellIndex.style.border = '1px solid black';
        cellIndex.style.padding = '8px';

        cellId.textContent = item.id;
        cellId.style.border = '1px solid black';
        cellId.style.padding = '8px';

        cellName.textContent = item.hash_name;
        cellName.style.border = '1px solid black';
        cellName.style.padding = '8px';

        cellPrice.textContent = item.price;
        cellPrice.style.border = '1px solid black';
        cellPrice.style.padding = '8px';
    });

    output.appendChild(table);
}

// Загружаем предметы при загрузке страницы
document.addEventListener('DOMContentLoaded', fetchItems);




// Функция для получения id предмета по его имени
async function fetchItemId(name) {
    try {
        const response = await fetch('http://localhost:8080/api/dictionary-names');
        if (!response.ok) {
            throw new Error('Ошибка при загрузке словаря');
        }
        const data = await response.json();
        const item = data.items.find(item => item.hash_name === name);
        if (item) {
            console.log(item);
            return { id: item.id, hash_name: item.hash_name }; // Возвращаем объект с id и hash_name
        } else {
            console.log(`Предмет с именем ${name} не найден в словаре`);
            return null;
        }
    } catch (error) {
        console.error('Ошибка загрузки словаря:', error);
        return null;
    }
}

// Функция для обработки файла и отправки данных на сервер
async function processFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Пожалуйста, выберите файл!');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(event) {
        const fileContent = event.target.result;
        const lines = fileContent.trim().split('\n');

        let items = [];
        for (let line of lines) {
            const [hashName, price] = line.trim().split(','); // Предполагаем, что файл имеет формат "hash_name, price"
            const item = await fetchItemId(hashName);
            if (item) {
                items.push({ ...item, price: parseFloat(price) }); // Добавляем id, hash_name и price предмета
            }
        }

        // Отправляем данные на сервер для записи в JSON файл
        try {
            const response = await fetch('http://localhost:8080/api/save-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(items)
            });

            if (!response.ok) {
                throw new Error('Ошибка при отправке данных на сервер');
            }

            const result = await response.text();
            alert(result);
        } catch (error) {
            console.error('Ошибка при отправке данных на сервер:', error);
        }
    };
    reader.readAsText(file);
}
