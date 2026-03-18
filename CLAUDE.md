# Очаги и Камины KZ — CLAUDE.md

## О проекте
Сайт-каталог для компании по продаже костровых чаш, столов и печей в Казахстане.

**Фронтенд:** HTML5, CSS, JavaScript — без фреймворков. Файл `backend/web/index.html`.
**Бэкенд:** Go с PostgreSQL, слоистая архитектура.

## Запуск

```bash
cd /Users/EfremShpakov/ochag-kz/backend
make run
```

Открыть в браузере: http://localhost:8080

## Архитектурные правила

### Слоистая архитектура
Код разбит на слои, каждый слой — отдельный пакет. Зависимости направлены внутрь:
`handler → service → repository`

### DTO не проникают в сервисный слой
- **handler/dto/** — содержит ВСЕ внешние контракты (JSON request/response структуры)
- **handler/** — конвертирует `dto → model` на входе и `model → dto` на выходе
- **service/** — работает ТОЛЬКО с доменными моделями из `internal/model/`. Никаких JSON-тегов, HTTP-структур или внешних контрактов
- **repository/** — маппит SQL-результаты в доменные модели `model.*`

### Модульность
- Каждый слой зависит только от интерфейсов нижележащего слоя и от доменных моделей
- Внешние контракты (JSON-теги, HTTP-специфика, SQL-маппинг) изолированы в своём слое
- Новый функционал добавляется по тому же паттерну: model → repo interface → repo impl → service → dto → handler

## Структура проекта

```
ochag-kz/
├── backend/
│   ├── cmd/server/main.go              # Точка входа, DI
│   ├── internal/
│   │   ├── config/config.go            # Конфигурация из env
│   │   ├── model/                      # Доменные модели (чистые)
│   │   │   ├── product.go
│   │   │   └── user.go
│   │   ├── repository/                 # Data Access Layer
│   │   │   ├── product_repo.go         # Интерфейс
│   │   │   ├── user_repo.go            # Интерфейс
│   │   │   └── postgres/               # PostgreSQL реализация
│   │   ├── service/                    # Бизнес-логика (только model.*)
│   │   │   ├── product_service.go
│   │   │   └── auth_service.go
│   │   ├── handler/                    # Presentation Layer
│   │   │   ├── dto/                    # Запросы/ответы API
│   │   │   ├── product_handler.go
│   │   │   ├── auth_handler.go
│   │   │   └── contact_handler.go
│   │   └── middleware/auth.go
│   ├── migrations/                     # SQL-миграции
│   ├── web/index.html                  # Фронтенд
│   ├── go.mod
│   ├── Makefile
│   └── .env.example
├── hero.jpg
├── hero-fire.mp4
├── images/
└── CLAUDE.md
```

## Контакты (в коде)
- WhatsApp: +7 776 385 7050
- Instagram: @ochagi_kaminy.kz
- TikTok: @ochagi_kaminy.kz
