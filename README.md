# What is available

This respository is built for managing the check system for Programming Exercise 1 (F1)!
You can easily call teaching assistant or educational supporter from screen.

# What this use

- [FastAPI](https://fastapi.tiangolo.com/)
- HTML
- JavaScript
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)

# 動かし方 (worker/)

座席表の表示、学籍番号の照合、挙手の共有は Cloudflare Workers + Durable Objects で動きます。

    cd worker
    npm install
    cp .dev.vars.example .dev.vars          # openssl rand -hex 32 で値を入れる
    uv run python utils/build_seat_map.py   # 照合表 worker/src/seat_map.json を作る
    npm run dev                             # http://localhost:8787

- 秘密鍵(SEATMAP_SECRET)を変えたら照合表を作り直します。本番は `cd worker && npm run deploy` の前に `wrangler secret put SEATMAP_SECRET` へ同じ値を設定します。
- `npm run typecheck` と、devを起動した状態での `npm test` で確認できます。
- 照合表は学籍番号のHMACで、学籍番号そのものは含みません。
- `src/server/` のFastAPIは `/healthcheck` だけの状態で残しています。

# CI/CD

`.github/workflows/ci-cd.yml` が3つのjobを動かします。

- `python` — `uv sync --locked`、`ruff check`、`pytest`
- `worker` — 型チェックと、`wrangler dev` を起動しての `test/smoke.mjs`
- `deploy` — mainへのpush時に `wrangler deploy` で配信(PRでは動きません)

`data/` はgitに入れていないため、CIのスモークテストは仮の学籍番号2件で照合表を作り直してから実行します。

GitHub側に登録するもの:

| 種類 | 名前 | 内容 |
| --- | --- | --- |
| Secrets | `CLOUDFLARE_API_TOKEN` | Workers Scripts:Edit 権限のトークン |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | CloudflareのアカウントID |
| Variables | `WORKER_URL` | 配信後の確認に使う公開URL。未設定なら確認を省きます |

`SEATMAP_SECRET` はCloudflare側にだけ置き、CIには渡しません。初回だけ手元で `cd worker && npx wrangler secret put SEATMAP_SECRET` を実行し、照合表を作ったときと同じ値を入れてください。

配信先は `https://check-prog.<アカウントのworkers.devサブドメイン>.workers.dev` です。`WORKER_URL` にはこのURLを入れてください。Terraformでスクリプトを上げるだけではworkers.devのルートが有効にならず(エラー1042)、`terraform/main.tf` の `cloudflare_workers_script_subdomain` がそれを有効にします。

配信後の確認では、`/` がHTMLを返すことと、未登録の学籍番号が404になること(秘密鍵のbindingが残っていること)を見ています。

# Terraform (手元での確認用)

デプロイはwranglerが担当するので、Terraformは手元でWorkerの定義を確かめたいとき用です。stateは `terraform/terraform.tfstate` に置き、gitには入れません。

    cd worker && npm run build                      # dist/index.js を作る
    cd ../terraform
    cp terraform.tfvars.example terraform.tfvars    # account_id を書く
    export CLOUDFLARE_API_TOKEN=...
    terraform init && terraform apply

`terraform/main.tf` は `worker/wrangler.jsonc` と同じ内容を手で保ちます。`SEATMAP_SECRET` は `keep_bindings = ["secret_text"]` で温存するため、applyしても消えません。
