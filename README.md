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

### Optional phpMyAdmin

phpMyAdmin is available as an optional debug service so it does not change the default stack.

Start it alongside the rest of the containers with:

```bash
docker compose --profile tools up --build
```

Or start only phpMyAdmin against an already-running stack with:

```bash
docker compose --profile tools up -d phpmyadmin
```

phpMyAdmin will be available at `http://localhost:8081` by default.

Use the MariaDB credentials from the compose file:

- Server: `db`
- Username: `root`
- Password: `super_intuitive_root`

Or log in with the app user instead:

- Username: `super_intuitive`
- Password: `super_intuitive`

You can change the phpMyAdmin port with `SI_PHPMYADMIN_PORT`.

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
