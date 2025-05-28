import { assertGreater } from "@std/assert/greater"
import { applyVersion, getSQLSchemaVersions } from "./initSchema.ts"
import { assertFalse } from "@std/assert/false";
import { DB } from "../../deps.ts";

Deno.test(function getSSQLSchemaVersions_versionsShouldHaveScript() {
    const scripts = getSQLSchemaVersions()

    assertGreater(scripts.length, 1)
    for (const script of scripts) {
        assertGreater(script.script.length, 0)
        assertFalse(/\/\* Version:/i.test(script.script), `Script should not contain version comment: ${script.script}`)
    }
})

Deno.test(function applyVersion_succeedsForAnyVersion() {
    const db = new DB(':memory:')

    const numScripts = getSQLSchemaVersions().length
    for (let i = 0; i < numScripts; i++) {
        applyVersion(db, i)
    }
})

Deno.test(function applyVersion_applyingPreviousVersionsIsSafe() {
    const db = new DB(':memory:')

    const numScripts = getSQLSchemaVersions().length
    for (let i = 0; i < numScripts; i++) {
        applyVersion(db, i)
        for (let j = 0; j < i; j++) {
            applyVersion(db, j)
        }
    }
})

