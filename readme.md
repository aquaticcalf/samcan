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
|core         |8187         |3333         |1604         |13124        |
|test         |6383         |143          |1634         |8160         |
|**total**    |**14570**    |**3476**     |**3238**     |**21284**    |

### benchmarks

<details>
<summary>timeline</summary>

|name                            |ops/s                           |latency avg (ns)                |samples                         |
|--------------------------------|--------------------------------|--------------------------------|--------------------------------|
|timeline-eval-10-tracks         |1402671 ± 0.02%                 |728.05 ± 0.46%                  |686770                          |
|timeline-eval-100-tracks        |152697 ± 0.07%                  |6664.4 ± 0.34%                  |75026                           |
|timeline-eval-500-tracks        |33008 ± 0.13%                   |30691 ± 0.40%                   |16292                           |

</details>

<details>
<summary>scene graph</summary>

|name                            |ops/s                           |latency avg (ns)                |samples                         |
|--------------------------------|--------------------------------|--------------------------------|--------------------------------|
|scene-world-transform-1k-nodes  |673175 ± 0.06%                  |1574.9 ± 0.70%                  |317474                          |
|scene-world-transform-5k-nodes  |821988 ± 0.05%                  |1284.5 ± 0.57%                  |389245                          |

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
