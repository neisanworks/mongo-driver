import type { MaybePromise } from "bun";
import type * as mongo from "mongodb"
import type * as z from 'zod/v4'

// Utility Type
export type Prettier<T extends object> = { [K in keyof T]: T[K] } & {};

// Collection Types
export type Key<Schema extends z.ZodObject> =
  keyof z.output<Schema> extends string ? keyof z.output<Schema> : never;
export type CollectionIndex<Schema extends z.ZodObject> =
  | Record<Key<Schema>, mongo.IndexDirection>
  | Key<Schema>
  | Array<Key<Schema>>
  | Array<[Key<Schema>, mongo.IndexDirection]>
export type CollectionInit<
  Schema extends z.ZodObject,
  Methods extends object,
> = Prettier<
  mongo.CollectionOptions & {
    name: string;
    schema: Schema extends z.ZodObject<{ _id: any }> ? never : Schema;
    methods?: Methods & ThisType<z.output<Schema> & Methods>;
    uniques?: Array<Key<Schema>>;
    indexes?: CollectionIndex<Schema>;
  }
>;

// Search Types
export type Filter<Schema extends z.ZodObject> = Partial<z.output<Schema>>;
export type Predicate<Schema extends z.ZodObject, Methods extends object> = (
  instance: Model<Schema, Methods>,
) => MaybePromise<boolean>;
export type FindManySearch<
  Schema extends z.ZodObject,
  Methods extends object,
> = Filter<Schema> | Predicate<Schema, Methods>;
export type FindOneSearch<Schema extends z.ZodObject, Methods extends object> =
  | mongo.ObjectId
  | FindManySearch<Schema, Methods>;

// Cursor Types
export type SortParameters<Schema extends z.ZodObject> = Record<
  keyof z.output<Schema>,
  -1 | 1
>;
export interface FindOptions<Schema extends z.ZodObject> extends mongo.FindOptions {
  sort?: SortParameters<Schema>;
}

// Update Types
export interface UpdateOptions<
  Schema extends z.ZodObject,
> extends FindOptions<Schema> {
  returned?: boolean;
}
export type Updater<Schema extends z.ZodObject, Methods extends object> = (
  instance: Model<Schema, Methods>,
) => MaybePromise<Model<Schema, Methods>>;

// Instance Types
export type Model<
  Schema extends z.ZodObject,
  Methods extends object,
> = Prettier<{ _id: mongo.ObjectId } & z.output<Schema> & Methods>;
export type Transformation<
  Schema extends z.ZodObject,
  Methods extends object,
  T,
> = (instance: Model<Schema, Methods>) => T;

// Method Types
export interface DeleteMethod<
  Schema extends z.ZodObject,
  Methods extends object,
