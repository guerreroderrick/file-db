import { DB } from '../deps.ts'

if (import.meta.main) {
    const db = new DB('.file-db.sqlite')
    db.execute(`
        create table if not exists config (
            key text primary key,
            value text
            )
    `)

    db.close()
}
