import assert from "node:assert";
import mongo from "mongodb";

export function EJSONCompatible(item: unknown): boolean {
	if (["function", "undefined", "symbol"].includes(typeof item)) return false;

	if (typeof item !== "object" || item === null) return true;

	if (
		item instanceof mongo.ObjectId ||
		item instanceof Date ||
		item instanceof RegExp ||
		item instanceof Uint8Array ||
		Buffer.isBuffer(item)
	) {
		return true;
	}

	return false;
}

export function encode(item: unknown): any {
	if (EJSONCompatible(item)) {
		const serialized = mongo.BSON.EJSON.stringify(item);
		return mongo.BSON.EJSON.parse(serialized);
	}

	if (Array.isArray(item)) {
		return item.map(encode);
	}

	if (item instanceof Set) {
		const encoded = Array.from(item).map(encode);
		return { _JSSet: encoded };
	}

	if (item instanceof Map) {
		const encoded = Array.from(item).map(encode);
		return { _JSMap: encoded };
	}

	assert(
		typeof item === "object" && item !== null,
		"Item in `encode` should be an object to iterate over entries",
	);
	const entries: Array<[string, unknown]> = [];
	for (const [key, value] of Object.entries(item)) {
		entries.push([key, encode(value)]);
	}
	const result = Object.fromEntries(entries);
	return result;
}

export function decode(item: unknown): any {
	if (EJSONCompatible(item)) {
		return item;
	}

	if (Array.isArray(item)) {
		return item.map(decode);
	}

	assert(
		typeof item === "object" && item !== null,
		"Item in `encode` should be an object to iterate over entries",
	);
	const entries: Array<[string, unknown]> = [];
	for (const [key, value] of Object.entries(item)) {
		if (key === "_JSSet") {
			assert(Array.isArray(value));
			return new Set(value.map(decode));
		} else if (key === "_JSMap") {
			assert(Array.isArray(value));
			return new Map(value.map(decode));
		}

		if (EJSONCompatible(value)) {
			entries.push([key, value]);
			continue;
		}

		entries.push([key, decode(value)]);
	}

	return Object.fromEntries(entries);
}

export function RecordLike(item: unknown): item is Record<string, any> {
	return typeof item === "object" && item !== null && !Array.isArray(item);
}

export const equal = (a: unknown, b: unknown): boolean => {
	try {
		assert.deepStrictEqual(a, b);
		return true;
	} catch {
		return false;
	}
};