> {
  /**
   * Deletes all documents matching the specified filter.
   *
   * @param filter - Schema fields and values used to identify documents.
   * @param options - Optional query settings.
   * @returns The deleted models, or `null` if no documents match.
   */
  (
    filter: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): Promise<Array<Model<Schema, Methods>> | null>;

  /**
   * Deletes all documents accepted by the predicate.
   *
   * @param predicate - Function determining which documents to delete.
   * @param options - Optional query settings.
   * @returns The deleted models, or `null` if no documents match.
   */
  (
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Array<Model<Schema, Methods>> | null>;

  /**
   * Deletes a document by its ObjectId.
   *
   * @param id - MongoDB ObjectId of the document.
   * @param options - Optional query settings.
   * @returns The deleted model, or `null` if not found.
   */
  one(
    id: mongo.ObjectId,
    options?: FindOptions<Schema>,
  ): Promise<Model<Schema, Methods> | null>;

  /**
   * Deletes the first document matching the specified filter.
   *
   * @param filter - Schema fields and values used to identify the document.
   * @param options - Optional query settings.
   * @returns The deleted model, or `null` if none matches.
   */
  one(
    filter: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): Promise<Model<Schema, Methods> | null>;

  /**
   * Deletes the first document accepted by the predicate.
   *
   * @param predicate - Function determining which document to delete.
   * @param options - Optional query settings.
   * @returns The deleted model, or `null` if none matches.
   */
  one(
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Model<Schema, Methods> | null>;
}

export interface ExistMethod<
  Schema extends z.ZodObject,
  Methods extends object,
> {
  /**
   * Checks if a record exists in this collection.
   * @param {mongo.ObjectId} id The id of the record.
   * @param {FindOptions | undefined} options Optional settings for the command.
   * @returns {Promise<boolean>} A boolean, representing whether the record exists.
   * @example
   * const exists = await Users.exists(<id>)
   */
  (id: mongo.ObjectId, options?: FindOptions<Schema>): Promise<boolean>;

  /**
   * Checks if a record exists in this collection.
   * @param {Filter<Schema>} filter A filter to query for
   * @param {FindOptions | undefined} options Optional settings for the command.
   * @returns {Promise<boolean>} A boolean, representing whether the record exists.
   * @note
   * Filter matches only models with the exact key-value pairs passed.
   * For a more dynamic query, use a predicate.
   * @example
   * const exists = await Users.exists({ email: "<email>" })
   */
  (filter: Filter<Schema>, options?: FindOptions<Schema>): Promise<boolean>;

  /**
   * Checks if a record exists in this collection.
   * @param {Predicate<Schema, Methods>} predicate A predicate to match against.
   * @param {FindOptions | undefined} options Optional settings for the command.
   * @returns {Promise<boolean>} A boolean, representing whether the record exists.
   * @example
   * const exists = await Users.exists((user) => user.email === "<email>")
   */
  (
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<boolean>;
}



export interface UpdateMethod<
  Schema extends z.ZodObject,
  Methods extends object,
> {
  /**
   * Updates all documents matching the specified filter.
   *
   * Only the fields provided in `update` are modified. The update
   * values are validated against the collection schema.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param filter - Schema fields and values used to select documents.
   * @param update - A partial object containing the fields to update.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents, or an array of updated
   * models (or `null` if none were modified) when `returned` is `true`.
   * @example
   * const count = await Users.update(
   *   { locked: false },
   *   { locked: true },
   * );
   *
   * @example
   * const users = await Users.update(
   *   { locked: false },
   *   { locked: true },
   *   { returned: true },
   * );
   */
  <O extends UpdateOptions<Schema>>(
    filter: Filter<Schema>,
    update: Partial<z.output<Schema>>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Array<Model<Schema, Methods>> | null : number
  >;

  /**
   * Updates all documents matching a filter using an updater function.
   *
   * The updater receives each matching hydrated model, including its
   * custom instance methods, and returns the updated model.
   * Synchronous and asynchronous updater functions are supported.
   *
   * Each updated model is validated against the collection schema
   * before its changes are persisted.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param filter - Schema fields and values used to select documents.
   * @param updater - Function that receives a model and returns its updated form.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents, or an array of updated
   * models (or `null` if none were modified) when `returned` is `true`.
   * @example
   * const count = await Users.update(
   *   { locked: false },
   *   user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   * );
   *
   * @example
   * const users = await Users.update(
   *   { locked: false },
   *   async user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   *   { returned: true },
   * );
   */
  <O extends UpdateOptions<Schema>>(
    filter: Filter<Schema>,
    updater: Updater<Schema, Methods>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Array<Model<Schema, Methods>> | null : number
  >;

  /**
   * Updates all documents accepted by a predicate.
   *
   * The predicate receives a hydrated model and determines whether
   * it should be updated. Predicates may be synchronous or asynchronous.
   *
   * Only the fields provided in `update` are modified.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param predicate - Function determining which documents should be updated.
   * @param update - A partial object containing the fields to update.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents, or an array of updated
   * models (or `null` if none were modified) when `returned` is `true`.
   * @example
   * const count = await Users.update(
   *   user => user.attempts >= 5,
   *   { locked: true },
   * );
   *
   * @example
   * const users = await Users.update(
   *   user => user.attempts >= 5,
   *   { locked: true },
   *   { returned: true },
   * );
   */
  <O extends UpdateOptions<Schema>>(
    predicate: Predicate<Schema, Methods>,
    update: Partial<z.output<Schema>>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Array<Model<Schema, Methods>> | null : number
  >;

  /**
   * Updates all documents accepted by a predicate using an updater function.
   *
   * The predicate determines which hydrated models should be updated.
   * The updater then receives each matching model and returns its
   * updated form.
   *
   * Both functions may be synchronous or asynchronous. Updated models
   * are validated against the collection schema before persistence.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param predicate - Function determining which documents should be updated.
   * @param updater - Function that receives a model and returns its updated form.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents, or an array of updated
   * models (or `null` if none were modified) when `returned` is `true`.
   * @example
   * const count = await Users.update(
   *   user => user.attempts >= 5,
   *   user => {
   *     user.locked = true;
   *     return user;
   *   },
   * );
   *
   * @example
   * const users = await Users.update(
   *   async user => user.attempts >= 5,
   *   async user => {
   *     user.locked = true;
   *     return user;
   *   },
   *   { returned: true },
   * );
   */
  <O extends UpdateOptions<Schema>>(
    predicate: Predicate<Schema, Methods>,
    updater: Updater<Schema, Methods>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Array<Model<Schema, Methods>> | null : number
  >;

  /**
   * Updates a single document identified by its MongoDB ObjectId.
   *
   * Only the fields provided in `update` are modified.
   * The update values are validated against the collection schema.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param _id - The ObjectId of the document to update.
   * @param update - A partial object containing the fields to update.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   userId,
   *   { locked: true },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   userId,
   *   { locked: true },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    _id: mongo.ObjectId,
    update: Partial<z.output<Schema>>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;

  /**
   * Updates a single document by its ObjectId using an updater function.
   *
   * The updater receives the hydrated model associated with the
   * ObjectId and returns its updated form. Both synchronous and
   * asynchronous updater functions are supported.
   *
   * The updated model is validated against the collection schema
   * before persistence.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param _id - The ObjectId of the document to update.
   * @param updater - Function that receives the model and returns its updated form.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   userId,
   *   user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   userId,
   *   async user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    _id: mongo.ObjectId,
    updater: Updater<Schema, Methods>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;

  /**
   * Updates the first document matching the specified filter.
   *
   * Filter properties are matched against their corresponding document
   * fields. Only the fields provided in `update` are modified.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param filter - Schema fields and values used to locate a document.
   * @param update - A partial object containing the fields to update.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   { username: "Alice" },
   *   { locked: true },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   { username: "Alice" },
   *   { locked: true },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    filter: Filter<Schema>,
    update: Partial<z.output<Schema>>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;

  /**
   * Updates the first document matching a filter using an updater function.
   *
   * The updater receives the first matching hydrated model and returns
   * its updated form. Synchronous and asynchronous updater functions
   * are supported.
   *
   * The updated model is validated against the collection schema
   * before persistence.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param filter - Schema fields and values used to locate a document.
   * @param updater - Function that receives the model and returns its updated form.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   { username: "Alice" },
   *   user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   { username: "Alice" },
   *   async user => {
   *     user.attempts += 1;
   *     return user;
   *   },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    filter: Filter<Schema>,
    updater: Updater<Schema, Methods>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;

  /**
   * Updates the first document accepted by a predicate.
   *
   * The predicate receives hydrated models and selects the first
   * one for which it returns `true`. Predicates may be synchronous
   * or asynchronous and can access custom instance methods.
   *
   * Only the fields provided in `update` are modified.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param predicate - Function determining which document should be updated.
   * @param update - A partial object containing the fields to update.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   user => user.attempts >= 5,
   *   { locked: true },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   user => user.attempts >= 5,
   *   { locked: true },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    predicate: Predicate<Schema, Methods>,
    update: Partial<z.output<Schema>>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;

  /**
   * Updates the first document accepted by a predicate using an updater function.
   *
   * The predicate determines which document should be updated, and the
   * updater receives the matching hydrated model and returns its
   * updated form.
   *
   * Both predicate and updater may be synchronous or asynchronous.
   * The updated model is validated against the collection schema
   * before persistence.
   *
   * @typeParam O - The update options type, used to infer the return type.
   * @param predicate - Function determining which document should be updated.
   * @param updater - Function that receives the model and returns its updated form.
   * @param options - Optional query settings, including `returned`.
   * @returns The number of modified documents (0 or 1), or the updated
   * model (or `null` if no modification occurred) when `returned` is `true`.
   * @example
   * const count = await Users.update.one(
   *   user => user.attempts >= 5,
   *   user => {
   *     user.locked = true;
   *     return user;
   *   },
   * );
   *
   * @example
   * const user = await Users.update.one(
   *   async user => user.attempts >= 5,
   *   async user => {
   *     user.locked = true;
   *     return user;
   *   },
   *   { returned: true },
   * );
   */
  one<O extends UpdateOptions<Schema>>(
    predicate: Predicate<Schema, Methods>,
    updater: Updater<Schema, Methods>,
    options?: O,
  ): Promise<
    O extends { returned: true } ? Model<Schema, Methods> | null : number
  >;
}