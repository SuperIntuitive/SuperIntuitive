# superintuitive

Drag and drop, point and click, website builder. 

## Docker setup

This repo can run in Docker with PHP 8.2, Apache, and MariaDB.

### Requirements

- Docker Desktop or Docker Engine with Compose

### Start the stack

```bash
docker compose up --build
```

The site will be available at `http://localhost:8080`.

### Installer values

On first load, use the browser installer and choose `Use existing user and database`.

- Database Type: `mysql`
- Server: `db`
- Port: `3306`
- Existing Database: `super_intuitive`
- Existing DB User: `super_intuitive`
- Existing DB Password: `super_intuitive`

The domain field should default to `localhost` even when you are using port `8080`.

### Useful commands

```bash
docker compose down
docker compose down -v
```

`docker compose down -v` removes the MariaDB data volume and gives you a clean install.
