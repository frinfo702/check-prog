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
