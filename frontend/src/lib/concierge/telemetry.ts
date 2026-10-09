import { Langfuse } from 'langfuse';

let client: Langfuse | null | undefined;

/** Langfuse is optional: it is on only when both keys are set. */
export function langfuse(): Langfuse | null {
  if (client === undefined) {
    const { LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASEURL } =
      process.env;
    client =
      LANGFUSE_PUBLIC_KEY && LANGFUSE_SECRET_KEY
        ? new Langfuse({
            publicKey: LANGFUSE_PUBLIC_KEY,
            secretKey: LANGFUSE_SECRET_KEY,
            baseUrl: LANGFUSE_BASEURL,
          })
        : null;
  }
  return client;
}
