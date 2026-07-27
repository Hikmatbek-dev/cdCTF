# Lab runner

Starts and stops the vulnerable machines learners attack. It is the only process
that touches Docker; the API decides *whether* a machine may start, this decides
nothing and just runs what it is told — from a fixed allowlist.

It ships dark. Until `LAB_RUNNER_URL` and `LAB_RUNNER_TOKEN` are set on the API,
every lab route answers `503` and the Labs page says labs are not available yet.
Deploying the code costs nothing.

## What it needs

A small VPS with Docker. 2 vCPU / 4 GB runs roughly 8 concurrent machines at the
default caps (512 MB, 0.5 CPU each).

**Do not run it next to anything else.** A process with the Docker socket is
effectively root on its host.

## Run it

```bash
docker build -t cdctf-lab-runner artifacts/lab-runner

docker run -d --name cdctf-lab-runner \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e LAB_RUNNER_TOKEN="$(openssl rand -hex 32)" \
  -e LAB_ALLOWED_IMAGES="vulnerables/web-dvwa,bkimminich/juice-shop" \
  -e LAB_PUBLIC_HOST="labs.cdctf.uz" \
  -e LAB_PORT_MIN=20000 -e LAB_PORT_MAX=20999 \
  cdctf-lab-runner
```

Then put it behind TLS (Caddy, nginx) and point the API at it:

```
LAB_RUNNER_URL=https://labs.cdctf.uz
LAB_RUNNER_TOKEN=<the same token>
LAB_PUBLIC_HOST=labs.cdctf.uz
```

Open `LAB_PORT_MIN`–`LAB_PORT_MAX` in the firewall — that is the range learners
connect to. Everything else stays closed.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `LAB_RUNNER_TOKEN` | — | **Required.** Bearer token; the API must send the same one. |
| `LAB_ALLOWED_IMAGES` | — | **Required.** Comma-separated exact image names. Nothing else can ever run. |
| `LAB_PUBLIC_HOST` | `127.0.0.1` | Hostname learners connect to. Left at the default, containers bind to loopback only. |
| `LAB_PORT_MIN` / `LAB_PORT_MAX` | `20000` / `20999` | Published-port range. |
| `LAB_MEMORY` / `LAB_CPUS` / `LAB_PIDS` | `512m` / `0.5` / `256` | Per-container caps. |
| `PORT` | `8080` | Where the runner itself listens. |

It refuses to start without a token or an allowlist, rather than coming up
insecure.

## Why it is built this way

- **Allowlist, not free-form images.** A stolen token still cannot run
  `whatever:latest` and mine coins on the host.
- **Names, not raw ids, on `/stop`.** Only `cdctf-lab-<12 hex>` is accepted, so a
  caller cannot aim `docker rm -f` at the database container next door.
- **Constant-time token compare.** A timing oracle on the token is a free key.
- **Caps and dropped capabilities.** A learner's box cannot eat the host or
  escalate out of the container.
- **TTL in two places.** The runner reaps on its own timer and the API sweeps
  expired rows, so a forgotten machine dies even if one side never calls back.

## Adding a lab

Insert a row in `labs` with the image, the port inside the container, and a TTL,
then add the image to `LAB_ALLOWED_IMAGES` and restart the runner. Both sides
have to agree before anything can start.
