# ジェンガレース オンラインマルチプレイヤーゲーム

リアルタイムで複数人が遊べる物理演算ベースのジェンガゲームです。プレイヤー同士でブロックを抜き合い、タワーを倒さずに勝利を目指します。

## プロジェクト概要

Jenga Raceは以下の機能を持つフルスタックWebアプリケーションです：
- アカウント作成・プロフィール管理
- マッチメイキングキューによる対戦相手の検索
- 物理演算によるリアルタイムジェンガ対戦
- ゲーム中のチャット機能
- 統計の記録とランキング機能

## 技術スタック

### バックエンド
- **Node.js** + Express（サーバーサイド）
- **Socket.io**（リアルタイム通信）
- **MongoDB**（データ保存）
- **JWT**（認証）
- **bcrypt**（パスワードハッシュ化）

### フロントエンド
- **バニラJavaScript**（モジュラー構成）
- **Bootstrap**（レスポンシブUI）
- **Socket.ioクライアント**（リアルタイム更新）
- **Unity WebGL**（ゲームクライアント／現在はプレースホルダー）

## 主な機能

### ユーザー管理
- メールアドレス＋パスワード登録
- ログイン／ログアウト
- プロフィール作成・編集
- JWT認証
- bcryptによるパスワードハッシュ

### マッチメイキング
- 実力に基づいたマッチング
- キュー管理
- 実力範囲の動的拡大
- リアルタイムでの対戦検索

### ゲームメカニクス
- Socket.ioによる部屋管理
- ターン制ゲーム進行
- ブロックの移動・除去
- ゲーム状態管理
- 勝者／敗者の判定

### 分析・ランキング
- ゲーム統計の記録
- プレイヤーパフォーマンス指標
- リーダーボード
- 利用状況分析

## プロジェクト構成

```
JengaRace/
├── backend/                # Node.jsサーバー
│   ├── middleware/         # 認証ミドルウェア
│   ├── models/             # MongoDBスキーマ
│   ├── routes/             # APIエンドポイント
│   └── server.js           # メインサーバーファイル
├── frontend/               # Webクライアント
│   ├── js/                 # JSモジュール
│   │   ├── api.js          # APIサービス
│   │   ├── auth.js         # 認証サービス
│   │   ├── game.js         # ゲームサービス
│   │   ├── main.js         # メインエントリポイント
│   │   └── ui.js           # UIサービス
│   ├── index.html          # メインHTML
│   └── styles.css          # CSS
├── game/                   # Unity WebGLゲームクライアント
│   └── index.html          # プレースホルダー
├── .env                    # 環境変数
└── README.md               # プロジェクトドキュメント
```

## インストール手順

1. リポジトリをクローン：
```bash
git clone https://github.com/attt84/gengarace.git
cd JengaRace
```

2. 依存パッケージをインストール：
```bash
cd backend
npm install
```

3. 環境変数を設定：
プロジェクトのルート直下に`.env`ファイルを作成し、以下の内容を記載してください。
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/jengarace
JWT_SECRET=jenga_race_secret_key_2025
NODE_ENV=development
```

4. サーバーを起動：
```bash
npm start
```

5. ブラウザでアプリケーションを開く：
```
http://localhost:3000
```

## 開発情報

### バックエンドAPIエンドポイント

#### 認証
- `POST /api/users/register` - 新規ユーザー登録
- `POST /api/users/login` - ログインしJWTトークン取得
- `GET /api/users/me` - 現在のユーザープロフィール取得

#### ゲーム
- `POST /api/game/create` - 新規ゲーム作成
- `POST /api/game/join` - 既存ゲームへ参加
- `POST /api/game/ready` - プレイヤーの準備状態設定
- `POST /api/game/move` - ゲーム内の行動
- `POST /api/game/remove-block` - ブロックを抜く
- `POST /api/game/end` - ゲーム終了（タワー崩壊）

#### マッチメイキング
- `POST /api/matchmaking/join` - マッチメイキング参加
- `POST /api/matchmaking/leave` - マッチメイキング離脱
- `GET /api/matchmaking/status` - 現在のマッチメイキング状態取得

#### 分析
- `GET /api/analytics/usage` - 一般的な利用状況
- `GET /api/analytics/games` - ゲーム別統計
- `GET /api/analytics/leaderboard` - ランキングデータ
- `GET /api/analytics/user-stats` - 認証ユーザーの統計

### Socket.ioイベント

#### クライアント→サーバー
- `joinGame` - ゲーム部屋に参加
- `moveBlock` - ブロック移動
- `removeBlock` - ブロック除去
- `chatMessage` - チャット送信
- `leaveGame` - ゲーム離脱

#### サーバー→クライアント
- `playerJoined` - プレイヤーが参加
- `gameStarted` - ゲーム開始
- `blockMoved` - ブロックが動いた
- `blockRemoved` - ブロックが除去された
- `gameEnded` - ゲーム終了
- `chatMessage` - 新しいチャットメッセージ

## 今後の拡張予定

- Unity WebGLゲームクライアントの完成
- 包括的なエラーハンドリング
- より高度なゲーム物理演算
- テストスイートの拡充
- 本番環境向けデプロイスクリプト
- フレンド機能、プライベートゲーム
- トーナメントやイベント機能

## ライセンス

このプロジェクトはMITライセンスです。詳細はLICENSEファイルを参照してください。

