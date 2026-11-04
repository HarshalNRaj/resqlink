import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient, type Db, type Document } from 'mongodb';

const dnsServers = dns.getServers();
if (
  process.env.VERCEL !== '1' &&
  dnsServers.length > 0 &&
  dnsServers.every((server) => server === '127.0.0.1' || server === '::1')
) {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

type BoundValue = unknown;

const collectionNamePattern = /^[a-z][a-z0-9_]*$/i;

function stripMongoId<T extends Document>(document: T): Omit<T, '_id'> {
  const { _id: _mongoId, ...row } = document;
  return row;
}

function splitSqlList(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const character = value[i];
    if (quote) {
      if (character === quote && value[i - 1] !== '\\') quote = null;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function bindValue(token: string, args: BoundValue[], cursor: { value: number }): unknown {
  const value = token.trim();
  if (value === '?') return args[cursor.value++];
  if (value.startsWith('@')) {
    const named = args[0] as Record<string, unknown> | undefined;
    return named?.[value.slice(1)];
  }
  if (/^null$/i.test(value)) return null;
  if (/^[-+]?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  if (/^".*"$/.test(value)) return value.slice(1, -1);
  return value;
}

function makeMatcher(where: string | undefined, args: BoundValue[]): (row: Document) => boolean {
  const normalizedWhere = where?.replace(/\b1\s*=\s*1\s*(?:AND\s*)?/gi, '').trim();
  if (!normalizedWhere) return () => true;
  const cursor = { value: 0 };
  const conditions = splitSqlList(normalizedWhere.replace(/\s+AND\s+/gi, ','));
  const predicates = conditions.map((condition) => {
    const match = condition.match(/^\s*([a-z_][\w]*)\s*(=|!=|<>|>=|<=|>|<|IS NOT NULL|IS NULL|LIKE)\s*(.*?)\s*$/i);
    if (!match) throw new Error(`Unsupported database filter: ${condition}`);
    const [, field, rawOperator, rawValue] = match;
    const operator = rawOperator.toUpperCase();
    const expected = operator === 'IS NULL' || operator === 'IS NOT NULL'
      ? undefined
      : bindValue(rawValue, args, cursor);
    return (row: Document) => {
      const actual = row[field];
      switch (operator) {
        case '=': return actual === expected;
        case '!=':
        case '<>': return actual !== expected;
        case '>': return (actual as any) > expected!;
        case '<': return (actual as any) < expected!;
        case '>=': return (actual as any) >= expected!;
        case '<=': return (actual as any) <= expected!;
        case 'IS NULL': return actual == null;
        case 'IS NOT NULL': return actual != null;
        case 'LIKE': return new RegExp(`^${String(expected).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i').test(String(actual ?? ''));
        default: return false;
      }
    };
  });
  return (row) => predicates.every((predicate) => predicate(row));
}

function projectRow(row: Document, columns: string): Document {
  if (columns.trim() === '*') return stripMongoId(row) as Document;
  const projected: Document = {};
  for (const expression of splitSqlList(columns)) {
    const aliasMatch = expression.match(/^([a-z_][\w]*)(?:\s+as\s+([a-z_][\w]*))?$/i);
    if (!aliasMatch) throw new Error(`Unsupported selected field: ${expression}`);
    const [, field, alias] = aliasMatch;
    if (field in row) projected[alias || field] = row[field];
  }
  return projected;
}

function parseInsertValues(valuesSql: string, args: BoundValue[]): unknown[] {
  const cursor = { value: 0 };
  return splitSqlList(valuesSql).map((token) => bindValue(token, args, cursor));
}

export class MongoStore {
  private client: MongoClient | null = null;
  private database: Db | null = null;

  async connect(): Promise<void> {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new Error('MONGODB_URI is required. Add your MongoDB connection string to .env before starting the server.');
    }
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    try {
      await this.client.connect();
      this.database = this.client.db(process.env.MONGODB_DB_NAME?.trim() || 'giveconnect');
      await this.database.command({ ping: 1 });
      await this.createIndexes();
      await this.migrateSqliteFile();
    } catch (error) {
      await this.client.close().catch(() => undefined);
      this.client = null;
      this.database = null;
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB connection or SQLite import failed. Verify MONGODB_URI, network access, and the source database: ${details}`);
    }
  }

  async close(): Promise<void> {
    await this.client?.close();
  }

  private getDb(): Db {
    if (!this.database) throw new Error('MongoDB is not connected.');
    return this.database;
  }

  private async createIndexes(): Promise<void> {
    await this.getDb().collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
  }

  private async migrateSqliteFile(): Promise<void> {
    const sqlitePath = path.resolve(process.cwd(), 'data', 'giveconnect.db');
    if (!fs.existsSync(sqlitePath)) return;

    const migrations = this.getDb().collection<any>('_migration_metadata');
    const migrationId = 'sqlite-giveconnect-v1';
    if (await migrations.findOne({ _id: migrationId })) return;

    const { default: Database } = await import('better-sqlite3');
    const source = new Database(sqlitePath, { readonly: true, fileMustExist: true });
    try {
      const tables = source.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
      ).all() as Array<{ name: string }>;

      let migratedRowCount = 0;
      for (const { name } of tables) {
        if (!collectionNamePattern.test(name)) continue;
        const rows = source.prepare(`SELECT * FROM "${name.replace(/"/g, '""')}"`).all() as Array<Record<string, unknown>>;
        if (!rows.length) continue;
        migratedRowCount += rows.length;

        const collection = this.getDb().collection<any>(name);
        const writes = rows.map((row) => {
          const identity = row.id == null
            ? createHash('sha256').update(JSON.stringify(row)).digest('hex')
            : String(row.id);
          const { _id: ignoredId, ...fields } = row as Record<string, unknown> & { _id?: unknown };
          return {
            updateOne: {
              filter: { _id: identity },
              update: { $setOnInsert: { ...fields, _id: identity } },
              upsert: true,
            },
          };
        });
        for (let index = 0; index < writes.length; index += 500) {
          await collection.bulkWrite(writes.slice(index, index + 500), { ordered: true });
        }
      }
      await migrations.insertOne({
        _id: migrationId,
        source: 'data/giveconnect.db',
        tableCount: tables.length,
        migratedRowCount,
        completedAt: new Date().toISOString(),
      });
    } finally {
      source.close();
    }
  }

  prepare(sql: string) {
    return {
      all: (...args: BoundValue[]) => this.executeSelect(sql, args),
      get: async (...args: BoundValue[]) => (await this.executeSelect(sql, args))[0],
      run: (...args: BoundValue[]) => this.executeMutation(sql, args),
    };
  }

  private async executeSelect(sql: string, args: BoundValue[]): Promise<Document[]> {
    const match = sql.trim().match(/^SELECT\s+(.+?)\s+FROM\s+([a-z_][\w]*)([\s\S]*)$/i);
    if (!match) throw new Error('Only collection reads are supported.');
    const [, columns, collectionName, tail] = match;
    const collection = this.getDb().collection<any>(collectionName);
    const where = tail.match(/\bWHERE\s+([\s\S]*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)/i)?.[1]?.trim();
    const orderBy = tail.match(/\bORDER\s+BY\s+([\s\S]*?)(?=\bLIMIT\b|$)/i)?.[1]?.trim();
    const limit = Number(tail.match(/\bLIMIT\s+(\d+)/i)?.[1] || 0);

    if (/^COUNT\s*\(\s*\*\s*\)/i.test(columns.trim())) {
      const alias = columns.match(/\bAS\s+([a-z_][\w]*)/i)?.[1] || 'count';
      return [{ [alias]: await collection.countDocuments() }];
    }

    let rows = (await collection.find().toArray()).map((row) => stripMongoId(row) as Document);
    const matcher = makeMatcher(where, args);
    rows = rows.filter(matcher);
    if (orderBy) {
      const sortFields = splitSqlList(orderBy).map((part) => {
        const [field, direction] = part.split(/\s+/);
        return [field, /^DESC$/i.test(direction || '') ? -1 : 1] as const;
      });
      rows.sort((a, b) => {
        for (const [field, direction] of sortFields) {
          if (a[field] === b[field]) continue;
          if (a[field] == null) return -direction;
          if (b[field] == null) return direction;
          return (a[field] < b[field] ? -1 : 1) * direction;
        }
        return 0;
      });
    }
    if (limit) rows = rows.slice(0, limit);
    return rows.map((row) => projectRow(row, columns));
  }

  private async executeMutation(sql: string, args: BoundValue[]): Promise<{ changes: number }> {
    const statement = sql.trim();
    const insertMatch = statement.match(/^INSERT\s+(OR\s+REPLACE\s+)?INTO\s+([a-z_][\w]*)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*;?$/i);
    if (insertMatch) {
      const [, replace, collectionName, columnsSql, valuesSql] = insertMatch;
      const columns = splitSqlList(columnsSql);
      const values = parseInsertValues(valuesSql, args);
      const document = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
      if (document.created_at === undefined) document.created_at = new Date().toISOString();
      const collection = this.getDb().collection<any>(collectionName);
      const identity = document.id == null ? createHash('sha256').update(JSON.stringify(document)).digest('hex') : String(document.id);
      if (replace) {
        await collection.replaceOne({ _id: identity }, { ...document, _id: identity }, { upsert: true });
      } else {
        await collection.insertOne({ ...document, _id: identity });
      }
      return { changes: 1 };
    }

    const updateMatch = statement.match(/^UPDATE\s+([a-z_][\w]*)\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]+?)\s*;?$/i);
    if (updateMatch) {
      const [, collectionName, assignmentSql, where] = updateMatch;
      const collection = this.getDb().collection<any>(collectionName);
      const positionalAssignments = (assignmentSql.match(/\?/g) || []).length;
      const matcher = makeMatcher(where, args.slice(positionalAssignments));
      const rows = (await collection.find().toArray())
        .map((row) => stripMongoId(row) as Document)
        .filter(matcher);
      const assignments = splitSqlList(assignmentSql);
      const cursor = { value: 0 };
      for (const row of rows) {
        const updates: Document = {};
        for (const assignment of assignments) {
          const [field, rawValue] = assignment.split(/\s*=\s*(.+)/s).filter(Boolean);
          if (!field || rawValue === undefined) throw new Error(`Unsupported update assignment: ${assignment}`);
          const coalesce = rawValue.match(/^coalesce\(([^,]+),\s*([a-z_][\w]*)\)$/i);
          const value = coalesce
            ? bindValue(coalesce[1], args, cursor) ?? row[coalesce[2]]
            : bindValue(rawValue, args, cursor);
          updates[field.trim()] = value;
        }
        await collection.updateOne({ id: row.id }, { $set: updates });
      }
      return { changes: rows.length };
    }

    const deleteMatch = statement.match(/^DELETE\s+FROM\s+([a-z_][\w]*)\s+WHERE\s+([\s\S]+?)\s*;?$/i);
    if (deleteMatch) {
      const [, collectionName, where] = deleteMatch;
      const rows = (await this.getDb().collection(collectionName).find().toArray())
        .map((row) => stripMongoId(row) as Document)
        .filter(makeMatcher(where, args));
      if (rows.length) {
        await this.getDb().collection(collectionName).deleteMany({ id: { $in: rows.map((row) => row.id) } });
      }
      return { changes: rows.length };
    }

    throw new Error('Unsupported database operation.');
  }

  async collectionStats(): Promise<Record<string, number>> {
    const names = await this.getDb().listCollections({}, { nameOnly: true }).toArray();
    const counts = await Promise.all(names.map(async ({ name }) => [
      name,
      await this.getDb().collection(name).countDocuments(),
    ] as const));
    return Object.fromEntries(counts);
  }

  async readCollection(name: string): Promise<Document[]> {
    if (!collectionNamePattern.test(name)) throw new Error('Invalid collection name.');
    return (await this.getDb().collection(name).find().limit(100).toArray())
      .map((row) => stripMongoId(row) as Document);
  }
}
