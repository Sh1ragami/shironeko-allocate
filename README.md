<img width="1049" height="290" alt="logo" src="https://github.com/user-attachments/assets/58043b3a-9827-44ef-a50a-4d334cf98297" />

<p align="center">
  <strong>GitHub 専用タスク管理アプリ</strong><br>
  Issue / Pull Request を「やること」として再定義する
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Allocate-GitHub%20Task%20Manager-111827?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat" />
  <img src="https://img.shields.io/badge/PHP-777BB4?logo=php&logoColor=white&style=flat" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=flat" />
  <img src="https://img.shields.io/badge/Shell-4EAA25?logo=gnu-bash&logoColor=white&style=flat" />
  <img src="https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=white&style=flat" />
  <img src="https://img.shields.io/badge/HTML-E34F26?logo=html5&logoColor=white&style=flat" />
</p>

<br>

## 概要

本プロジェクトは、ソフトウェア開発におけるタスク分割・担当者割り当て・進捗管理を自動化し、プロジェクト管理の効率化とチーム全体の生産性向上を実現するシステムです。

従来、開発初期のタスク設計や担当者のアサインは人手に依存することが多く、

* メンバーの スキル
* 稼働状況
* 希望分野
* 現在の負荷

といった要素を総合的に考慮した最適な割り当てを行うことは困難でした。
また、これらの調整や進捗把握はリーダーに大きな負担を与え、結果として開発スピードの低下や管理コストの増大につながるという課題がありました。

本システムでは、GitHubと連携し、タスク生成・割り当て・進捗管理を自動化することで、リーダーの負担を軽減し迅速な開発サイクルを実現します。

<br>

## 主な機能

1. タスク登録・自動生成
* ユーザーが実装したい機能、想定人数、タスク内容を入力
* gh コマンドを用いてタスクを GitHub Issue / PR として自動生成
* Issue / PR の作成・更新イベントを GitHub Actions 経由でサーバーに連携し、アサインや進捗管理に反映

2. 自動割り当て機能
* サーバー側で以下の要素を考慮し、スコアリングを実施
* スキルセット
* 希望分野
* 稼働時間帯 etc.

3. ダッシュボード
* Web UI 上で状況を可視化
* 必要に応じて 手動で担当者やタスク内容の編集も可能

<br>

## アーキテクチャ

```mermaid
flowchart LR
  A[Browser] --> B[Vite + TypeScript + Tailwind]
  B -->|/api/*| C[Laravel API]
  C --> D[(MySQL 8)]
  C -->|Proxy| E[GitHub API]
  subgraph Docker Compose
    B
    C
    D
  end
```

<br>

## メンバー

<table>
  <tr>
    <td align="center" width="160">
      <a href="https://github.com/Sh1ragami">
        <img src="https://github.com/Sh1ragami.png?size=160" width="96" height="96" style="border-radius:50%;" alt="Sh1ragami" />
        <br/>
        <sub><b>Sh1ragami</b></sub>
      </a>
      <br/>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/ruihigashi">
        <img src="https://github.com/ruihigashi.png?size=160" width="96" height="96" style="border-radius:50%;" alt="ruihigashi" />
        <br/>
        <sub><b>ruihigashi</b></sub>
      </a>
      <br/>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/miyuseki">
        <img src="https://github.com/miyuseki.png?size=160" width="96" height="96" style="border-radius:50%;" alt="miyuseki" />
        <br/>
        <sub><b>miyuseki</b></sub>
      </a>
      <br/>
    </td>
     <td align="center" width="160">
      <a href="https://github.com/uchinomanami">
        <img src="https://github.com/uchinomanami.png?size=160" width="96" height="96" style="border-radius:50%;" alt="uchinomanami`" />
        <br/>
        <sub><b>uchinomanami</b></sub>
      </a>
      <br/>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/ishihara0212">
        <img src="https://github.com/ishihara0212.png?size=160" width="96" height="96" style="border-radius:50%;" alt="ishihara0210`" />
        <br/>
        <sub><b>ishihara0212</b></sub>
      </a>
      <br/>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/ochimasato0186">
        <img src="https://github.com/ochimasato0186.png?size=160" width="96" height="96" style="border-radius:50%;" alt="ochimasato0186`" />
        <br/>
        <sub><b>ochimasato0186</b></sub>
      </a>
      <br/>
    </td>
  </tr>
</table>

<br>

## License

MIT License © 2025 [Sh1ragami](https://github.com/Sh1ragami)
