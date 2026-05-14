import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { SearchRequest, TextCard, ValidationResult } from "./types";

type JsonSchemaNode = {
  type?: string;
  enum?: Array<string | number>;
  minimum?: number;
  maximum?: number;
  required?: string[];
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  additionalProperties?: boolean;
};

const searchRequestSchema = z.object({
  query: z.string(),
  filters: z
    .object({
      primær_tekstkategori: z.string().optional(),
      fp9_relevans: z.enum(["høj", "middel", "lav", "uklar"]).optional(),
      status: z.enum(["verificeret", "foreløbig", "kræver kilde"]).optional()
    })
    .optional()
});

let cachedTextCardSchema: JsonSchemaNode | null = null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadTextCardSchema(): JsonSchemaNode {
  if (cachedTextCardSchema) {
    return cachedTextCardSchema;
  }

  const schemaPath = path.resolve(process.cwd(), "schemas", "text_card.schema.json");
  const rawSchema = fs.readFileSync(schemaPath, "utf8");

  cachedTextCardSchema = JSON.parse(rawSchema) as JsonSchemaNode;

  return cachedTextCardSchema;
}

function validateValue(
  value: unknown,
  schema: JsonSchemaNode,
  fieldPath: string,
  errors: string[]
): void {
  if (schema.type === "object") {
    if (!isPlainObject(value)) {
      errors.push(`${fieldPath || "body"} must be an object`);
      return;
    }

    const properties = schema.properties ?? {};

    for (const requiredKey of schema.required ?? []) {
      if (value[requiredKey] === undefined) {
        const requiredPath = fieldPath ? `${fieldPath}.${requiredKey}` : requiredKey;
        errors.push(`${requiredPath} is required`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          const extraPath = fieldPath ? `${fieldPath}.${key}` : key;
          errors.push(`${extraPath} is not allowed`);
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) {
        const propertyPath = fieldPath ? `${fieldPath}.${key}` : key;
        validateValue(value[key], propertySchema, propertyPath, errors);
      }
    }

    return;
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${fieldPath} must be an array`);
      return;
    }

    for (let index = 0; index < value.length; index += 1) {
      validateValue(value[index], schema.items ?? {}, `${fieldPath}[${index}]`, errors);
    }

    return;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${fieldPath} must be a string`);
      return;
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${fieldPath} must be one of: ${schema.enum.join(", ")}`);
    }

    return;
  }

  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${fieldPath} must be a number`);
      return;
    }

    if (schema.type === "integer" && !Number.isInteger(value)) {
      errors.push(`${fieldPath} must be an integer`);
    }

    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${fieldPath} must be >= ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${fieldPath} must be <= ${schema.maximum}`);
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${fieldPath} must be one of: ${schema.enum.join(", ")}`);
    }
  }
}

export function parseSearchRequest(input: unknown): ValidationResult<SearchRequest> {
  const result = searchRequestSchema.safeParse(input);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((issue) => {
        const fieldPath = issue.path.join(".") || "body";
        return `${fieldPath}: ${issue.message}`;
      })
    };
  }

  return {
    valid: true,
    errors: [],
    data: result.data
  };
}

export function validateTextCard(input: unknown): ValidationResult<TextCard> {
  const schema = loadTextCardSchema();
  const errors: string[] = [];

  validateValue(input, schema, "", errors);

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (input as TextCard) : undefined
  };
}
