/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { getInitialMockData } from "./mock-data";

type Store = ReturnType<typeof getInitialMockData>;

const globalForMock = globalThis as unknown as { __mockStore: Store | undefined };

function getStore(): Store {
  if (!globalForMock.__mockStore) {
    globalForMock.__mockStore = getInitialMockData();
    console.log("[Mock Mode] In-memory database initialized with sample data");
  }
  return globalForMock.__mockStore;
}

// ---------------------------------------------------------------------------
// Where-clause matching
// ---------------------------------------------------------------------------

function matchValue(actual: any, condition: any): boolean {
  if (condition === undefined) return true;
  if (condition === null) return actual === null || actual === undefined;
  if (condition instanceof Date) return actual instanceof Date ? actual.getTime() === condition.getTime() : actual === condition;

  if (typeof condition === "object" && !Array.isArray(condition)) {
    if ("contains" in condition) {
      const s = String(actual ?? "");
      const t = String(condition.contains);
      return condition.mode === "insensitive" ? s.toLowerCase().includes(t.toLowerCase()) : s.includes(t);
    }
    if ("in" in condition) return (condition.in as any[]).includes(actual);
    if ("not" in condition) return !matchValue(actual, condition.not);
    if ("gte" in condition && !matchGte(actual, condition.gte)) return false;
    if ("lte" in condition && !matchLte(actual, condition.lte)) return false;
    if ("gt" in condition && !(actual > condition.gt)) return false;
    if ("lt" in condition && !(actual < condition.lt)) return false;
    if ("equals" in condition) return matchValue(actual, condition.equals);
    if ("increment" in condition) return true; // update op, not filter
    // Nested relation filter — handled at matchWhere level
  }

  return actual === condition;
}

function matchGte(a: any, b: any): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() >= b.getTime();
  return a >= b;
}
function matchLte(a: any, b: any): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() <= b.getTime();
  return a <= b;
}

const RELATION_MODELS: Record<string, Record<string, { collection: keyof Store; fk: string; type: "one" | "many" }>> = {
  user: {
    creatorProfile: { collection: "creatorProfiles", fk: "userId", type: "one" },
    brandProfile: { collection: "brandProfiles", fk: "userId", type: "one" },
  },
  creatorProfile: {
    user: { collection: "users", fk: "id", type: "one" },
  },
  brandProfile: {
    user: { collection: "users", fk: "id", type: "one" },
  },
  deal: {
    brand: { collection: "users", fk: "id", type: "one" },
    creator: { collection: "users", fk: "id", type: "one" },
    deliverables: { collection: "deliverables", fk: "dealId", type: "many" },
    chatMessages: { collection: "chatMessages", fk: "dealId", type: "many" },
    escrowTransactions: { collection: "escrowTransactions", fk: "dealId", type: "many" },
    assignedMediator: { collection: "users", fk: "id", type: "one" },
  },
  chatMessage: {
    sender: { collection: "users", fk: "id", type: "one" },
    deal: { collection: "deals", fk: "id", type: "one" },
  },
  deliverable: {
    deal: { collection: "deals", fk: "id", type: "one" },
  },
  escrowTransaction: {
    deal: { collection: "deals", fk: "id", type: "one" },
  },
  auditLog: {
    actor: { collection: "users", fk: "id", type: "one" },
  },
};

// FK field on the *source* item that points to the related record
const SOURCE_FK: Record<string, Record<string, string>> = {
  deal: { brand: "brandId", creator: "creatorId", assignedMediator: "assignedMediatorId" },
  chatMessage: { sender: "senderId", deal: "dealId" },
  deliverable: { deal: "dealId" },
  escrowTransaction: { deal: "dealId" },
  auditLog: { actor: "actorId" },
  creatorProfile: { user: "userId" },
  brandProfile: { user: "userId" },
};

function matchWhere(item: any, where: any, model: string): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.OR) return (where.OR as any[]).some((c) => matchWhere(item, c, model));
  if (where.AND) return (where.AND as any[]).every((c) => matchWhere(item, c, model));
  if (where.NOT) return !matchWhere(item, where.NOT, model);

  const s = getStore();

  for (const key of Object.keys(where)) {
    if (key === "OR" || key === "AND" || key === "NOT") continue;

    const rel = RELATION_MODELS[model]?.[key];
    if (rel) {
      // Nested relation filter
      const related = resolveOneRelation(item, key, model, s);
      if (!related) return false;
      const relModelName = collectionToModelName(rel.collection);
      if (!matchWhere(related, where[key], relModelName)) return false;
      continue;
    }

    // JSON path filter — skip (too complex for mock)
    if (typeof where[key] === "object" && where[key]?.path) continue;

    if (!matchValue(item[key], where[key])) return false;
  }
  return true;
}

