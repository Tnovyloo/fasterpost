# FasterPost

## Quick start (Linux / macOS / WSL)
1. Make sure Docker & Docker Compose are installed.
2. From the project root run:
   ```bash
   docker-compose up --build
   ```
3. In a new terminal you can run migrations and create a superuser (if needed):
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py createsuperuser
   ```


