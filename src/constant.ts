// Map of PostgreSQL types to Faker.js method categories
export const pgToFakerTypeMap: Record<string, string[]> = {
  "character varying": [
    "string",
    "name",
    "internet",
    "random",
    "datatype",
    "lorem",
    "phone",
    "person",
  ],
  varchar: [
    "string",
    "name",
    "internet",
    "random",
    "datatype",
    "lorem",
    "phone",
    "person",
  ],
  text: [
    "string",
    "name",
    "internet",
    "random",
    "datatype",
    "lorem",
    "phone",
    "person",
  ],
  uuid: ["datatype", "string", "random"],
  integer: ["number", "datatype"],
  bigint: ["number", "datatype"],
  smallint: ["number", "datatype"],
  numeric: ["number", "datatype"],
  decimal: ["number", "datatype"],
  real: ["number", "datatype"],
  "double precision": ["number", "datatype"],
  boolean: ["datatype"],
  date: ["date"],
  timestamp: ["date"],
  timestamptz: ["date"],
  json: ["datatype"],
  jsonb: ["datatype"],
}

// Default batch sizes for different table sizes
export const DEFAULT_BATCH_SIZE = 1000
export const LARGE_TABLE_BATCH_SIZE = 10000
export const LARGE_TABLE_THRESHOLD = 100000
