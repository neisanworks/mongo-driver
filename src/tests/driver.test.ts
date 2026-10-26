import { MongoClient } from "@/mongo-driver/driver.js";
import { expect, test } from "bun:test";
import * as mongo from "mongodb";
import * as z from "zod/v4";

const client = new MongoClient("");
const db = client.db("");

const Users = db.collection({
  name: "users",
  schema: z.object({
    id: z.coerce
      .string()
      .regex(
        /^[0-9]{1,8}$/,
        "ID must be numerical value no more than eight digits",
      ),
    password: z.string(),
    location: z.array(z.number()).default([]),
  }),
  methods: {
    authenticate(password: string) {
      return this.password === password;
    },
  },
});

test("Insertion", async () => {
  for await (let user of Users.find()) {
  }

  const users = await Users.find.many({ id: "something" }, {})
});
