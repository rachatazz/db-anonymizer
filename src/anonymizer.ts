import { fakerTH, fakerEN, faker } from "@faker-js/faker"
import { Pool, PoolClient } from "pg"
import {
  DEFAULT_BATCH_SIZE,
  LARGE_TABLE_BATCH_SIZE,
  LARGE_TABLE_THRESHOLD,
  pgToFakerTypeMap,
} from "./constant"
import { Config, DbConfig, TableConfig } from "./interface"

export class DatabaseAnonymizer {
  private pool: Pool
  private config: Config
  private dryRun: boolean

  constructor(dbConfig: DbConfig, config: Config, dryRun: boolean = false) {
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
    })
    this.config = config
    this.dryRun = dryRun
  }

  public async anonymize(): Promise<void> {
    console.log("Starting database anonymization process...")

    try {
      // Validate configuration against database
      await this.validateConfig()

      // Process each schema
      for (const schema of this.config.schemas) {
        console.log(`Processing schema: ${schema.name}`)

        for (const table of schema.tables) {
          await this.anonymizeTable(schema.name, table)
        }
      }

      console.log("Anonymization completed successfully.")
    } catch (error) {
      console.error("Error during anonymization:", error)
      throw error
    } finally {
      await this.pool.end()
    }
  }

  private async validateConfig(): Promise<void> {
    console.log("Validating configuration against database...")

    const client = await this.pool.connect()
    try {
      // Check each schema exists
      for (const schema of this.config.schemas) {
        const schemaExists = await this.schemaExists(client, schema.name)
        if (!schemaExists) {
          throw new Error(
            `Schema '${schema.name}' does not exist in the database.`,
          )
        }

        // Check each table exists
        for (const table of schema.tables) {
          const tableExists = await this.tableExists(
            client,
            schema.name,
            table.name,
          )
          if (!tableExists) {
            throw new Error(
              `Table '${schema.name}.${table.name}' does not exist in the database.`,
            )
          }

          // Check each column exists and validate faker types
          for (const column of table.columns) {
            const columnInfo = await this.getColumnInfo(
              client,
              schema.name,
              table.name,
              column.name,
            )
            if (!columnInfo) {
              throw new Error(
                `Column '${column.name}' does not exist in table '${schema.name}.${table.name}'.`,
              )
            }

            // Validate Faker type compatibility with PostgreSQL type
            await this.validateFakerType(column.type, columnInfo.data_type)
          }
        }
      }
      console.log("Configuration validation successful.")
    } finally {
      client.release()
    }
  }

  private async schemaExists(
    client: PoolClient,
    schemaName: string,
  ): Promise<boolean> {
    const result = await client.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
      [schemaName],
    )
    return result.rows[0].exists
  }

  private async tableExists(
    client: PoolClient,
    schemaName: string,
    tableName: string,
  ): Promise<boolean> {
    const result = await client.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)",
      [schemaName, tableName],
    )
    return result.rows[0].exists
  }

  private async getColumnInfo(
    client: PoolClient,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<any> {
    const result = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
      [schemaName, tableName, columnName],
    )
    return result.rows[0]
  }

  private async validateFakerType(
    fakerType: string,
    pgType: string,
  ): Promise<void> {
    const [category, method] = fakerType.split(".")

    // Check if faker has this category and method
    if (typeof (faker as any)[category][method] !== "function") {
      throw new Error(`Invalid Faker.js type: ${fakerType}`)
    }

    // Check if this faker category is compatible with the PostgreSQL type
    const compatibleCategories = pgToFakerTypeMap[pgType.toLowerCase()] || []
    if (!compatibleCategories.includes(category)) {
      throw new Error(
        `Faker.js type '${fakerType}' is not compatible with PostgreSQL type '${pgType}'`,
      )
    }
  }

  private async anonymizeTable(
    schemaName: string,
    tableConfig: TableConfig,
  ): Promise<void> {
    console.log(`Anonymizing table: ${schemaName}.${tableConfig.name}`)

    const client = await this.pool.connect()
    try {
      // Get total row count to determine batch size
      const countResult = await client.query(
        `SELECT COUNT(*) FROM "${schemaName}"."${tableConfig.name}"`,
      )
      const totalRows = parseInt(countResult.rows[0].count, 10)
      console.log(`Table has ${totalRows} rows.`)

      // Determine batch size based on table size
      const batchSize =
        tableConfig.batchSize ||
        (totalRows >= LARGE_TABLE_THRESHOLD
          ? LARGE_TABLE_BATCH_SIZE
          : DEFAULT_BATCH_SIZE)

      // Process in batches for large tables
      const totalBatches = Math.ceil(totalRows / batchSize)

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const offset = batchNum * batchSize
        console.log(
          `Processing batch ${
            batchNum + 1
          }/${totalBatches} (offset: ${offset})`,
        )

        // Get batch of primary keys
        const keyResult = await client.query(
          `SELECT c.column_name as pk
           FROM information_schema.table_constraints tc
           JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
           JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
             AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
           WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1 AND tc.table_name = $2
           LIMIT 1`,
          [schemaName, tableConfig.name],
        )

        if (keyResult.rows.length === 0) {
          throw new Error(
            `Table ${schemaName}.${tableConfig.name} must have a primary key for batch processing.`,
          )
        }

        const pkColumn = keyResult.rows[0].pk
        const idResult = await client.query(
          `SELECT "${pkColumn}" FROM "${schemaName}"."${tableConfig.name}" ORDER BY "${pkColumn}" LIMIT $1 OFFSET $2`,
          [batchSize, offset],
        )

        if (idResult.rows.length === 0) {
          // No more rows to process
          break
        }

        // Start a transaction for this batch
        await client.query("BEGIN")

        try {
          for (const row of idResult.rows) {
            const pkValue = row[pkColumn]
            const setValues: string[] = []
            const params: any[] = []
            let paramIndex = 1

            for (const column of tableConfig.columns) {
              setValues.push(`"${column.name}" = $${paramIndex}`)
              const [category, method] = column.type.split(".")
              params.push(
                this.generateFakerValue(category, method, column.localeCode),
              )
              paramIndex++
            }

            params.push(pkValue) // Add primary key value as the last parameter

            const updateQuery = `
              UPDATE "${schemaName}"."${tableConfig.name}" 
              SET ${setValues.join(", ")} 
              WHERE "${pkColumn}" = $${paramIndex}
            `

            if (this.dryRun) {
              console.log(`Would execute: ${updateQuery} with params:`, params)
            } else {
              await client.query(updateQuery, params)
            }
          }

          // Commit the transaction
          if (!this.dryRun) {
            await client.query("COMMIT")
            console.log(`Batch ${batchNum + 1} committed successfully.`)
          } else {
            await client.query("ROLLBACK")
            console.log(
              `Batch ${batchNum + 1} would have been processed (dry run).`,
            )
          }
        } catch (error) {
          await client.query("ROLLBACK")
          throw error
        }
      }
    } finally {
      client.release()
    }
  }

  private generateFakerValue(
    category: string,
    method: string,
    localeCode?: "en" | "th",
  ): any {
    switch (localeCode) {
      case "en":
        return (fakerEN as any)[category][method]()

      case "th":
        return (fakerTH as any)[category][method]()

      default:
        return (faker as any)[category][method]()
    }
  }
}
