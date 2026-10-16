# Backend en local (sin secretos)

El backend (Java 25, Javalin, MariaDB) vive en el repositorio privado `Cadiducho/PrognoSports`; **no se modifica desde este proyecto**. Usar uno local es opcional: para el día a día basta `VITE_API_MOCK=true pnpm dev`. Un backend local sirve para ver datos reales, probar escrituras (solo contra tu base de datos) o ejecutar `pnpm test:contract` con sesión.

**Nunca uses ni copies credenciales de producción.** Todo lo que sigue usa credenciales inventadas por ti y ficheros ignorados por git.

## 1. Arrancarlo

Requisitos: acceso al repositorio del backend, JDK 25 (el wrapper de Gradle lo resuelve) y una MariaDB local (por ejemplo en Docker).

```sh
# MariaDB desechable con credenciales de ejemplo (cámbialas por las tuyas)
docker run -d --name prognosports-db -p 3306:3306 \
  -e MARIADB_ROOT_PASSWORD=<tu-clave> -e MARIADB_DATABASE=prognosports mariadb:11

git clone git@github.com:Cadiducho/PrognoSports.git
cd PrognoSports
./gradlew run          # la primera vez crea config.json vacío y termina
```

Rellena `config.json` (ignorado por git; campos de `PrognoSportsConfig`): `databaseHost`, `databasePort`, `databaseName`, `databaseUser`, `databasePassphrase` con los de tu MariaDB; `notificationDisabled: true` para no enviar avisos; correo y Telegram pueden quedar vacíos. Vuelve a ejecutar `./gradlew run`: **Flyway migra la base al arrancar** y la API escucha en `http://localhost:8001` (`8002` si `isNightly` es `true`). La spec local está en `/openapi` y Swagger en `/swagger`.

La base arranca sin datos de temporada: crea competición, temporada, GP, pilotos y circuitos desde el área de administración del frontend o con las peticiones del backend, y registra tus usuarios de prueba (la verificación de correo requiere un código y en local el correo no se envía si no lo configuras: verifica la cuenta directamente en tu base de datos local).

## 2. Apuntar el frontend

```sh
echo 'VITE_API_BASE_URL=http://localhost:8001' > .env.local   # .env.local está ignorado por git
pnpm dev
```

`.env` ya apunta a `http://localhost:8001` por defecto. CORS está abierto en el backend, así que no hace falta proxy. Recuerda: `VITE_API_BASE_URL` va **sin** `/v2`.

## 3. Contrato contra el backend local

```sh
CONTRACT_API_BASE_URL=http://localhost:8001 CONTRACT_COMMUNITY=<id> CONTRACT_TEST_TOKEN=<token-de-tu-usuario-local> pnpm test:contract
```

El token es de un usuario de **tu** base local (se obtiene con `POST /v2/auth/login`). Más variables y alcance: [`contract-tests.md`](contract-tests.md).

## 4. Cosas de la API que verás en local

- La competición local puede tener un `code` distinto de `f1`; el frontend usa `f1` (válido en producción).
- El rango del administrador llega sin el booleano `admin` (`rank: { id, name, color }`); el frontend reconoce el rango por nombre (`isAdmin` en `src/stores/session.ts`).
- El resto de discrepancias, con su estado, en [`src/api/README.md`](../src/api/README.md).

Si encuentras un fallo del backend, no lo arregles aquí: reglas de reporte en [`AGENTS.md`](../AGENTS.md#reportar-problemas-del-backend-o-del-contrato-de-la-api).
