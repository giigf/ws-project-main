const saveApiUrl = 'http://localhost:8080/api/add';
const apiListUrl = 'http://localhost:8080/api/list';
const apiDeleteUrl = 'http://localhost:8080/api/delete/';
const apiUpdateUrl = 'http://localhost:8080/api/update/';
const setPayPasswordUrl = 'http://localhost:8080/api/set-pay-password';

// Функция для загрузки списка API
function loadApiList() {
    fetch(apiListUrl)
        .then(response => response.json())
        .then(apis => {
            console.log(apis);
            const apiList = document.getElementById('apiList');
            apiList.innerHTML = '';
            apis.forEach(api => {
                const li = document.createElement('li');
                li.textContent = `Name: ${api.name}, URL: ${api.url}`;
                apiList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error loading API list:', error);
        });
}

// Функция для установки платежного пароля
function setPayPassword(apiKey) {
    fetch(setPayPasswordUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: apiKey, new_password: '15122005' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Платежный пароль успешно установлен.');
        } else {
            console.error('Ошибка при установке платежного пароля:', data.message);
        }
    })
    .catch(error => {
        console.error('Ошибка при установке платежного пароля:', error);
    });
}

// Функция для добавления нового API
document.getElementById('addApiForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const apiName = document.getElementById('apiName').value;
    const apiUrl = document.getElementById('apiUrl').value;

    fetch(saveApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: apiName, url: apiUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert(`API "${data.name}" added successfully!`);
            loadApiList();
            console.log(apiName);
            setPayPassword(apiUrl); // Устанавливаем платежный пароль после добавления API
        }
    })
    .catch(error => {
        console.error('Error adding API:', error);
    });
});

// Функция для удаления API
function deleteApi(apiName) {
    fetch(`${apiDeleteUrl}${apiName}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`API "${apiName}" deleted successfully!`);
            loadApiList();
        } else {
            alert(`Error: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error deleting API:', error);
    });
}

// Функция для обновления API
function updateApi(apiName, newApiUrl) {
    fetch(`${apiUpdateUrl}${apiName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: newApiUrl })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`API "${apiName}" updated successfully!`);
            loadApiList();
        } else {
            alert(`Error: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error updating API:', error);
    });
}

// Инициализация загрузки списка API при загрузке страницы
document.addEventListener('DOMContentLoaded', loadApiList);
