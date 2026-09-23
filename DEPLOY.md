# Docker 部署指南

两个容器：`nginx`（serve 前端 dist + 同源反代）和 `backend`（FastAPI + chromium 快照）。发布页、`/api`、`/static` 与 SPA 全部经由 nginx 同源访问，行为与本地 Vite dev proxy 一致。

```
[浏览器] → nginx:80
            ├── /api/          → backend:8000（SSE 不缓冲）
            ├── /static/       → backend:8000（avatars / snapshots / interactions.js）
            ├── /{user}/{page} → backend:8000（发布页，正则与 vite proxy 一致）
            └── 其余           → SPA（dist + index.html fallback）
          backend：SQLite → volume；avatars/snapshots → volume；chromium 截图封面
```

## 前置要求

- Docker + Docker Compose v2

## 部署步骤

```bash
git clone <repo> && cd aicoding_journey

# 1. 填写环境变量（JWT_SECRET / ENCRYPTION_KEY / LLM_API_KEY 必填）
cp backend/.env.example backend/.env
vim backend/.env

# 2. 构建并启动（首次自动 seed demo 账号与推荐提示词）
docker compose up -d --build

docker compose ps        # backend 应为 healthy
docker compose logs -f backend
```

访问 `http://<服务器IP>/`。demo 账号：`13800138000 / 123456`。

## 端口

默认监听 80，换端口：

```bash
HTTP_PORT=8080 docker compose up -d
```

## HTTPS

nginx 只提供 HTTP。上 HTTPS 的两种方式：

- 域名走 Cloudflare 代理（边缘 TLS，源站保持 80）
- 宿主机装 caddy / certbot，反代到 nginx 的 80 端口

## 数据与备份

数据全部在三个 named volume：

| volume | 容器路径 | 内容 |
|---|---|---|
| `<project>_backend-data` | `/app/data` | SQLite（`htmlhost.db`） |
| `<project>_backend-avatars` | `/app/static/avatars` | 用户头像 |
| `<project>_backend-snapshots` | `/app/static/snapshots` | 页面封面截图 |

`<project>` 默认为目录名 `aicoding_journey`（以 `docker volume ls` 实际输出为准）。

备份 / 恢复（以 SQLite 为例）：

```bash
docker run --rm -v aicoding_journey_backend-data:/data -v "$PWD":/backup \
  alpine tar czf /backup/db-$(date +%F).tgz -C /data .

# 恢复
docker run --rm -v aicoding_journey_backend-data:/data -v "$PWD":/backup \
  alpine sh -c "cd /data && tar xzf /backup/db-YYYY-MM-DD.tgz"
```

avatars / snapshots 同理（替换 volume 名）。

## 约束与已知事项

- **国内服务器构建**：backend/Dockerfile 已内置 apt 阿里云源 + pip 清华源；若拉取基础镜像（`python:3.12-slim`、`nginx:alpine`）慢或超时，需给 Docker daemon 配镜像加速器（`/etc/docker/daemon.json` 的 `registry-mirrors`，配后 `systemctl restart docker`）

- **发布页正则双处维护**：`frontend/vite.config.ts`（dev proxy）与 `frontend/nginx.conf`（生产）的正则必须保持一致，改动需同步
- **APP_PORT 必须与 uvicorn 端口一致**：快照服务自访问 `http://127.0.0.1:{APP_PORT}/...`，compose 中已锁死 8000
- **DATABASE_URL**：compose 覆盖为 `sqlite+aiosqlite:////app/data/htmlhost.db`，`backend/.env` 中的值仅本地开发生效
- **快照依赖**：镜像内 apt 安装了 `chromium` + `fonts-noto-cjk`；若 chromium 不可用，快照功能自动禁用（日志出现 "No Chrome/Chromium binary found"），不影响主服务
- **bcrypt==4.0.1**：backend Dockerfile 中 pin，兼容 passlib 1.7.4（bcrypt≥4.1 产生 trapped error 警告）
- 后端端口不发布到宿主机（`expose` 仅容器网络），唯一入口是 nginx
