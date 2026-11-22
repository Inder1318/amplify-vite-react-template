import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Complaint: a
    .model({
      title: a.string().required(),
      category: a.string().required(),
      location: a.string().required(),
      description: a.string().required(),
      status: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read"]),
      allow.group("Admins"),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});