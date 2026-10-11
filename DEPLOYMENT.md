# EmoBridge / Emotype Deployment

本项目当前正式运行目录是：

```bash
cd /root/Emotype
```

FastAPI 应用入口：

```text
emotion_rec.app:app
```

## 本地 / 服务器前台启动

```bash
cd /root/Emotype
python -m uvicorn emotion_rec.app:app --host 0.0.0.0 --port 8000
```

打开页面：

```text
http://127.0.0.1:8000/
```

## 后台启动

```bash
cd /root/Emotype
nohup /root/miniconda3/bin/python3 -m uvicorn emotion_rec.app:app \
  --host 0.0.0.0 \
  --port 8000 \
  > /tmp/emotype.log 2>&1 &
```

查看日志：

```bash
tail -f /tmp/emotype.log
```

## 健康检查

```bash
curl http://127.0.0.1:8000/healthz
```

页面检查：

```bash
curl -I http://127.0.0.1:8000/
curl -I http://127.0.0.1:8000/body
curl -I http://127.0.0.1:8000/body-sensation
curl -I http://127.0.0.1:8000/body_sensation
curl -I http://127.0.0.1:8000/diary
curl -I http://127.0.0.1:8000/review
curl -I http://127.0.0.1:8000/records
curl -I http://127.0.0.1:8000/history
```

## 环境变量

生成式模型调用统一走 `emotion_rec/integrations/llm.py`；
`emotion_rec/llm_client.py` 仅保留为旧导入路径的兼容层。

```bash
export DEEPSEEK_API_KEY=your_deepseek_api_key_here
export DEEPSEEK_MODEL=deepseek-flash
export GEMINI_API_KEY=your_gemini_api_key_here
export ADMIN_TOKEN=your_admin_token_here
```

常用变量：

| 变量 | 说明 |
| --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek key，缺失时走本地 fallback。 |
| `DEEPSEEK_MODEL` | 默认 LLM 模型。 |
| `LLM_ENABLED` | 默认启用。Render 上应为 `true`，`false` 会跳过真实模型调用。 |
| `DEEPSEEK_TIMEOUT_SECONDS` | 单次模型调用超时，默认 30 秒；Echo 超时后显示英文保底回复。 |
| `BODY_ADVICE_LLM_ENABLED` | Body Sense 模型建议开关，默认 `true`。 |
| `BODY_LLM_TIMEOUT_SECONDS` | Body Sense 单次建议调用超时，默认 25 秒；失败不重试，返回跟随输入语言的一般性提醒。 |
| `BODY_ADVICE_TIMEOUT_SECONDS` | Body Sense 总处理上限，默认且最多 35 秒；前端等待上限为 45 秒。 |
| `BODY_LLM_MAX_TOKENS` | Body Sense 默认 1536，范围 512–2048，精简输出以降低生成延迟。 |
| `DEEPSEEK_BASE_URL` | OpenAI-compatible base URL。 |
| `LLM_API_KEY` | 旧版 key alias。 |
| `GEMINI_API_KEY` | Google AI Studio key，用于图片上传的 Gemini VLM 分析，缺失时图片仅上传不分析。 |
| `GEMINI_MODEL` | Gemini 模型，默认 `gemini-2.5-flash`。 |
| `DATABASE_URL` | 数据库连接，缺失时使用 SQLite。 |
| `ADMIN_TOKEN` | 管理端导出和 all users 聚合接口 token。 |
| `MODEL_NAME_OR_PATH` | 本地 Wav2Vec2 模型路径。 |

不要把真实 key 写入仓库。生产环境应通过服务管理器、平台 secret 或 shell 环境注入。

Body Sense 的辅助情绪线索使用本地规则，不会因为 `TEXT_EMOTION_BACKEND=deepseek`
额外调用一次情绪 LLM。只进行一次建议模型请求，并保留非思考模式。
建议语言优先跟随本次补充描述，其次当前日记、其他手写输入；历史记录和固定按钮标签
不会覆盖它。没有可判断的文字时使用界面语言，新用户默认英文。
模型失败、返回语言错误或超过总处理上限时，页面会标明“一般性提醒”，不会把保底内容
标成模型生成结果。浏览器网络异常时会恢复生成按钮，并允许手动重试。

## 数据库

未设置 `DATABASE_URL` 时，默认使用：

```text
emotion_rec/emomirror_data.sqlite3
```

设置 PostgreSQL 示例：

```bash
export DATABASE_URL=postgresql://user:password@host:5432/database
```

代码会自动把 `postgres://` / `postgresql://` 转成 psycopg 兼容连接。当前主要表包括：

- `participants`
- `diary_entries`
- `formal_diaries`
- `emotion_review_reports`
- `usage_events`

## 主要页面