function collectionToModelName(col: keyof Store): string {
  const map: Record<string, string> = {
    users: "user", creatorProfiles: "creatorProfile", brandProfiles: "brandProfile",
    deals: "deal", chatMessages: "chatMessage", deliverables: "deliverable",
    escrowTransactions: "escrowTransaction", auditLogs: "auditLog",
  };
  return map[col as string] ?? col as string;
}

// ---------------------------------------------------------------------------
// Relation resolution
// ---------------------------------------------------------------------------

function resolveOneRelation(item: any, relName: string, model: string, store: Store): any {
  const rel = RELATION_MODELS[model]?.[relName];
  if (!rel) return null;
  const col = store[rel.collection] as any[];

  if (rel.type === "many") {
    return col.filter((r: any) => r[rel.fk] === item.id);
  }

  // "one" relation — figure out the FK
  const srcFk = SOURCE_FK[model]?.[relName];
  if (srcFk) {
    const fkVal = item[srcFk];
    if (!fkVal) return null;
    return col.find((r: any) => r[rel.fk] === fkVal) ?? null;
  }
  // Reverse lookup (e.g., user → creatorProfile where creatorProfile.userId === user.id)
  return col.find((r: any) => r[rel.fk] === item.id) ?? null;
}

function resolveIncludes(item: any, args: any, model: string): any {
  if (!item) return item;
  const result = { ...item };
  const store = getStore();
  const includeMap = args?.include;
  const selectMap = args?.select;

  // Handle _count in include
  if (includeMap?._count) {
    const countSelect = includeMap._count === true ? {} : includeMap._count.select || {};
    const counts: Record<string, number> = {};
    const rels = RELATION_MODELS[model] || {};
    for (const relName of Object.keys(countSelect)) {
      if (rels[relName]?.type === "many") {
        const col = store[rels[relName].collection] as any[];
        counts[relName] = col.filter((r: any) => r[rels[relName].fk] === item.id).length;
      }
    }
    result._count = counts;
  }

  if (includeMap) {
    for (const relName of Object.keys(includeMap)) {
      if (relName === "_count") continue;
      const cfg = includeMap[relName];
      if (!cfg) continue;

      let related = resolveOneRelation(item, relName, model, store);
      const relModel = RELATION_MODELS[model]?.[relName];
      const relModelName = relModel ? collectionToModelName(relModel.collection) : relName;

      if (Array.isArray(related) && typeof cfg === "object" && cfg !== true) {
        if (cfg.orderBy) related = applySortArray(related, cfg.orderBy);
        if (cfg.take) related = related.slice(0, cfg.take);
        if (cfg.where) related = related.filter((r: any) => matchWhere(r, cfg.where, relModelName));
      }

      if (typeof cfg === "object" && cfg !== true) {
        if (cfg.include || cfg.select) {
          if (Array.isArray(related)) {
            related = related.map((r: any) => resolveIncludes(r, cfg, relModelName));
            related = related.map((r: any) => applySelect(r, cfg, relModelName));
          } else if (related) {
            related = resolveIncludes(related, cfg, relModelName);
            related = applySelect(related, cfg, relModelName);
          }
        }
      }

      result[relName] = related;
    }
  }

  if (selectMap) {
    return applySelectToItem(result, selectMap, model);
  }

  return result;
}

function applySelect(item: any, args: any, model: string): any {
  if (!item || !args?.select) return item;
  return applySelectToItem(item, args.select, model);
}

