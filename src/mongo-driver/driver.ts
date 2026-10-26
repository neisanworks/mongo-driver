import assert from "node:assert";
import { decode, encode } from "@/utils/helpers.js";
import * as mongo from "mongodb";
import * as z from "zod/v4";
import {
  ConflictError,
  InvalidDocError,
  ParseError,
  RejectError,
} from "./errors.js";
import type {
  CollectionIndex,
  CollectionInit,
  DeleteMethod,
  ExistMethod,
  Filter,
  FindManySearch,
  FindOneSearch,
  FindOptions,
  Model,
  Predicate,
  Prettier,
  SortParameters,
  Transformation,
  UpdateMethod,
  UpdateOptions,
  Updater,
} from "@/types/driver.js";

export interface FindMethod<
  Schema extends z.ZodObject,
  Methods extends object,
> {
  /**
   * Creates a cursor for iterating over all documents in the collection.
   *
   * @returns A cursor yielding hydrated collection models.
   * @example
   * const cursor = Users.find();
   *
   * for await (const user of cursor) {
   *   console.log(user.username);
   * }
   */
  (): FindCursor<Schema, Methods, Model<Schema, Methods>>;

  /**
   * Creates a cursor for documents matching the specified filter.
   *
   * Filter properties are matched against their corresponding document fields.
   *
   * @param filter - Schema fields and values used to filter documents.
   * @param options - Optional query settings, such as sorting, skipping, and limiting.
   * @returns A cursor yielding matching documents, optionally transformed.
   * @example
   * const cursor = Users.find({ username: "Alice" });
   * const users = await cursor.toArray();
   *
   * @example
   * const cursor = Users.find(
   *   { username: "Alice" },
   *   { limit: 10 },
   * );
   */
  (
    filter: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): FindCursor<Schema, Methods, Model<Schema, Methods>>;

  /**
   * Creates a cursor that evaluates a predicate against hydrated documents.
   *
   * Predicates may be synchronous or asynchronous and can access both
   * schema properties and custom instance methods.
   *
   * @param predicate - Function that returns whether a document should be included.
   * @param options - Optional query settings, such as sorting, skipping, and limiting.
   * @returns A cursor yielding documents accepted by the predicate.
   * @example
   * const cursor = Users.find(user => user.username.startsWith("A"));
   *
   * @example
   * const cursor = Users.find(
   *   async user => user.authenticate("password"),
   *   {},
   * );
   */
  (
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): FindCursor<Schema, Methods, Model<Schema, Methods>>;

  /**
   * Creates a cursor for documents matching the specified filter.
   *
   * Filter properties are matched against their corresponding document fields.
   *
   * @param filter - Schema fields and values used to filter documents.
   * @param options - Optional query settings, such as sorting, skipping, and limiting.
   * @param transform - Optional function applied to each matching model.
   * @returns A cursor yielding matching documents, optionally transformed.
   * @example
   * const cursor = Users.find({ username: "Alice" });
   * const users = await cursor.toArray();
   *
   * @example
   * const cursor = Users.find(
   *   { username: "Alice" },
   *   { limit: 10 },
   *   user => user.username,
   * );
   */
  <T>(
    filter: Filter<Schema>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): FindCursor<Schema, Methods, T>;

  /**
   * Creates a cursor that evaluates a predicate against hydrated documents.
   *
   * Predicates may be synchronous or asynchronous and can access both
   * schema properties and custom instance methods.
   *
   * @param predicate - Function that returns whether a document should be included.
   * @param options - Optional query settings, such as sorting, skipping, and limiting.
   * @param transform - Optional function applied to each matching model.
   * @returns A cursor yielding documents accepted by the predicate.
   * @example
   * const cursor = Users.find(user => user.username.startsWith("A"));
   *
   * @example
   * const cursor = Users.find(
   *   async user => user.authenticate("password"),
   *   {},
   *   user => user.username,
   * );
   */
  <T>(
    predicate: Predicate<Schema, Methods>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): FindCursor<Schema, Methods, T>;

  (
    search?: FindManySearch<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): FindCursor<Schema, Methods, Model<Schema, Methods>>;

  <T>(
    search: FindManySearch<Schema, Methods>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): FindCursor<Schema, Methods, T>;

  /**
   * Retrieves all documents matching the specified filter.
   *
   * Unlike `find()`, this method resolves the matching documents
   * into an array instead of returning a cursor.
   *
   * @param filter - Schema fields and values used to filter documents.
   * @param options - Optional query settings, such as sorting and limiting.
   * @returns An array of matching models, or `null` if no documents match.
   * @example
   * const users = await Users.find.many({ username: "Alice" });
   */
  many(
    filter: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): Promise<Array<Model<Schema, Methods>> | null>;

  /**
   * Retrieves all documents accepted by a predicate.
   *
   * The predicate receives a hydrated model and may access custom methods.
   * Both synchronous and asynchronous predicates are supported.
   *
   * @param predicate - Function determining whether each document matches.
   * @param options - Optional query settings.
   * @returns An array of matching models, or `null` if no documents match.
   * @example
   * const users = await Users.find.many(user => user.username.startsWith("A"));
   */
  many(
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Array<Model<Schema, Methods>> | null>;

  /**
   * Retrieves all documents matching the specified filter.
   *
   * Unlike `find()`, this method resolves the matching documents
   * into an array instead of returning a cursor.
   *
   * @param filter - Schema fields and values used to filter documents.
   * @param options - Query settings, such as sorting and limiting.
   * @param transform - Function applied to each matching model.
   * @returns An array of transformed matching models, or `null` if no documents match.
   * @example
   * const users = await Users.find.many(
   *   user => user.username.startsWith("A"),
   *   {},
   *   user => user.username
   * );
   */
  many<T>(
    filter: Filter<Schema>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<Array<T> | null>;

  /**
   * Retrieves all documents accepted by a predicate.
   *
   * The predicate receives a hydrated model and may access custom methods.
   * Both synchronous and asynchronous predicates are supported.
   *
   * @param predicate - Function determining whether each document matches.
   * @param options - Query settings, such as sorting and limiting.
   * @param transform - Function applied to each matching model.
   * @returns An array of transformed matching models, or `null` if no documents match.
   * @example
   * const users = await Users.find.many(
   *   user => user.username.startsWith("A"),
   *   {},
   *   user => user.username
   * );
   */
  many<T>(
    predicate: Predicate<Schema, Methods>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<Array<T> | null>;

  many(
    search: FindManySearch<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Array<Model<Schema, Methods>> | null>;

  many<T>(
    search: FindManySearch<Schema, Methods>,
    options: FindOptions<Schema> | undefined,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<Array<T> | null>;

  /**
   * Retrieves a single document by its MongoDB ObjectId.
   *
   * @param id - The ObjectId of the document to retrieve.
   * @param options - Optional query settings applied to the search.
   * @returns The hydrated document, or `null` if it does not exist.
   * @example
   * const user = await Users.find.one(
   *   new ObjectId("507f1f77bcf86cd799439011"),
   * );
   */
  one(
    id: mongo.ObjectId,
    options?: FindOptions<Schema>,
  ): Promise<Prettier<Model<Schema, Methods>> | null>;

  /**
   * Retrieves the first document matching the specified filter.
   *
   * @param filter - Schema fields and values used to locate the document.
   * @param options - Optional query settings applied to the search.
   * @returns The first matching hydrated model, or `null` if none exists.
   * @example
   * const user = await Users.find.one({ username: "Alice" });
   */
  one(
    filter: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): Promise<Prettier<Model<Schema, Methods>> | null>;

  /**
   * Retrieves the first document accepted by a predicate.
   *
   * The predicate receives a hydrated model and may access custom methods.
   * Asynchronous predicates are also supported.
   *
   * @param predicate - Function determining whether a document matches.
   * @param options - Optional query settings applied to the search.
   * @returns The first matching hydrated model, or `null` if none exists.
   * @example
   * const user = await Users.find.one(user => user.username.startsWith("A"));
   */
  one(
    predicate: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Prettier<Model<Schema, Methods>> | null>;

  /**
   * Retrieves a document by its ObjectId and optionally transforms it.
   *
   * @typeParam T - The resulting type after transformation.
   * @param id - The ObjectId of the document to retrieve.
   * @param options - Query settings applied to the search.
   * @param transform - Function applied to the hydrated document.
   * @returns The transformed result, or `null` if no document exists.
   * @example
   * const username = await Users.find.one(
   *   new ObjectId("507f1f77bcf86cd799439011"),
   *   {},
   *   user => user.username,
   * );
   */
  one<T>(
    id: mongo.ObjectId,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<T | null>;

  /**
   * Retrieves the first document matching a filter and optionally transforms it.
   *
   * @typeParam T - The resulting type after transformation.
   * @param filter - Schema fields and values used to locate the document.
   * @param options - Query settings applied to the search.
   * @param transform - Function applied to the matching hydrated document.
   * @returns The transformed result, or `null` if no document matches.
   * @example
   * const username = await Users.find.one(
   *   { username: "Alice" },
   *   {},
   *   user => user.username,
   * );
   */
  one<T>(
    filter: Filter<Schema>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<T | null>;

  /**
   * Retrieves the first document accepted by a predicate and transforms it.
   *
   * The predicate may be synchronous or asynchronous. The transformation
   * runs only after a matching document has been found.
   *
   * @typeParam T - The resulting type after transformation.
   * @param predicate - Function determining whether a document matches.
   * @param options - Query settings applied to the search.
   * @param transform - Function applied to the matching hydrated document.
   * @returns The transformed result, or `null` if no document matches.
   * @example
   * const username = await Users.find.one(
   *   user => user.username.startsWith("A"),
   *   {},
   *   user => user.username,
   * );
   */
  one<T>(
    predicate: Predicate<Schema, Methods>,
    options: FindOptions<Schema>,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<T | null>;

  one(
    search: FindOneSearch<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<Model<Schema, Methods> | null>;

  one<T>(
    search: FindOneSearch<Schema, Methods>,
    options: FindOptions<Schema> | undefined,
    transform: Transformation<Schema, Methods, T>,
  ): Promise<T | null>;
}

class FindCursor<
  Schema extends z.ZodObject,
  Methods extends object,
  T = Model<Schema, Methods>,
> {
  private readonly collection: MongoCollection<Schema, Methods>;
  private readonly cursor: mongo.FindCursor;
  private readonly query: Filter<Schema>;
  private readonly search?: FindManySearch<Schema, Methods>;
  private readonly _limit: number;
  private readonly _skip: number;
  private skipped: number = 0;
  private yielded: number = 0;
  private readonly options?: FindOptions<Schema>;
  private readonly transform?: Transformation<Schema, Methods, T>;

  constructor(
    collection: MongoCollection<Schema, Methods>,
    search?: FindManySearch<Schema, Methods>,
    options?: FindOptions<Schema>,
    transform?: Transformation<Schema, Methods, T>,
  ) {
    this.collection = collection;
    this.query = typeof search === "object" ? encode(search) : {};
    this.search = search;
    this.options = options;

    const { limit, skip, ...rest } = this.options ?? {};
    this._limit = limit === undefined || limit === 0 ? Infinity : limit;
    this._skip = skip ?? 0;

    this.transform = transform;
    this.cursor = collection.collection.find(this.query, {
      ...rest,
      ...(typeof search !== "function" ? { skip, limit } : {}),
    });
  }

  /**
   * The cursor is closed and all remaining locally buffered documents have been iterated.
   * @return {boolean} Whether the `FindCursor<Schema, Instance>` is closed.
   * @example
   * const cursor = Users.find((user) => user.email.startsWith('example'));
   *
   * let closed = cursor.closed; // Returns `false`
   * await cursor.close();
   * closed = cursor.closed; // Returns `true`
   * */
  get closed(): boolean {
    return this.cursor.closed;
  }

  /**
   * An alias for {@link FindCursor.close()}
   * @return {Promise<void>}
   * @experimental
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.cursor.close();
  }

  /**
   * @return {AsyncGenerator<T, void, unknown>}
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T, void, unknown> {
    while (true) {
      const next: IteratorResult<T> = await this.next();
      if (next.done) break;
      yield next.value;
    }
  }

  /**
   * Creates a new uninitialized copy of this cursor,
   * with options matching those that have been set on the current instance.
   *
   * @return {FindCursor<Schema, Methods, T>} A clone of the `FindCursor<Schema, Methods, Transformed>`.
   * @example
   * const cursor = Users.find((user) => user.email.startsWith('example'))
   * const clone = cursor.clone()
   */
  clone(): FindCursor<Schema, Methods, T> {
    return new FindCursor(
      this.collection,
      this.search,
      this.options,
      this.transform,
    );
  }

  /**
   * Frees any client-side resources used by the cursor.
   *
   * @example
   * const cursor = Users.find((user) => user.email.startsWith('example'));
   * cursor.close();
   * */
  async close(options?: { timeoutMS?: number }): Promise<void> {
    return await this.cursor.close(options);
  }

  /**
   * @return {Promise<number>} An exact count of documents matching the filter.
   * @example
   * const cursor = Users.find((user) => user.locked);
   * const lockedUsers = await cursor.count();
   */
  async count(): Promise<number> {
    let count: number = 0;
    for await (const _ of this.clone()) {
      count++;
    }
    return count;
  }

  /**
   * @return {Promise<boolean>} Whether this cursor has a next IterableResult.
   */
  async hasNext(): Promise<boolean> {
    const clone = this.clone().skip(this.yielded);
    return !(await clone.next()).done;
  }

  /**
   * Set this cursor hint.
   * @param hint {mongo.Hint} If specified, then the query system will only consider plans using the hinted index.
   * @return {FindCursor<Schema, Instance, T>} New FindCursor with hint applied.
   * @example
   * const cursor = Users.find((user) => user.locked).hint({ attempts: 1 });
   */
  hint(hint: mongo.Hint): FindCursor<Schema, Methods, T> {
    return new FindCursor(
      this.collection,
      this.search,
      { ...this.options, hint },
      this.transform,
    );
  }

  /**
   * Set the limit for this cursor.
   * @param {number} limit The limit for this cursor query.
   * @return {FindCursor<Schema, Instance, T>} New FindCursor with limit applied.
   * @example
   * const cursor = Users.find((user) => user.locked).limit(10);
   */
  limit(limit: number): FindCursor<Schema, Methods, T> {
    return new FindCursor(
      this.collection,
      this.search,
      { ...this.options, limit },
      this.transform,
    );
  }

  /**
   * Get the next available model from this cursor.
   * If this cursor is mapped, available models will be returned transformed.
   * Returns `{ done: true, value: undefined }` if no more models are available.
   * @return {IteratorResult<T, null>} An IterableResult with T | null as the value.
   */
  async next(): Promise<IteratorResult<T, null>> {
    let next: Record<string, any> | null = await this.cursor.next();
    while (next !== null) {
      if (typeof this.search === "function" && this.yielded >= this._limit) {
        break;
      }

      const parsed = await this.collection.schema.safeParseAsync(decode(next));
      if (!parsed.success) {
        next = await this.cursor.next();
        continue;
      }

      assert(next._id instanceof mongo.ObjectId);
      const instance = this.collection.instance(next._id, parsed.data);
      if (typeof this.search === "function" && !(await this.search(instance))) {
        next = await this.cursor.next();
        continue;
      }

      if (typeof this.search === "function" && this._skip > this.skipped) {
        this.skipped++;
        next = await this.cursor.next();
        continue;
      }

      const value: Model<Schema, Methods> | T = this.transform
        ? await this.transform(instance)
        : instance;
      if (value === null) break;

      this.yielded++;

      return { done: false, value } as IteratorResult<T, null>;
    }

    await this.close();
    return { done: true, value: null };
  }

  /**
   * Rewind this cursor to its uninitialized state.
   * Any options that are present on the cursor will remain in effect.
   * Iterating this cursor will cause new queries to be sent to the server,
   * even if the resultant data has already been retrieved by this cursor.
   * @return {void}
   */
  rewind(): void {
    this.cursor.rewind();
    this.skipped = 0;
    this.yielded = 0;
  }

  /**
   * Set the skip for this cursor.
   * @param {number} skip  The skip of this cursor query.
   */
  skip(skip: number): FindCursor<Schema, Methods, T> {
    return new FindCursor(
      this.collection,
      this.search,
      { ...this.options, skip },
      this.transform,
    );
  }

  /**
   * Sets the sort order of this cursor query.
   * @param {SortParameters<Schema>} sort The key(s) and direction(s) set for the sort.
   * @return {FindCursor<Schema, Instance, T>} New FindCursor with sort applied.
   * @note Use `1` to sort in ascending (lowest first) order, and `-1` to sort in descending (highest first) order.
   * @example
   * const cursor = BlogPosts.find().limit(10).sort({ views: -1 });
   */
  sort(sort: SortParameters<Schema>): FindCursor<Schema, Methods, T> {
    return new FindCursor(
      this.collection,
      this.search,
      { ...this.options, sort },
      this.transform,
    );
  }

  /**
   * Returns an array of documents. The caller is responsible for making sure that
   * there is enough memory to store the results.
   * @returns {Array<Instance> | null} An array of models, or null if no matches
   * @note
   * The array only contains partial results when this cursor had been previously accessed.
   * In that case, cursor.rewind() can be used to reset the cursor.
   * @example
   * const posts = await BlogPosts.find().limit(10).sort({ views: -1 }).toArray();
   */
  async toArray(): Promise<Array<T> | null> {
    const results: Array<T> = [];
    for await (const result of this) {
      results.push(result);
    }
    return results.length > 0 ? results : null;
  }
}

class MongoCollection<Schema extends z.ZodObject, Methods extends object> {
  readonly collection!: mongo.Collection;
  readonly schema!: Schema;
  readonly methods!: Methods | null;

  constructor(
    db: mongo.Db,
    {
      name,
      schema,
      methods,
      uniques,
      indexes,
      ...options
    }: CollectionInit<Schema, Methods>,
  ) {
    Object.defineProperty(this, "collection", {
      writable: false,
      configurable: false,
      enumerable: false,
      value: db.collection(name, options),
    });
    Object.defineProperty(this, "schema", {
      writable: false,
      configurable: false,
      enumerable: false,
      value: schema,
    });
    Object.defineProperty(this, "methods", {
      writable: false,
      configurable: false,
      enumerable: false,
      value: methods ?? null,
    });

    for (const unique of Array.from(new Set(uniques))) {
      this.collection.createIndex(
        { [unique]: 1 },
        { unique: true, name: unique },
      );
    }
    if (indexes) this.createIndex(indexes);
  }

  /**
   * Retrieves the name of the collection.
   *
   * @returns {string} the name of the collection.
   */
  get collectionName(): string {
    return this.collection.collectionName;
  }

  /**
   * Retrieves the name of the MongoDB database that this collection is a part of.
   *
   * @returns {string} the name of the MongoDB database.
   */
  get dbName(): string {
    return this.collection.dbName;
  }

  /**
   * Retrieves the hint applied to the collection.
   *
   * @returns {mongo.Hint | undefined} the hint applied to the collection, or undefined if no hint is set.
   */
  get hint(): mongo.Hint | undefined {
    return this.collection.hint;
  }

  /**
   * Sets the hint for the collection.
   *
   * @param {mongo.Hint} hint - the hint to set for the collection
   */
  set hint(hint: mongo.Hint) {
    this.collection.hint = hint;
  }

  /**
   * Retrieves the namespace of the collection.
   *
   * The namespace is a string that combines the name of the database
   * and the name of the collection, separated by a dot.
   *
   * @returns {string} the namespace of the collection.
   */
  get namespace(): string {
    return this.collection.namespace;
  }

  /**
   * Retrieves the read concern applied to the collection.
   *
   * @returns {mongo.ReadConcern | undefined} the read concern applied to the collection, or undefined if no read concern is set.
   */
  get readConcern(): mongo.ReadConcern | undefined {
    return this.collection.readConcern;
  }

  /**
   * Retrieves the read preference applied to the collection.
   *
   * @returns {mongo.ReadPreference | undefined} the read preference applied to the collection, or undefined if no read preference is set.
   */
  get readPreference(): mongo.ReadPreference | undefined {
    return this.collection.readPreference;
  }

  /**
   * Retrieves the timeout in milliseconds for the collection.
   *
   * @returns {number | undefined} the timeout in milliseconds for the collection, or undefined if no timeout is set.
   */
  get timeoutMS(): number | undefined {
    return this.collection.timeoutMS;
  }

  /**
   * Retrieves the write concern applied to the collection.
   *
   * @returns {mongo.WriteConcern | undefined} the write concern applied to the collection, or undefined if no write concern is set.
   */
  get writeConcern(): mongo.WriteConcern | undefined {
    return this.collection.writeConcern;
  }

  /**
   * Returns the exact count of models matching the filter.
   * @param {FindOptions<Schema> | undefined} filter The filter to find matching models.
   * @param options {CountOptions | undefined} Optional settings for the command.
   * @note
   * Filter matches only documents with the exact key-value pairs passed.
   * For a more dynamic query, use a predicate.
   * @example
   * const comments = await PostComments.count({ parent: <parent-identifier> })
   */
  async count(
    filter?: Filter<Schema>,
    options?: FindOptions<Schema>,
  ): Promise<number>;
  /**
   * Returns the exact count of models matching the predicate.
   * @param {Predicate<Schema, Method> | undefined} predicate The predicate to find matching models.
   * @param options {CountOptions | undefined} Optional settings for the command.
   * @example
   * const comments = await PostComments.count((comment) => comment.likes >= 30)
   */
  async count(
    predicate?: Predicate<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<number>;
  async count(
    search?: FindManySearch<Schema, Methods>,
    options?: FindOptions<Schema>,
  ): Promise<number> {
    return (
      typeof search === "function"
        ? this.find(search, options)
        : this.find(search ?? {}, options)
    ).count();
  }

  /**
   * Creates an index on this collection.
   * @param index {SortParameters<Schema>} The key(s) and direction(s) to order the index.
   * @return {Promise<string>} The name of the index.
   * @note Use `1` to sort in ascending (lowest first) order, and `-1` to sort in descending (highest first) order.
   * @example
   * const userEmailIndex = await Users.createIndex({ email: 1 });
   */
  async createIndex(index: CollectionIndex<Schema>): Promise<string> {
    return this.collection.createIndex(index);
  }

  readonly delete: DeleteMethod<Schema, Methods> = Object.assign(
    async (
      search: FindManySearch<Schema, Methods>,
      options?: FindOptions<Schema>,
    ) => {
      const matches: Array<Model<Schema, Methods>> = [];
      for await (let match of this.find(search, options)) {
        const result = await this.collection.deleteOne({ _id: match._id });
        if (result.deletedCount === 1) matches.push(match);
      }
      return matches.length === 0 ? null : matches;
    },
    {
      one: async (
        search: FindOneSearch<Schema, Methods>,
        options?: FindOptions<Schema>,
      ) => {
        if (search instanceof mongo.ObjectId) {
          const match = await this.find.one(search, options);
          if (match === null) return null;

          return (await this.collection.deleteOne({ _id: match._id }))
            .deletedCount === 1
            ? match
            : null;
        }

        const cursor = this.find(search, options);
        for await (let match of cursor) {
          if (
            (await this.collection.deleteOne({ _id: match._id }))
              .deletedCount === 1
          ) {
            await cursor.close();
            return match;
          }
        }

        await cursor.close();
        return null;
      },
    },
  );

  /**
   * Drop this collection from the database, removing it permanently.
   * New access will create a new collection.
   * @param {mongo.DropCollectionOptions} options Optional setting for the command.
   * @return {Promise<boolean>} A boolean representing whether the collection was dropped.
   * @example
   * const Users = db.collection({
   *     name: 'users',
   *     schema: UserSchema,
   *     model: UserModel,
   *     indexes: [{ email: 1 }]
   * });
   * const dropped = await Users.drop();
   */
  async drop(options?: mongo.DropCollectionOptions): Promise<boolean> {
    return this.collection.drop(options);
  }

  /**
   * Drops an index from this collection.
   * @param {string} name The name of the index to drop.
   * @param {mongo.CommandOperationOptions | undefined} options Optional settings for the command.
   * @example
   * const userEmailIndex = await Users.createIndex({ email: 1 });
   * await Users.dropIndex(userEmailIndex);
   */
  async dropIndex(
    name: string,
    options?: mongo.CommandOperationOptions,
  ): Promise<void> {
    await this.collection.dropIndex(name, options);
  }

  readonly exists: ExistMethod<Schema, Methods> = async (
    search: FindOneSearch<Schema, Methods>,
    options?: FindOptions<Schema>,
  ) => {
    if (typeof search !== "function") {
      return (
        (await this.collection.findOne(
          search instanceof mongo.ObjectId ? { _id: search } : encode(search),
          options,
        )) !== null
      );
    }
    return (await this.find.one(search, options)) !== null;
  };

  readonly find: FindMethod<Schema, Methods> = Object.assign(
    <T = Model<Schema, Methods>>(
      search?: FindManySearch<Schema, Methods>,
      options?: FindOptions<Schema>,
      transform?: Transformation<Schema, Methods, T>,
    ) => {
      return new FindCursor(this, search, options, transform);
    },
    {
      one: async <T = Model<Schema, Methods>>(
        search: FindOneSearch<Schema, Methods>,
        options?: FindOptions<Schema>,
        transform?: Transformation<Schema, Methods, T>,
      ) => {
        if (search instanceof mongo.ObjectId) {
          const match = await this.collection.findOne({ _id: search }, options);
          if (match === null) return null;

          const parsed = await this.schema.safeParseAsync(match);
          if (!parsed.success) {
            throw new InvalidDocError();
          }

          const instance = this.instance(match._id, parsed.data);

          return transform ? await transform(instance) : instance;
        }

        let cursor:
          | FindCursor<Schema, Methods, T>
          | FindCursor<Schema, Methods, Model<Schema, Methods>>;
        if (typeof search === "function") {
          cursor = transform
            ? this.find(search, options ?? {}, transform)
            : this.find(search, options ?? {});
        } else {
          cursor = transform
            ? this.find(search, options ?? {}, transform)
            : this.find(search, options ?? {});
        }
        const { value } = await cursor.next();
        await cursor.close();

        return value;
      },
      many: async <T = Model<Schema, Methods>>(
        search?: FindManySearch<Schema, Methods>,
        options?: FindOptions<Schema>,
        transform?: Transformation<Schema, Methods, T>,
      ) => {
        let cursor:
          | FindCursor<Schema, Methods, T>
          | FindCursor<Schema, Methods, Model<Schema, Methods>>;
        if (typeof search === "function") {
          cursor = transform
            ? this.find(search, options ?? {}, transform)
            : this.find(search, options ?? {});
        } else {
          cursor = transform
            ? this.find(search ?? {}, options ?? {}, transform)
            : this.find(search, options ?? {});
        }
        return cursor.toArray();
      },
    },
  );

  /**
   * Inserts a single record into the collection.
   * @param {z.input<Schema>} record Data matching the shape of `Schema` input.
   * @param {mongo.InsertOneOptions} options Optional settings for this command.
   * @return {Promise<Model<Schema, Methods>>} The inserted model if `acknowledged` is `true`
   * @throws {ParseError} If `record` does not match schema shape.
   * @throws {RejectError} If mongodb server does not acknowledges insertion.
   * @throws {ConflictError} If unique key's value exists in the collection.
   * @note
   * Passed records cannot have an `_id` property.
   * Any record with `_id` property will have it deleted.
   * @example
   * const Users = db.collection({
   *     name: 'users',
   *     schema: {
   *        email: z.email(),
   *        username: z.string().regex(<username-pattern>),
   *        password: z.string().regex(<password-pattern>),
   *        attempts: z.number().min(0).default(0),
   *     },
   *     uniques: ['email']
   * })
   *
   * const user1 = await Users.insert({
   *      email: 'email@email.com',
   *      username: <username>,
   *      password: <password>
   * })
   * const user2 = await Users.insert({
   *      email: 'email@email.com', // will throw `UniqueError`
   *      username: <username>,
   *      password: <password>
   * })
   */
  async insert(
    record: z.core.input<Schema>,
    options?: mongo.InsertOneOptions,
  ): Promise<Model<Schema, Methods>> {
    const parsed = await this.schema.safeParseAsync(record);
    if (!parsed.success) {
      throw new ParseError(parsed.error);
    }
    if ("_id" in parsed.data) delete parsed.data._id;

    try {
      const result = await this.collection.insertOne(
        encode(parsed.data),
        options,
      );
      if (!result.acknowledged) {
        throw new RejectError("Database Rejected Document Insertion");
      }

      return this.instance(result.insertedId, parsed.data);
    } catch (error: unknown) {
      if (error instanceof mongo.MongoServerError) {
        if (error.code === 11000) {
          const key = Object.keys(error.errorResponse.keyPattern).at(0) ?? "";
          throw new ConflictError(key);
        }
      }
      throw error;
    }
  }

  /**
   * Instatiate a hydrated colleciton model
   * @param {z.output<Schema>} data Data in the shape of the schema
   * @returns {Model<Schema, Methods>} Instantiated collection model
   * @example
   * const user = Users.instance(Users.schema.parse(data))
   */
  instance(
    _id: mongo.ObjectId,
    data: z.output<Schema>,
  ): Model<Schema, Methods> {
    const model = Object.assign(Object.create(this.methods ?? null), data);
    Object.defineProperty(model, "_id", {
      configurable: false,
      enumerable: true,
      writable: false,
      value: _id,
    });
    return model;
  }

  readonly update: UpdateMethod<Schema, Methods> = Object.assign(
    async <O extends UpdateOptions<Schema>>(
      search: FindManySearch<Schema, Methods>,
      updater: Partial<z.output<Schema>> | Updater<Schema, Methods>,
      settings?: O,
    ) => {
      const { returned, ...options } = settings ?? {};

      let update: Partial<z.output<Schema>> | undefined;
      if (typeof updater === "object") {
        const keys = new Set(Object.keys(updater));
        const parsed = await this.schema.partial().safeParseAsync(updater);
        if (!parsed.success) throw new ParseError(parsed.error);
        update = Object.fromEntries(
          Object.entries(parsed.data).filter(([k]) => keys.has(k)),
        ) as Partial<z.output<Schema>>;
      }

      if (
        typeof search === "function" ||
        typeof updater === "function" ||
        returned
      ) {
        const changed: Array<Model<Schema, Methods>> = [];
        let count: number = 0;

        const cursor = this.find(search, options);
        for await (let match of cursor) {
          if (typeof updater === "function") {
            const updated = await updater(match);
            const parsed = await this.schema.safeParseAsync(updated);
            if (!parsed.success) continue;

            const result = await this.collection.updateOne(
              { _id: match._id },
              { $set: encode(parsed.data) },
            );
            if (!result.acknowledged) {
              await cursor.close();
              throw new RejectError("Database Rejected Update");
            }
            if (result.modifiedCount > 0) {
              returned ? changed.push(updated) : count++;
            }
          } else {
            assert(update);
            const result = await this.collection.updateOne(
              { _id: match._id },
              { $set: encode(update) },
            );
            if (!result.acknowledged) {
              await cursor.close();
              throw new RejectError("Database Rejected Update");
            }
            if (result.modifiedCount > 0) {
              returned ? changed.push(Object.assign(match, update)) : count++;
            }
          }
        }

        if (returned) {
          return changed.length === 0 ? null : changed;
        }

        return count;
      }

      const result = await this.collection.updateMany(
        encode(search),
        { $set: encode(update) },
        options,
      );
      if (!result.acknowledged) {
        throw new RejectError("Database Rejected Update");
      }

      return result.modifiedCount;
    },
    {
      one: async <O extends UpdateOptions<Schema>>(
        search: FindOneSearch<Schema, Methods>,
        updater: Partial<z.output<Schema>> | Updater<Schema, Methods>,
        settings?: O,
      ) => {
        const { returned, ...options } = settings ?? {};

        let update: Partial<z.output<Schema>> | undefined;
        if (typeof updater === "object") {
          const keys = new Set(Object.keys(updater));
          const parsed = await this.schema.partial().safeParseAsync(updater);
          if (!parsed.success) throw new ParseError(parsed.error);
          update = Object.fromEntries(
            Object.entries(parsed.data).filter(([k]) => keys.has(k)),
          ) as Partial<z.output<Schema>>;
        }

        if (
          typeof search === "function" ||
          typeof updater === "function" ||
          returned
        ) {
          const match = await this.find.one(search, options);
          if (match === null) return returned ? null : 0;

          let updated: Model<Schema, Methods>;

          if (typeof updater === "function") {
            updated = await updater(match);
          } else {
            assert(update);
            updated = Object.assign(match, update);
          }

          const parsed = await this.schema.safeParseAsync(updated);
          if (!parsed.success) throw new ParseError(parsed.error);

          const result = await this.collection.updateOne(
            { _id: match._id },
            { $set: encode(parsed.data) },
            options,
          );
          if (!result.acknowledged) {
            throw new RejectError("Database Rejected Update");
          }

          if (returned) {
            return result.modifiedCount > 0
              ? this.instance(match._id, parsed.data)
              : null;
          }

          return result.modifiedCount;
        }

        assert(update);
        const result = await this.collection.updateOne(
          search instanceof mongo.ObjectId ? { _id: search } : encode(search),
          { $set: encode(update) },
        );
        if (!result.acknowledged) {
          throw new RejectError("Database Rejected Update");
        }

        return result.modifiedCount;
      },
    },
  );
}

class MongoDataBase {
  private readonly _db!: mongo.Db;

  constructor(
    client: mongo.MongoClient,
    name: string,
    options?: mongo.DbOptions,
  ) {
    Object.defineProperty(this, "_db", {
      writable: false,
      configurable: false,
      enumerable: false,
      value: client.db(name, options),
    });
  }

  get bsonOptions(): mongo.BSONSerializeOptions {
    return this._db.bsonOptions;
  }

  get databaseName(): string {
    return this._db.databaseName;
  }

  get namespace(): string {
    return this._db.namespace;
  }

  get options(): mongo.DbOptions | undefined {
    return this._db.options;
  }

  get readConcern(): mongo.ReadConcern | undefined {
    return this._db.readConcern;
  }

  get readPreference(): mongo.ReadPreference | undefined {
    return this._db.readPreference;
  }

  get secondaryOk(): boolean | undefined {
    return this._db.secondaryOk;
  }

  get timeoutMS(): number | undefined {
    return this._db.timeoutMS;
  }

  get writeConcern(): mongo.WriteConcern | undefined {
    return this._db.writeConcern;
  }

  admin(): mongo.Admin {
    throw new Error("Method not implemented.");
  }

  collection<Schema extends z.ZodObject, Methods extends object>(
    init: CollectionInit<Schema, Methods>,
  ): MongoCollection<Schema, Methods> {
    return new MongoCollection(this._db, init);
  }

  async command(
    command: mongo.BSON.Document,
    options?: mongo.RunCommandOptions & mongo.Abortable,
  ) {
    return this._db.command(command, options);
  }
}

export class MongoClient {
  private readonly _client!: mongo.MongoClient;

  constructor(uri: string, options?: mongo.MongoClientOptions) {
    Object.defineProperty(this, "_client", {
      writable: false,
      configurable: false,
      enumerable: false,
      value: new mongo.MongoClient(uri, {
        serverApi: {
          version: mongo.ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        ...options,
      }),
    });
  }

  db(name: string, options?: mongo.DbOptions) {
    return new MongoDataBase(this._client, name, options);
  }

  async connect(): Promise<MongoClient> {
    await this._client.connect();
    return this;
  }

  async close(): Promise<void> {
    return await this._client.close();
  }
}
