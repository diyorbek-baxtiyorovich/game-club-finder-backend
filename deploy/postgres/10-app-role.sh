#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_user APP_DB_USER
\getenv app_password APP_DB_PASSWORD
\getenv db_name POSTGRES_DB
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password') \gexec
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
CREATE EXTENSION IF NOT EXISTS postgis;
SQL
