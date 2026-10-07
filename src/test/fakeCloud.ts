// In-memory stand-in for the parts of the Supabase PostgREST client that sync
// uses: from().select().gt().order().range(), from().upsert(), from().update().in().
// Mirrors the server's behaviour that matters: server-stamped updated_at,
// merge-on-upsert, and the workout_sets → workouts foreign key.

type Row = Record<string, unknown>;

export class FakeCloud {
  tables = new Map<string, Map<string, Row>>();
  private tick = 0;

  now(): string {
    return new Date(Date.UTC(2030, 0, 1) + ++this.tick * 1000).toISOString();
  }

  table(name: string): Map<string, Row> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  rows(name: string): Row[] {
    return [...this.table(name).values()];
  }

  /** Simulates another device writing directly to the cloud. */
  write(name: string, key: string, patch: Row) {
    const t = this.table(name);
    t.set(key, { ...t.get(key), ...patch, updated_at: this.now() });
  }

  from(name: string) {
    return new FakeQuery(this, name);
  }
}

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  private filters: ((r: Row) => boolean)[] = [];
  private orderBy: string | null = null;
  private span: [number, number] = [0, Number.MAX_SAFE_INTEGER];
  private patch: Row | null = null;

  constructor(
    private cloud: FakeCloud,
    private name: string,
  ) {}

  select() {
    return this;
  }
  gt(col: string, v: unknown) {
    this.filters.push((r) => (r[col] as string) > (v as string));
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }
  order(col: string) {
    this.orderBy = col;
    return this;
  }
  range(from: number, to: number) {
    this.span = [from, to];
    return this;
  }
  update(patch: Row) {
    this.patch = patch;
    return this;
  }

  upsert(rows: Row | Row[], { onConflict }: { onConflict: string }) {
    const t = this.cloud.table(this.name);
    for (const row of Array.isArray(rows) ? rows : [rows]) {
      if (this.name === 'workout_sets' && !this.cloud.table('workouts').has(row.workout_id as string)) {
        return Promise.resolve({ data: null, error: { message: `FK: workout ${String(row.workout_id)} missing` } });
      }
      const key = row[onConflict] as string;
      t.set(key, { ...t.get(key), ...row, updated_at: this.cloud.now() });
    }
    return Promise.resolve({ data: null, error: null });
  }

  then<A = { data: Row[] | null; error: { message: string } | null }, B = never>(
    onFulfilled?: ((value: { data: Row[] | null; error: { message: string } | null }) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    const t = this.cloud.table(this.name);
    let result: { data: Row[] | null; error: { message: string } | null };
    if (this.patch) {
      for (const [k, r] of t) if (this.filters.every((f) => f(r))) t.set(k, { ...r, ...this.patch, updated_at: this.cloud.now() });
      result = { data: null, error: null };
    } else {
      let rows = [...t.values()].filter((r) => this.filters.every((f) => f(r)));
      if (this.orderBy) rows = rows.sort((a, b) => String(a[this.orderBy!]).localeCompare(String(b[this.orderBy!])));
      result = { data: rows.slice(this.span[0], this.span[1] + 1), error: null };
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}
