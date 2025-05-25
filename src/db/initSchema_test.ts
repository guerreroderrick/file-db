import { assertGreater } from "@std/assert/greater"
import { getSQLSchemaVersions } from "./initSchema.ts"
import { assertFalse } from "@std/assert/false";

Deno.test(function getSSQLSchemaVersions_versionsShouldHaveScript() {
    const scripts = getSQLSchemaVersions()

    assertGreater(scripts.length, 1)
    for (const script of scripts) {
        assertGreater(script.script.length, 0)
        assertFalse(/\/\* Version:/i.test(script.script), `Script should not contain version comment: ${script.script}`)
    }
    console.log({ scripts })
})