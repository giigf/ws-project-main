@echo off
chcp 65001 > nul
:: Отключить отображение команд в командной строке

:: Проверка на наличие Node.js
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js не установлен. Установка...
    echo Пожалуйста, установите Node.js с https://nodejs.org/ и перезапустите этот скрипт.
    start https://nodejs.org/
    pause
    exit /b 1
)

:: Переход в папку проекта
cd /d %~dp0
if %errorlevel% neq 0 (
    echo Ошибка: Не удалось перейти в папку проекта.
    pause
    exit /b 1
)

:: Установка зависимостей
echo Установка зависимостей...
npm install
if %errorlevel% neq 0 (
    echo Ошибка: Не удалось установить зависимости.
    pause
    exit /b 1
)