# ジェンガレース 要件定義書

以下は、要件定義書の内容です。各プロジェクトの実情に合わせて適宜修正・更新してください。

────────────────────────────────────────────

## プロジェクト概要

### 1.1 背景
本プロジェクト「ジェンガレース」は、既存のアナログゲーム「ジェンガ」をオンライン対戦型として楽しめるサービスを提供することを目的とする。

### 1.2 目的
- ユーザーが遠隔地からリアルタイムのジェンガ対戦を楽しめるようにする
- 物理演算によるリアルなブロック挙動を再現し、没入感を高める
- ランキングやフレンド機能、リプレイ機能などを通じてコミュニティを活性化する

### 1.3 ステークホルダー
- 事業責任者／プロダクトオーナー
- 開発チーム
- マーケティングチーム
- サポート担当

### 1.4 用語定義
- ジェンガブロック: ゲーム内で物理演算の対象となるブロックオブジェクト
- マッチメイキング: 対戦プレイヤーを自動的にマッチング
- リプレイ: 終了した対戦内容を後から再生
- アイテム: 試合中、特殊効果を得られるゲーム内オブジェクト
- フレンド: ゲーム内で相互登録されるユーザー

────────────────────────────────────────────

## システム概要

### 2.1 システムコンセプト
オンラインでジェンガブロックを引き抜いて積み直す対戦型ゲームアプリケーション。

### 2.2 システム構成図（概要）
```
┌───────────┐       ┌───────────┐
│ クライアント │<----->│ Webサーバ (Node.js) │
└───────────┘ WebSocket │
                      └───────────┘
                              ↓
                        ┌───────────┐
                        │    DB (MongoDB)   │
                        └───────────┘
                              ↓
                        ┌───────────┐
                        │  物理演算・ゲームエンジン (Unity)  │
                        └───────────┘
```

────────────────────────────────────────────

## 機能要件

- ユーザー登録・認証システム
- マッチメイキングシステム
- ランキングシステム
- プレイヤープロフィール管理
- フレンド機能
- リアルタイム対戦システム
- 物理演算によるブロック操作
- アイテム使用システム
- スコア計算システム
- リプレイ保存・再生機能
- 管理機能

────────────────────────────────────────────

## 技術要件

- ゲームエンジン: Unity
- サーバーサイド: Node.js (Express + Socket.io)
- データベース: MongoDB
- 通信プロトコル: WebSocket, HTTPS

────────────────────────────────────────────

## 非機能要件

- 可用性: 99.9%以上
- 拡張性: 水平スケーリング、マイクロサービス
- 運用・保守性: 監視体制、ログ管理、定期メンテナンス

## API 仕様

### ユーザープロフィール更新API

- **エンドポイント**: PUT /api/users/update
- **機能**: 認証済みユーザーのプロフィール情報の更新
- **リクエストボディ**:
  - username (任意)
  - profilePicture (任意)
  - bio (任意)
- **レスポンス**: 更新後のユーザープロフィール（passwordフィールドは除外）
