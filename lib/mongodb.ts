import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not defined.");
}
const mongoUri: string = uri;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Uma única promessa de cliente por instância (dev HMR + lambdas Vercel).
 * Evita múltiplos `MongoClient` e timeouts intermitentes em produção.
 */
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(mongoUri, {});
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

const clientPromise = getClientPromise();

export default clientPromise;
