<img width="1049" height="290" alt="スクリーンショット 2025-12-17 12 24 46" src="https://github.com/user-attachments/assets/b90b4331-95c2-4314-a440-0a5756564931" />


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

##  概要

**Allocate** は、  GitHub 上の **Issue・Pull Request** をタスクとして一元管理できる  
**GitHub 特化型タスク管理アプリ**です。

GitHub から離れた瞬間に形骸化しがちなタスク管理を、  **開発フローの中心に引き戻す** ことを目的にしています。

<br>

## コンセプト

> GitHub を、タスク管理ツールとして使い切る

- Issue = やること  
- Pull Request = 進捗  
- GitHub = 開発のハブ

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
      <a href="https://github.com/manamisan0321">
        <img src="https://github.com/manamisan0321.png?size=160" width="96" height="96" style="border-radius:50%;" alt="manamisan0321" />
        <br/>
        <sub><b>manamisan0321</b></sub>
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

MIT License © 2021 [Anthony Fu](https://github.com/antfu)
