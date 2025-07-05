import { assertGreater } from "@std/assert/greater"
import { applyVersion, getSQLSchemaVersions } from "./initSchema.ts"
import { assertFalse } from "@std/assert/false";
import { DB } from "../../deps.ts";
import { assert } from "@std/assert/assert";
import { assertEquals } from "@std/assert/equals";

Deno.test(function getSSQLSchemaVersions_versionsShouldHaveScript() {
    const scripts = getSQLSchemaVersions()

    assertGreater(scripts.length, 1)
    for (const script of scripts) {
        assertGreater(script.script.length, 0)
        assertFalse(/\/\* Version:/i.test(script.script), `Script should not contain version comment: ${script.script}`)
    }
})

Deno.test(function getSQLSchemaVersions_scriptShouldNotHaveTestData() {
    const scripts = getSQLSchemaVersions()

    for (const { script } of scripts) {
        assertFalse(script.includes('testData:'), `Should not contain testData: magic string: ${script}`)
    }
})

Deno.test(function applyVersion_withoutTests_shouldNotContainTestData() {
    const db = new DB(':memory:')
    const scripts = getSQLSchemaVersions()

    applyVersion({
        db,
        upToVersion: scripts.length - 1,
        includeTestData: false,
    })
    const hostnames = db.query<[hostname: string]>(`
select distinct hostname from [files_Log] where hostname like 'test-data-bad-host%'`
)
    assertEquals(hostnames.length, 0, `Expected no test data to be present, but found: ${hostnames}`)
})

Deno.test(function getSQLSchemaVersions_mayContainTestData() {
    const scripts = getSQLSchemaVersions()

    assert(scripts[1].testDataScript.length > 0, `Expected testDataScript to be non-empty for version 1, but got: ${scripts[1].testDataScript}`)
    assert(scripts[2].testDataScript.length > 0, `Expected testDataScript to be non-empty for version 2, but got: ${scripts[2].testDataScript}`)
})

Deno.test(function applyVersion_succeedsForAnyVersion() {
    const db = new DB(':memory:')

    const numScripts = getSQLSchemaVersions().length
    for (let i = 0; i < numScripts; i++) {
        applyVersion({ db, upToVersion: i, includeTestData: true,})
    }
})

Deno.test(function applyVersion_applyingPreviousVersionsIsSafe() {
    const db = new DB(':memory:')

    const numScripts = getSQLSchemaVersions().length
    for (let i = 0; i < numScripts; i++) {
        applyVersion({ db, upToVersion: i, })
        for (let j = 0; j < i; j++) {
            applyVersion({ db, upToVersion: j, includeTestData: true,})
            applyVersion({ db, upToVersion: j, includeTestData: false,})
        }
    }
})

