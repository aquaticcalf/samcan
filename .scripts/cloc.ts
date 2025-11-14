import { $ } from "bun"

await $`bunx cloc core editor | tail -n +2 > .stats/loc`

export {}
