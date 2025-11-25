## samcan

### what?

samcan is an animation runtime for the web, my attempt at resurrecting [Flash](https://en.wikipedia.org/wiki/Adobe_Flash)

### install

<details open>
<summary>npm</summary>

```bash
npm install samcan
```
</details>

<details>
<summary>bun</summary>

```bash
bun add samcan
```
 </details>

<details>
<summary>yarn</summary>

```bash
yarn add samcan
```
</details>

<details>
<summary>pnpm</summary>

```bash
pnpm add samcan
```
</details>

### import

```ts
import { AnimationRuntime } from "samcan"
```

### lines of code

|x            |code         |comments     |empty        |total        |
|-------------|-------------|-------------|-------------|-------------|
|core         |8602         |3758         |1714         |14074        |
|test         |6796         |275          |1688         |8759         |
|**total**    |**15398**    |**4033**     |**3402**     |**22833**    |

### benchmarks

<details>
<summary>timeline</summary>

|name                            |ops/s                           |latency avg (ns)                |samples                         |
|--------------------------------|--------------------------------|--------------------------------|--------------------------------|
|timeline-eval-10-tracks         |1225841 ± 0.06%                 |915.52 ± 0.20%                  |546136                          |
|timeline-eval-100-tracks        |124915 ± 0.20%                  |8806.5 ± 0.51%                  |56777                           |
|timeline-eval-500-tracks        |26831 ± 0.40%                   |40710 ± 0.84%                   |12283                           |

</details>

<details>
<summary>scene graph</summary>

|name                            |ops/s                           |latency avg (ns)                |samples                         |
|--------------------------------|--------------------------------|--------------------------------|--------------------------------|
|scene-world-transform-1k-nodes  |1002282 ± 0.09%                 |1218.6 ± 1.08%                  |410298                          |
|scene-world-transform-5k-nodes  |1011793 ± 0.08%                 |1172.1 ± 0.96%                  |426584                          |

</details>

### star history

<a href="https://www.star-history.com/#aquaticcalf/samcan&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=aquaticcalf/samcan&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=aquaticcalf/samcan&legend=bottom-right" />
   <img alt="star history chart" src="https://api.star-history.com/svg?repos=aquaticcalf/samcan&legend=bottom-right" />
 </picture>
</a>

### badges

[![npm](https://img.shields.io/npm/v/samcan?style=for-the-badge&color=000000&labelColor=000000)](https://www.npmjs.com/package/samcan/)
[![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&color=000000&labelColor=000000)](https://github.com/aquaticcalf/samcan/tree/dev?tab=MIT-1-ov-file)
[![typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&color=000000)](https://www.npmjs.com/package/samcan/)

<br/>

<p align="center">built with &nbsp;<img src="https://raw.githubusercontent.com/kirodotdev/Kiro/c18e8771341281fb8c4ca46bbc41e0b2a29b5313/assets/kiro-icon.png" alt="kiro" width="20" height="20" style="vertical-align: middle;"></p>
