# ASM HRIS - Backend

API Laravel 12 (PHP 8.3) untuk Sistem Informasi Kepegawaian ASM Ariyanti.

## Setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Menjalankan

- API server: `php artisan serve`
- Reverb (websocket): `php artisan reverb:start`
- Queue worker: `php artisan queue:work`

## Testing

```bash
php artisan test
```
