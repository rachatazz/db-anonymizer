// Types for configuration
export interface ColumnConfig {
  name: string
  type: string
  localeCode?: "en" | "th"
}

export interface TableConfig {
  name: string
  columns: ColumnConfig[]
  batchSize?: number
}

export interface SchemaConfig {
  name: string
  tables: TableConfig[]
}

export interface Config {
  schemas: SchemaConfig[]
}

// Database connection options
export interface DbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}
