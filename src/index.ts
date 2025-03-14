import { program } from "commander"
import path from "path"
import fs from "fs/promises"
import { DatabaseAnonymizer } from "./anonymizer"
import { Config, DbConfig } from "./interface"
import * as dotenv from "dotenv"
dotenv.config()

async function main() {
  program
    .name("db-anonymizer")
    .description("PostgreSQL database anonymizer")
    .version("1.0.0")
    .requiredOption(
      "-c, --config <path>",
      "Path to the configuration file",
      "./config.json",
    )
    .option("-h, --host <host>", "Database host")
    .option("-p, --port <port>", "Database port")
    .option("-d, --database <name>", "Database name")
    .option("-u, --user <user>", "Database user")
    .option("-s, --password <password>", "Database password")
    .option(
      "--dry-run",
      "Perform a dry run without making actual changes",
      false,
    )
    .parse(process.argv)

  const options = program.opts()

  try {
    // Load configuration
    const configFile = await fs.readFile(path.resolve(options.config), "utf8")
    const config: Config = JSON.parse(configFile)

    // Check environment variables for database credentials if not provided via CLI
    const dbConfig: DbConfig = {
      host: options.host || process.env.PG_HOST || "localhost",
      port: parseInt(options.port || process.env.PG_PORT || "5432", 10),
      database: options.database || process.env.PG_DATABASE || "",
      user: options.user || process.env.PG_USER || "",
      password: options.password || process.env.PG_PASSWORD || "",
    }

    if (!dbConfig.database || !dbConfig.user) {
      console.error(
        "Database name and user must be provided via CLI options or environment variables.",
      )
      process.exit(1)
    }

    // Create and run anonymizer
    const anonymizer = new DatabaseAnonymizer(dbConfig, config, options.dryRun)
    await anonymizer.anonymize()
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
