import { DB } from "../deps.ts";
import { performRegularCleanup, registerProcessCleanup } from "./registerProcessCleanup.ts";

if (import.meta.main) {
    await main(Deno.args)
}

async function main(args: string[]) {
    const db = new DB('.file-db.sqlite')
    db.execute(`
        create table if not exists config (
            key text primary key,
            value text
            )
    `)
    registerProcessCleanup(() => { db.close() })

    try {
        console.log({ args })
        await Promise.resolve()
    } finally {
        performRegularCleanup()
    }
}
