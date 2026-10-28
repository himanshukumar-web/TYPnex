import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  inMemoryStore?: InMemoryDbStore;
};

// =========================================================================
// Resilient In-Memory Fallback Store (For offline development & CI testing)
// =========================================================================
class InMemoryDbStore {
  private tables: Map<string, Map<string, Record<string, any>>> = new Map();

  constructor() {
    this.getTable("systemSettings").set("global", {
      id: "global",
      dailyChatLimit: 100,
      dailyFileLimit: 20,
      maxFileSizeMB: 20,
      allowedExtensions: "png,jpg,jpeg,gif,webp,svg,pdf,doc,docx,txt,csv,xlsx,ppt,pptx,zip,rar,mp3,wav,ogg,m4a",
      disallowedExtensions: "mp4,mov,avi,mkv,webm,3gp,flv,wmv",
      adGateEnabled: true,
      adGateDurationSec: 5,
      interstitialIntervalHours: 12,
      maintenanceMode: false,
      updatedAt: new Date(),
    });
  }

  private getTable(modelName: string): Map<string, Record<string, any>> {
    const key = modelName.toLowerCase();
    if (!this.tables.has(key)) {
      this.tables.set(key, new Map());
    }
    return this.tables.get(key)!;
  }

  private enrichItem(model: string, item: any, include?: Record<string, any>) {
    if (!item) return null;
    const copy = { ...item };
    if (!include) return copy;

    const mKey = model.toLowerCase();
    if (mKey === "user") {
      if (include.profile) {
        const profTable = this.getTable("profile");
        copy.profile = Array.from(profTable.values()).find((p) => p.userId === item.id) || item.profile || null;
      }
      if (include.employeeRecord) {
        const empTable = this.getTable("employee");
        copy.employeeRecord = Array.from(empTable.values()).find((e) => e.userId === item.id) || item.employeeRecord || null;
      }
      if (include.blockedRecord) {
        const blkTable = this.getTable("blockeduser");
        copy.blockedRecord = Array.from(blkTable.values()).find((b) => b.userId === item.id) || item.blockedRecord || null;
      }
    } else if (mKey === "conversation") {
      if (include.messages) {
        const msgTable = this.getTable("message");
        let msgs = Array.from(msgTable.values()).filter((m) => m.conversationId === item.id);
        if (include.messages.orderBy?.createdAt === "desc") {
          msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        if (include.messages.take) {
          msgs = msgs.slice(0, include.messages.take);
        }
        copy.messages = msgs;
      }
    }
    return copy;
  }

  create(model: string, args: { data: Record<string, any> }) {
    const table = this.getTable(model);
    const id = args.data.id || uuidv4();
    const item = {
      ...args.data,
      id,
      createdAt: args.data.createdAt || new Date(),
      updatedAt: new Date(),
    };
    table.set(id, item);

    // Handle nested relation creation in in-memory store
    const mKey = model.toLowerCase();
    if (mKey === "user") {
      if (args.data.profile?.create) {
        const pTable = this.getTable("profile");
        const pId = uuidv4();
        pTable.set(pId, {
          id: pId,
          userId: id,
          ...args.data.profile.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      if (args.data.employeeRecord?.create) {
        const eTable = this.getTable("employee");
        const eId = uuidv4();
        eTable.set(eId, {
          id: eId,
          userId: id,
          ...args.data.employeeRecord.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else if (mKey === "conversation") {
      if (args.data.messages?.create && Array.isArray(args.data.messages.create)) {
        const msgTable = this.getTable("message");
        for (const m of args.data.messages.create) {
          const msgId = uuidv4();
          msgTable.set(msgId, {
            id: msgId,
            conversationId: id,
            ...m,
            createdAt: m.createdAt || new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return item;
  }

  findUnique(model: string, args: { where: Record<string, any>; include?: Record<string, any> }) {
    const table = this.getTable(model);
    const where = args.where;
    let found: any = null;

    if (where.id && table.has(where.id)) {
      found = table.get(where.id);
    } else if (where.userId_dateKey) {
      const { userId, dateKey } = where.userId_dateKey;
      for (const item of table.values()) {
        if (item.userId === userId && item.dateKey === dateKey) {
          found = item;
          break;
        }
      }
    } else {
      for (const item of table.values()) {
        const match = Object.entries(where).every(([k, v]) => item[k] === v);
        if (match) {
          found = item;
          break;
        }
      }
    }

    return this.enrichItem(model, found, args.include);
  }

  findFirst(model: string, args?: { where?: Record<string, any>; include?: Record<string, any> }) {
    const table = this.getTable(model);
    if (!args?.where) {
      const first = table.values().next();
      return this.enrichItem(model, first.done ? null : first.value, args?.include);
    }
    const where = args.where;
    for (const item of table.values()) {
      const match = Object.entries(where).every(([k, v]) => item[k] === v);
      if (match) {
        return this.enrichItem(model, item, args.include);
      }
    }
    return null;
  }

  findMany(model: string, args?: { where?: Record<string, any>; take?: number; orderBy?: any; include?: Record<string, any> }) {
    const table = this.getTable(model);
    let items = Array.from(table.values());
    if (args?.where) {
      const where = args.where;
      items = items.filter((item) => {
        return Object.entries(where).every(([k, v]) => {
          if (v && typeof v === "object" && "in" in v) {
            return (v as any).in.includes(item[k]);
          }
          return item[k] === v;
        });
      });
    }

    if (args?.orderBy) {
      const orderBys = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      items.sort((a, b) => {
        for (const order of orderBys) {
          for (const [key, dir] of Object.entries(order)) {
            const valA = a[key] instanceof Date ? a[key].getTime() : a[key];
            const valB = b[key] instanceof Date ? b[key].getTime() : b[key];
            if (valA < valB) return dir === "asc" ? -1 : 1;
            if (valA > valB) return dir === "asc" ? 1 : -1;
          }
        }
        return 0;
      });
    }

    if (args?.take) {
      items = items.slice(0, args.take);
    }
    return items.map((it) => this.enrichItem(model, it, args?.include));
  }

  update(model: string, args: { where: Record<string, any>; data: Record<string, any> }) {
    const table = this.getTable(model);
    let target = this.findUnique(model, { where: args.where });
    const targetId = target?.id || args.where.id || uuidv4();
    if (!target) {
      target = { id: targetId, ...(args.where.userId_dateKey || args.where) };
    }
    const updated = { ...target };
    for (const [k, v] of Object.entries(args.data)) {
      if (v && typeof v === "object" && "increment" in v) {
        updated[k] = (Number(updated[k]) || 0) + Number(v.increment);
      } else {
        updated[k] = v;
      }
    }
    updated.updatedAt = new Date();
    table.set(targetId, updated);
    return updated;
  }

  upsert(model: string, args: { where: Record<string, any>; update: Record<string, any>; create: Record<string, any> }) {
    const existing = this.findUnique(model, { where: args.where });
    if (existing) {
      return this.update(model, { where: args.where, data: args.update });
    }
    return this.create(model, { data: args.create });
  }

  updateMany(model: string, args: { where: Record<string, any>; data: Record<string, any> }) {
    const table = this.getTable(model);
    let count = 0;
    for (const [id, item] of table.entries()) {
      const match = Object.entries(args.where).every(([k, v]) => item[k] === v);
      if (match) {
        table.set(id, { ...item, ...args.data, updatedAt: new Date() });
        count++;
      }
    }
    return { count };
  }

  delete(model: string, args: { where: Record<string, any> }) {
    const table = this.getTable(model);
    const target = this.findUnique(model, { where: args.where });
    if (target) {
      table.delete(target.id);
    }
    return target;
  }

  deleteMany(model: string, args?: { where?: Record<string, any> }) {
    const table = this.getTable(model);
    if (!args?.where) {
      const count = table.size;
      table.clear();
      return { count };
    }
    let count = 0;
    for (const [id, item] of table.entries()) {
      const match = Object.entries(args.where).every(([k, v]) => item[k] === v);
      if (match) {
        table.delete(id);
        count++;
      }
    }
    return { count };
  }

  count(model: string, args?: { where?: Record<string, any> }) {
    return this.findMany(model, args).length;
  }
}

const inMemoryStore = globalForPrisma.inMemoryStore ?? new InMemoryDbStore();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.inMemoryStore = inMemoryStore;
}

function createResilientPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    "postgresql://postgres:postgres@localhost:5432/typnex?schema=public";

  const isCloudOrSsl =
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("pooler.supabase.com");

  const pool = new Pool({
    connectionString,
    ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  const adapter = new PrismaPg(pool);

  const rawPrisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Track if PostgreSQL connection is available
  let isOfflineMode = false;

  // Resilient proxy to catch ECONNREFUSED and gracefully use in-memory store in dev/test
  return new Proxy(rawPrisma, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);

      // Model access (e.g. prisma.user, prisma.conversation)
      if (typeof prop === "string" && prop in target && typeof orig === "object" && orig !== null) {
        const modelName = prop;
        return new Proxy(orig, {
          get(mTarget, actionProp) {
            const mOrig = Reflect.get(mTarget, actionProp);
            if (typeof mOrig === "function") {
              return async (...args: any[]) => {
                if (isOfflineMode) {
                  const fallbackFn = (inMemoryStore as any)[actionProp];
                  if (typeof fallbackFn === "function") {
                    return fallbackFn.call(inMemoryStore, modelName, args[0]);
                  }
                }

                try {
                  return await mOrig.apply(mTarget, args);
                } catch (err: any) {
                  const isConnError =
                    err?.code === "ECONNREFUSED" ||
                    err?.message?.includes("ECONNREFUSED") ||
                    err?.message?.includes("ConnectionRefused") ||
                    err?.message?.includes("Can't reach database server");

                  if (isConnError) {
                    if (!isOfflineMode) {
                      console.warn(
                        `[TYPnex DB] Notice: Live PostgreSQL on localhost:5432 is not running. Activating in-memory mock store for offline test/dev.`
                      );
                      isOfflineMode = true;
                    }

                    const fallbackFn = (inMemoryStore as any)[actionProp];
                    if (typeof fallbackFn === "function") {
                      return fallbackFn.call(inMemoryStore, modelName, args[0]);
                    }
                  }
                  throw err;
                }
              };
            }
            return mOrig;
          },
        });
      }

      return orig;
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createResilientPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
