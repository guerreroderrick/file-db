import { DB } from '../../deps.ts'
import { getCanonicalPath } from "../path/getCanonicalPath.ts";

export class DBCheckedFile {
    public readonly filename: string

    constructor(filename: string) {
        const canonicalPath = getCanonicalPath(filename)
        const dbCheck = new DB(canonicalPath)
        dbCheck.close()

        this.filename = canonicalPath
    }
    useDb() {
        return new DBInstance(new DB(this.filename))
    }
}

export class DBInstance {
    public readonly db: DB

    constructor(db: DB) {
        this.db = db
    }

    [Symbol.dispose]() {
        this.db.close()
    }
}
