**Project Name:** db-anonymizer

**Description:**
db-anonymizer is a PostgreSQL database anonymizer tool that uses Faker.js to generate fake data. It allows users to anonymize sensitive data in their databases while preserving the original schema and relationships.

**Features:**

* Anonymize data in PostgreSQL databases using Faker.js
* Supports various data types, including strings, numbers, dates, and more
* Configurable batch sizes for efficient anonymization
* Dry-run mode for testing and validation
* Command-line interface (CLI) for easy usage

**Usage:**

1. Install the required dependencies by running `pnpm install`.
2. Create a configuration file (e.g., `config.json`) that defines the schema and tables to anonymize. See the example configuration file below.
3. Build the application: `pnpm build`.
4. Run the anonymizer using the CLI: `pnpm start -c <path-to-config-file>`.
5. Optional: Use environment variables to set database credentials (e.g., `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`).

**Example Configuration File:**
```json
{
  "schemas": [
    {
      "name": "public",
      "tables": [
        {
          "name": "users",
          "columns": [
            { "name": "first_name", "type": "person.firstName", "localeCode": "en" },
            { "name": "last_name", "type": "person.lastName", "localeCode": "en" },
            { "name": "email", "type": "internet.email" }
            { "name": "phone_number", "type": "phone.number", "localeCode": "th" }
          ]
        }
      ]
    }
  ]
}
```
**Environment Variables:**

* `PG_HOST`: PostgreSQL host
* `PG_PORT`: PostgreSQL port
* `PG_DATABASE`: PostgreSQL database name
* `PG_USER`: PostgreSQL username
* `PG_PASSWORD`: PostgreSQL password

**CLI Options:**

* `-c, --config <path>`: Path to the configuration file (default: `./config.json`)
* `-h, --host <host>`: Database host (default: `localhost`)
* `-p, --port <port>`: Database port (default: `5432`)
* `-d, --database <name>`: Database name
* `-u, --user <user>`: Database user
* `-s, --password <password>`: Database password
* `--dry-run`: Perform a dry run without making actual changes (default: `false`)

**Faker Path Table:**

The following [Faker.js](https://fakerjs.dev/) methods are supported:

| Faker Method | Description |
| --- | --- |
| `person.firstName` | Generate a first name |
| `person.lastName` | Generate a last name |
| `phone.number` | Generate a phone number |
| `internet.email` | Generate an email address |
| `datatype.uuid` | Generate a UUID |
| `datatype.number` | Generate a random number |
| `datatype.date` | Generate a random date |
| `datatype.boolean` | Generate a random boolean value |
| `lorem.word` | Generate a random word |
| `lorem.sentence` | Generate a random sentence |
| `lorem.paragraph` | Generate a random paragraph |

**Build and Run with pnpm:**

1. Install pnpm by running `npm install -g pnpm` or `yarn global add pnpm`.
2. Install the required dependencies by running `pnpm install`.
3. Build the project by running `pnpm build`.
4. Run the project by running `pnpm start`.

**License:**
MIT License

**Author:**
Mr. Rachata Rongluan