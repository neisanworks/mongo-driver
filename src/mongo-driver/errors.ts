import type { Key } from "@/types/driver.js";
import * as z from "zod/v4"

export class InvalidDocError extends Error {
    constructor() {
        super("Collection Document Did Not Pass Schema Validation")
    }
}

export class ParseError<Schema extends z.ZodObject> extends Error {
  errors: Partial<Record<keyof z.output<Schema>, string>> = {};

  constructor(errors: z.ZodError<z.output<Schema>>) {
    super("Data Does Not Match Schema Shape");
    z.treeifyError(errors, (issue) => {
      const path = issue.path.at(0);
      if (path) this.errors[path as keyof z.output<Schema>] = issue.message;
    });
  }
}

export class RejectError extends Error {}

export class ConflictError<Schema extends z.ZodObject> extends Error {
    constructor(key: Key<Schema>) {
        super(`Conflicted Data at ["${key}"]`)
    }
}