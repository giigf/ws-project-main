@echo off
chcp 65001 > nul
:: Отключить отображение команд в командной строке


:: Запуск сервера и запись логов в файл server_log.txt
echo Запуск сервера...
start /min cmd /c "npm start > server_log.txt 2>&1"
if %errorlevel% neq 0 (
    echo Ошибка: Не удалось запустить сервер.
    pause
    
)

:: Ожидание запуска сервера
timeout /t 10 /nobreak > nul
if %errorlevel% neq 0 (
    echo Ошибка: Не удалось выполнить команду timeout.
    pause
    exit /b 1
)

:: Открытие Google Chrome
echo Открытие Google Chrome...
start chrome "http://127.0.0.1:8081"
if %errorlevel% neq 0 (
    echo Ошибка: Не удалось открыть Google Chrome.
    pause
    exit /b 1
)

:: Завершение работы
echo Бот успешно запущен. Вы можете закрыть это окно.
pause