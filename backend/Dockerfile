# 快照服务（services/snapshot.py）通过系统 Chrome 候选路径调用 chromium，
# apt 安装的 /usr/bin/chromium 正好命中；fonts-noto-cjk 保证中文页面截图不缺字。
# 不跑 `playwright install`——浏览器走 executable_path，pip 包仅用于驱动。
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# apt 换阿里云镜像源（trixie 为 deb822 格式，源在 sources.list.d/debian.sources）
RUN sed -i 's@deb.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 层缓存：依赖不变时不重装
COPY requirements.txt .
# bcrypt pin 到 4.0.1：passlib 1.7.4 兼容（bcrypt>=4.1 移除 __about__ 产生 trapped error 警告）
# pip 换清华镜像源
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
        -r requirements.txt "bcrypt==4.0.1"

COPY app ./app
COPY static ./static

# /app/data 存 SQLite（compose 挂 volume）；avatars/snapshots 为持久化挂载点。
# named volume 首次挂载继承镜像内目录属主，chown 必须在镜像里做。
RUN mkdir -p /app/data /app/static/avatars /app/static/snapshots \
    && useradd -m appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV APP_PORT=8000
EXPOSE 8000

# seed 幂等（内含 init_db）；exec 让 SIGTERM 直达 uvicorn，保证 SQLite 落盘。
# --host 0.0.0.0 必须（默认 127.0.0.1 时 nginx 连不上）；端口须与 APP_PORT 一致（快照自访问依赖）。
CMD ["sh", "-c", "python -m app.seed && exec uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT:-8000}"]