function applySelectToItem(item: any, selectMap: Record<string, any>, model: string): any {
  if (!item) return item;
  const result: any = {};
  const store = getStore();

  for (const key of Object.keys(selectMap)) {
    if (!selectMap[key]) continue;

    if (key === "_count") {
      const countCfg = selectMap[key];
      const countSelect = countCfg === true ? {} : countCfg.select || {};
      const counts: Record<string, number> = {};
      const rels = RELATION_MODELS[model] || {};
      for (const relName of Object.keys(countSelect)) {
        if (rels[relName]?.type === "many") {
          const col = store[rels[relName].collection] as any[];
          counts[relName] = col.filter((r: any) => r[rels[relName].fk] === item.id).length;
        }
      }
      result._count = counts;
      continue;
    }

    const rel = RELATION_MODELS[model]?.[key];
    if (rel) {
      let related = item[key] !== undefined ? item[key] : resolveOneRelation(item, key, model, store);
      if (typeof selectMap[key] === "object" && selectMap[key] !== true) {
        if (Array.isArray(related)) {
          related = related.map((r: any) => {
            let res = resolveIncludes(r, selectMap[key], collectionToModelName(rel.collection));
            res = applySelect(res, selectMap[key], collectionToModelName(rel.collection));
            return res;
          });
        } else if (related) {
          related = resolveIncludes(related, selectMap[key], collectionToModelName(rel.collection));
          related = applySelect(related, selectMap[key], collectionToModelName(rel.collection));
        }
      }
      result[key] = related ?? null;
    } else {
      result[key] = item[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function applySortArray(items: any[], orderBy: any): any[] {
  if (!orderBy) return items;
  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...items];
  sorted.sort((a, b) => {
    for (const entry of entries) {
      for (const key of Object.keys(entry)) {
        const dir = entry[key] === "desc" ? -1 : 1;
        const av = a[key], bv = b[key];
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
    }
    return 0;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Data mutation helpers
// ---------------------------------------------------------------------------

function applyDataUpdate(existing: any, data: any): any {
  const updated = { ...existing };
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val && typeof val === "object" && "increment" in val) {
      updated[key] = (Number(updated[key]) || 0) + Number(val.increment);
    } else if (val && typeof val === "object" && "decrement" in val) {
      updated[key] = (Number(updated[key]) || 0) - Number(val.decrement);
    } else {
      updated[key] = val;
    }
  }
  updated.updatedAt = new Date();
  return updated;
}

// ---------------------------------------------------------------------------
// Model-name ↔ collection mapping
// ---------------------------------------------------------------------------

const MODEL_COLLECTION: Record<string, keyof Store> = {
  user: "users",
  creatorProfile: "creatorProfiles",
  brandProfile: "brandProfiles",
  deal: "deals",
  chatMessage: "chatMessages",
  deliverable: "deliverables",
  escrowTransaction: "escrowTransactions",
  auditLog: "auditLogs",
};

// ---------------------------------------------------------------------------
// Generic model handler
// ---------------------------------------------------------------------------

function createModel(modelName: string) {
  const colName = MODEL_COLLECTION[modelName];

  const getCol = (): any[] => {
    const s = getStore();
    return s[colName] as any[];
  };
  const setCol = (arr: any[]) => {
    const s = getStore();
    (s as any)[colName] = arr;
  };

  return {
    async findUnique(args: any) {
      const col = getCol();
      const where = args?.where;
      if (!where) return null;
      const found = col.find((item) => matchWhere(item, where, modelName)) ?? null;
      return found ? resolveIncludes(found, args, modelName) : null;
    },

    async findFirst(args: any) {
      let col = getCol();
      if (args?.where) col = col.filter((item) => matchWhere(item, args.where, modelName));
      if (args?.orderBy) col = applySortArray(col, args.orderBy);
      const found = col[0] ?? null;
      return found ? resolveIncludes(found, args, modelName) : null;
    },

    async findMany(args: any) {
      let col = getCol();
      if (args?.where) col = col.filter((item) => matchWhere(item, args.where, modelName));
      if (args?.orderBy) col = applySortArray(col, args.orderBy);
      if (args?.skip) col = col.slice(args.skip);
      if (args?.take) col = col.slice(0, args.take);
      return col.map((item) => resolveIncludes(item, args, modelName));
    },

    async create(args: any) {
      const data = { ...args.data };
      if (!data.id) data.id = crypto.randomUUID();
      if (!data.createdAt) data.createdAt = new Date();
      if (!data.updatedAt) data.updatedAt = new Date();

      // Handle nested creates (e.g., creatorProfile: { create: {...} })
      for (const key of Object.keys(data)) {
        if (data[key] && typeof data[key] === "object" && data[key].create) {
          const nestedData = { ...data[key].create };
          const rel = RELATION_MODELS[modelName]?.[key];
          if (rel) {
            const nestedCol = MODEL_COLLECTION[collectionToModelName(rel.collection)];
            if (nestedCol) {
              if (!nestedData.id) nestedData.id = crypto.randomUUID();
              // Link FK
              const srcFk = SOURCE_FK[collectionToModelName(rel.collection)]?.[modelName];
              if (srcFk) nestedData[srcFk] = data.id;
              else if (rel.fk === "userId") nestedData.userId = data.id;
              if (!nestedData.createdAt) nestedData.createdAt = new Date();
              if (!nestedData.updatedAt) nestedData.updatedAt = new Date();
              (getStore() as any)[nestedCol].push(nestedData);
            }
          }
          delete data[key];
        }
      }

      const col = getCol();
      col.push(data);
      setCol(col);
      return resolveIncludes(data, args, modelName);
    },

    async createMany(args: any) {
      const col = getCol();
      const items = (args.data as any[]).map((d) => ({
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d,
      }));
      col.push(...items);
      setCol(col);
      return { count: items.length };
    },

    async update(args: any) {
      const col = getCol();
      const idx = col.findIndex((item) => matchWhere(item, args.where, modelName));
      if (idx === -1) throw new Error(`[Mock] ${modelName}.update: record not found`);
      col[idx] = applyDataUpdate(col[idx], args.data);
      return resolveIncludes(col[idx], args, modelName);
    },

    async updateMany(args: any) {
      const col = getCol();
      let count = 0;
      for (let i = 0; i < col.length; i++) {
        if (matchWhere(col[i], args.where, modelName)) {
          col[i] = applyDataUpdate(col[i], args.data);
          count++;
        }
      }
      return { count };
    },

    async upsert(args: any) {
      const col = getCol();
      const idx = col.findIndex((item) => matchWhere(item, args.where, modelName));
      if (idx >= 0) {
        col[idx] = applyDataUpdate(col[idx], args.update);
        return resolveIncludes(col[idx], args, modelName);
      }
      const data = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...args.create };
      col.push(data);
      return resolveIncludes(data, args, modelName);
    },

    async delete(args: any) {
      const col = getCol();
      const idx = col.findIndex((item) => matchWhere(item, args.where, modelName));
      if (idx === -1) throw new Error(`[Mock] ${modelName}.delete: record not found`);
      const [removed] = col.splice(idx, 1);
      return removed;
    },

    async count(args?: any) {
      const col = getCol();
      if (!args?.where) return col.length;
      return col.filter((item) => matchWhere(item, args.where, modelName)).length;
    },

    async aggregate(args?: any) {
      let col = getCol();
      if (args?.where) col = col.filter((item) => matchWhere(item, args.where, modelName));

      const result: any = {};

      if (args?._count !== undefined) {
        result._count = args._count === true ? col.length : col.length;
      }
      if (args?._sum) {
        result._sum = {};
        for (const field of Object.keys(args._sum)) {
          if (args._sum[field]) {
            result._sum[field] = col.reduce((acc: number, item: any) => acc + (Number(item[field]) || 0), 0) || null;
          }
        }
      }
      if (args?._avg) {
        result._avg = {};
        for (const field of Object.keys(args._avg)) {
          if (args._avg[field] && col.length > 0) {
            result._avg[field] = col.reduce((acc: number, item: any) => acc + (Number(item[field]) || 0), 0) / col.length;
          } else {
            result._avg[field] = null;
          }
        }
      }
      if (args?._min) {
        result._min = {};
        for (const field of Object.keys(args._min)) {
          result._min[field] = col.length > 0 ? Math.min(...col.map((i: any) => Number(i[field]) || 0)) : null;
        }
      }
      if (args?._max) {
        result._max = {};
        for (const field of Object.keys(args._max)) {
          result._max[field] = col.length > 0 ? Math.max(...col.map((i: any) => Number(i[field]) || 0)) : null;
        }
      }

      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Exported factory
// ---------------------------------------------------------------------------

export function createMockPrisma(): any {
  const models: Record<string, ReturnType<typeof createModel>> = {};
  for (const name of Object.keys(MODEL_COLLECTION)) {
    models[name] = createModel(name);
  }

  const client = {
    ...models,

    async $transaction(arg: any) {
      if (typeof arg === "function") return arg(client);
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    },

    async $disconnect() { /* noop */ },
    async $connect() { /* noop */ },
  };

  return client;
}
