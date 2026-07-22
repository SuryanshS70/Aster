import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  DEFAULT_GEMINI_MODEL,
  geminiModelSchema,
  modelPreferenceSchema,
  type GeminiModel,
} from "../../contracts";
import { getServerEnv } from "../config/env.server";
import { getDatabase } from "../db/client.server";
import { user } from "../db/schema";
import { withApiErrorBoundary } from "../http/api-handler.server";
import { readJsonBody } from "../http/body.server";
import { ApiError, jsonResponse } from "../http/responses.server";

export interface ModelPreferenceStore {
  get(userId: string): Promise<GeminiModel | null>;
  update(userId: string, model: GeminiModel): Promise<GeminiModel | null>;
}

function approvedModelOrDefault(value: string): GeminiModel {
  const approved = geminiModelSchema.safeParse(value);
  return approved.success ? approved.data : DEFAULT_GEMINI_MODEL;
}

export function createModelPreferenceStore(
  database: PostgresJsDatabase = getDatabase(),
): ModelPreferenceStore {
  return {
    async get(userId) {
      const [row] = await database
        .select({ model: user.modelPreference })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return row ? approvedModelOrDefault(row.model) : null;
    },

    async update(userId, model) {
      const [row] = await database
        .update(user)
        .set({ modelPreference: model })
        .where(eq(user.id, userId))
        .returning({ model: user.modelPreference });
      return row ? approvedModelOrDefault(row.model) : null;
    },
  };
}

type ResolveUserId = (request: Request) => Promise<string | null>;

async function resolveVerifiedUserId(request: Request): Promise<string | null> {
  const { auth } = await import("../auth/auth.server");
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

async function requireUserId(request: Request, resolveUserId: ResolveUserId): Promise<string> {
  const userId = await resolveUserId(request);
  if (!userId) throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  return userId;
}

export function createModelPreferenceApi({
  store,
  resolveUserId = resolveVerifiedUserId,
  bodyLimitBytes = getServerEnv().REQUEST_BODY_LIMIT_BYTES,
}: {
  store: ModelPreferenceStore;
  resolveUserId?: ResolveUserId;
  bodyLimitBytes?: number;
}) {
  return {
    handle(request: Request, requestId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);

        if (request.method === "GET") {
          const model = await store.get(userId);
          if (!model) throw new ApiError(404, "NOT_FOUND", "User not found");
          return jsonResponse({ model });
        }

        if (request.method === "PATCH") {
          const parsed = modelPreferenceSchema.safeParse(
            await readJsonBody(request, bodyLimitBytes),
          );
          if (!parsed.success) {
            throw new ApiError(
              400,
              "BAD_REQUEST",
              parsed.error.issues[0]?.message ?? "Model preference is invalid",
            );
          }

          const model = await store.update(userId, parsed.data.model);
          if (!model) throw new ApiError(404, "NOT_FOUND", "User not found");
          return jsonResponse({ model });
        }

        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },
  };
}

let productionStore: ModelPreferenceStore | undefined;
let productionApi: ReturnType<typeof createModelPreferenceApi> | undefined;

function getProductionStore(): ModelPreferenceStore {
  productionStore ??= createModelPreferenceStore();
  return productionStore;
}

export async function getUserModelPreference(userId: string): Promise<GeminiModel> {
  return (await getProductionStore().get(userId)) ?? DEFAULT_GEMINI_MODEL;
}

export function handleModelPreferenceRequest(request: Request, requestId: string) {
  productionApi ??= createModelPreferenceApi({ store: getProductionStore() });
  return productionApi.handle(request, requestId);
}
