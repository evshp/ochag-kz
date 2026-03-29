# Очаги и Камины KZ — CLAUDE.md

## О проекте
Сайт-каталог для компании по продаже костровых чаш, столов и печей в Казахстане.
Домен: ochagi-kaminy.kz. Деплой на AWS EC2, HTTPS через Let's Encrypt.

**Фронтенд:** HTML5, CSS, JavaScript — без фреймворков. Все файлы только в `backend/web/`.
**Бэкенд:** Go (chi router) с PostgreSQL, слоистая архитектура.
**Инфра:** Docker Compose (prod), nginx reverse proxy, certbot для SSL.

## Запуск

```bash
cd /Users/EfremShpakov/ochag-kz/backend
make run
```

Открыть в браузере: http://localhost:8080

### Деплой (prod)
```bash
docker compose -f docker-compose.prod.yml up -d
./deploy/init-ssl.sh your@email.com   # первичная настройка HTTPS
```

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

### CSS-классы (фронтенд)
- Каталог использует префикс `.p-` для классов: `.p-badge-bowl`, `.p-stock-available` и т.д. (определены в `styles/catalog-page.css`)
- Админка разбита на отдельные страницы (`admin/products.html`, `admin/stock.html`, `admin/users.html`), а не табы

## Структура проекта

```
ochag-kz/
├── backend/
│   ├── cmd/server/main.go              # Точка входа, DI, роутинг
│   ├── internal/
│   │   ├── config/config.go            # Конфигурация из env
│   │   ├── model/                      # Доменные модели (чистые)
│   │   │   ├── product.go
│   │   │   ├── user.go
│   │   │   ├── contact.go
│   │   │   ├── inventory.go
│   │   │   └── recommendation.go
│   │   ├── repository/                 # Data Access Layer (интерфейсы)
│   │   │   └── postgres/               # PostgreSQL реализация
│   │   ├── service/                    # Бизнес-логика (только model.*)
│   │   ├── handler/                    # Presentation Layer
│   │   │   └── dto/                    # Запросы/ответы API
│   │   └── middleware/                 # JWT auth, rate limiting
│   ├── migrations/                     # SQL-миграции (up/down)
│   ├── web/                            # Весь фронтенд
│   │   ├── index.html                  # Главная
│   │   ├── catalog.html                # Каталог
│   │   ├── admin/                      # Админ-панель (отдельные страницы)
│   │   ├── js/                         # JavaScript
│   │   ├── styles/                     # CSS (по компонентам)
│   │   └── assets/                     # Изображения (products/, categories/)
│   ├── Dockerfile
│   ├── Makefile
│   └── .env.example
├── deploy/                             # Скрипты деплоя
│   ├── setup.sh                        # Первичная настройка сервера
│   ├── init-ssl.sh                     # Настройка HTTPS (Let's Encrypt)
│   └── backup.sh                       # Бэкап БД
├── docker-compose.yml                  # Локальная разработка
├── docker-compose.prod.yml             # Продакшен
├── nginx.conf                          # Nginx конфигурация
├── .github/workflows/deploy.yml        # CI/CD
└── CLAUDE.md
```

## API эндпоинты

### Публичные
- `GET /api/products` — список товаров (?category=bowl|table|oven)
- `GET /api/products/{id}` — товар с рекомендациями
- `POST /api/contact` — форма обратной связи (rate limited)
- `POST /api/auth/login` — авторизация (rate limited)

### Админ (JWT, role: admin|manager)
- `POST/PUT/DELETE /api/admin/products/{id}` — CRUD товаров
- `POST /api/admin/products/{id}/image` — загрузка изображения
- `GET/PUT /api/admin/products/{id}/recommendations` — рекомендации
- `GET /api/admin/inventory` — остатки на складе
- `PUT /api/admin/inventory/{productID}` — корректировка остатков
- `GET /api/admin/inventory/{productID}/logs` — история изменений

### Админ (JWT, role: admin only)
- `GET/POST /api/admin/users` — управление пользователями
- `PUT /api/admin/users/{id}/role` — смена роли
- `DELETE /api/admin/users/{id}` — удаление пользователя

## Контакты (в коде)
- WhatsApp: +7 776 385 7050
- Instagram: @ochagi_kaminy.kz
- TikTok: @ochagi_kaminy.kz
