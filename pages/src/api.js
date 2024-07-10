const saveApiUrl = 'http://localhost:8080/api/add';
const apiListUrl = 'http://localhost:8080/api/list';
const apiDeletetUrl = 'http://localhost:8080/api/delete/';
const apiUpdatetUrl = 'http://localhost:8080/api/update/';


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
        }
    })
    .catch(error => {
        console.error('Error adding API:', error);
    });
});

// Функция для удаления API
function deleteApi(apiName) {
    fetch(`${apiDeletetUrl}${apiName}`, {
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
    fetch(`${apiUpdatetUrl}${apiName}`, {
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
