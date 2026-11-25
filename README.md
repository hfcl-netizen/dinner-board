# みんなの晩ごはん掲示板

その日食べた晩ごはんを投稿できる掲示板です。

## できること

- 晩ごはんの投稿（ジャンルを選べる）
- ジャンルで絞り込み
- いいね（1つの投稿に1回まで）
- 自分の投稿の削除

## 動かし方

```
docker compose up --build
```

http://localhost:8000 を開いてログインする

## Render

- Build Command: `npm install && npx prisma generate && npx prisma db push`
- Start Command: `node index.js`
- 環境変数 `DATABASE_URL` に Render の PostgreSQL の Internal Database URL を入れる