- `/`：Journal / 实时情绪识别与动态字体可视化。
- `/body`、`/body-sensation`、`/body_sensation`：身体感受记录。
- `/diary`：正式日记。
- `/review`：阶段性情绪复盘。
- `/records`、`/history`：我的历史记录。
- `/healthz`：健康检查。

## 关键 API 检查

```bash
curl "http://127.0.0.1:8000/api/diary?date=YYYY-MM-DD&participant_code=local"
curl "http://127.0.0.1:8000/api/review/overview?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&participant_code=local"
curl "http://127.0.0.1:8000/api/review/report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&participant_code=local"
curl "http://127.0.0.1:8000/api/records?participant_code=local&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&source=all"
```

管理端 all users 接口必须传 `ADMIN_TOKEN`：

```bash
curl "http://127.0.0.1:8000/api/admin/review/overview?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&participant_code=all" \
  -H "X-Admin-Token: your_admin_token_here"

curl "http://127.0.0.1:8000/api/admin/records?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&participant_code=all" \
  -H "X-Admin-Token: your_admin_token_here"
```

## 编译检查

```bash
python -m compileall emotion_rec emotion_computing hmotiongpt-api-test
```

## Docker / Render 说明

仓库保留 `Dockerfile` 和 `render.yaml`，可用于容器部署。容器需要 CPU PyTorch、FastAPI 依赖、`ffmpeg` 和 `libsndfile` 等音频依赖。

部署时至少配置：

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `GEMINI_API_KEY`（图片分析所需，可选）
- `DATABASE_URL`
- `ADMIN_TOKEN`

如果 `/healthz` 显示 `model_loaded: false`，优先检查模型文件路径、内存和服务日志。Wav2Vec2 模型文件较大，低内存实例可能无法加载。

## 英文演示与 Emo Echo 验收

新访客未设置语言时，网站默认英文；已经主动选过中文的浏览器保留中文偏好。
国际会议演示建议使用无痕窗口，或在个人设置中切换 English，避免旧浏览器偏好影响展示。
用户原始日记不会被翻译或改写。Echo 开场白固定英文，真实模型回复跟随最新输入语言；
Body Sense 的建议与安全提示固定英文。

Render 已配置 `DEEPSEEK_API_KEY` 时无需再写入本地文件或前端。确认部署环境使用：

```text
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
LLM_ENABLED=true
BODY_ADVICE_LLM_ENABLED=true
```

环境中显式设置的模型名会覆盖代码默认值。仅改本地代码或 `render.yaml` 不表示线上已更新，
需要将版本部署到 Render 后再验收。

1. 查看 `/healthz` 的 `llm_status`。`configured` 只表示 key 与 SDK 可用，不证明 key、余额或远端连通性。
2. 打开 `/essay` 保存一条 Journal，再到 Body Sense 生成并保存建议。
3. 向 Echo 询问近期记录。请求会装载同一参与者近 15 天的 Journal、已保存 Diary 与 Body Sense 数据。
4. 浏览器 Network 中 `/api/emo-echo/chat` 的响应应有 `reply_source: "model"`。
5. 分别发送英文、中文消息，检查回复语言。模型异常时页面仍显示正常英文聊天气泡，响应内部为
   `reply_source: "fallback"`，并带有安全错误码，便于排查而不打断演示。

常见错误码：`missing_api_key`（运行环境未读到 key）、`disabled`（关闭模型）、
`missing_sdk`（未安装依赖）、`authentication_failed`（认证失败）、`rate_limited`（限流或配额）、
`invalid_request`（模型名或参数问题）、`timeout`、`empty_response`、`provider_unavailable`。
日志不输出密钥或原始服务商错误内容。保底回复不写入真实模型会话历史，避免污染后续上下文。
旧版 Body Sense 记录若未保存补充描述，无法恢复过去缺失的文本；新版会保存供 Echo 使用。

## 自动回归检查

在已安装项目 Web 依赖的 Python 环境中，额外安装 `pytest`、`httpx` 后运行：

```bash
python -m pytest -q tests
node tests/test_frontend_i18n.cjs
```

测试使用独立临时数据库、音频桩和模拟模型响应，不访问真实用户数据库，不消耗模型余额。
SDK 边界测试使用真实 SDK 与模拟 HTTP 传输；这些测试不能替代 Render 上的付费模型实际验收。
缺少 `openai` 时 SDK 边界测试会跳过，因此完整验收环境需要安装项目依赖中的 `openai`。

可选的隔离页面验收服务（不是正式启动入口）：

```bash
python -m uvicorn tests.smoke_server:app --host 127.0.0.1 --port 8765
```

## 安全扫描

完成部署配置或文档变更后，应运行仓库约定的 key 扫描命令。只出现 `os.getenv(...)`、`DEEPSEEK_API_KEY=...`、`GEMINI_API_KEY=...` 或占位符示例可以接受。
