import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export interface HotSearchItem {
  term: string;
  score: number;
  lastSearched: number;
  createdAt: number;
}

export interface HotSearchStats {
  total: number;
  topTerms: HotSearchItem[];
}

/**
 * SQLite 热搜服务 - 数据持久化存储
 * 使用 better-sqlite3 实现轻量级数据库
 */
export class HotSearchSQLiteService {
  private db: any = null;
  private readonly DB_DIR = './data';
  private readonly DB_PATH = './data/hot-searches.db';
  private readonly MAX_ENTRIES = 50;

  constructor() {
    this.initDatabase();
  }

  /**
   * 初始化数据库和表结构
   */
  private initDatabase(): void {
    try {
      // 动态导入 better-sqlite3
      const Database = require('better-sqlite3');

      // 确保数据目录存在
      if (!existsSync(this.DB_DIR)) {
        mkdirSync(this.DB_DIR, { recursive: true });
      }

      // 打开数据库（自动创建）
      this.db = new Database(this.DB_PATH, { verbose: console.log });

      // 创建表（如果不存在）
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS hot_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT UNIQUE NOT NULL,
          score INTEGER DEFAULT 1,
          last_searched INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      console.log(`[HotSearchSQLite] 数据库初始化成功: ${this.DB_PATH}`);
    } catch (error) {
      console.error('[HotSearchSQLite] 数据库初始化失败:', error);
      // 降级到内存模式（不持久化）
      this.initMemoryFallback();
    }
  }

  /**
   * 内存降级模式（当 better-sqlite3 不可用时）
   */
  private initMemoryFallback(): void {
    console.warn('[HotSearchSQLite] 使用内存降级模式（数据不会持久化）');
    this.db = {
      memoryStore: new Map<string, HotSearchItem>(),
      prepare() {
        return {
          run: (term: string, score: number, lastSearched: number, createdAt: number) => {
            this.db.memoryStore.set(term, { term, score, lastSearched, createdAt });
          },
          get: (term: string) => {
            return this.db.memoryStore.get(term);
          },
        };
      },
      exec() {},
      prepareQuery() {
        return {
          all: () => Array.from(this.db.memoryStore.values()),
          run: () => {},
        };
      },
    };
  }

  /**
   * 记录搜索词（增加分数）
   */
  async recordSearch(term: string): Promise<void> {
    if (!term || term.trim().length === 0) return;

    // 违规词检查
    if (await this.isForbidden(term)) {
      console.log(`[HotSearchSQLite] 搜索词包含违规内容: ${term}`);
      return;
    }

    const now = Date.now();

    try {
      // 尝试插入新记录，如果已存在则更新
      const stmt = this.db.prepare(`
        INSERT INTO hot_searches (term, score, last_searched, created_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(term) DO UPDATE SET
          score = score + 1,
          last_searched = ?
      `);

      stmt.run(term, now, now, now);

      // 清理超出限制的低分记录
      this.cleanupOldEntries();

      console.log(`[HotSearchSQLite] 记录搜索词: "${term}"`);
    } catch (error) {
      console.error('[HotSearchSQLite] 记录失败:', error);
    }
  }

  /**
   * 获取热搜列表
   */
  async getHotSearches(limit: number = 30): Promise<HotSearchItem[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT term, score, last_searched as lastSearched, created_at as createdAt
        FROM hot_searches
        ORDER BY score DESC, last_searched DESC
        LIMIT ?
      `);

      const rows = stmt.all(Math.min(limit, this.MAX_ENTRIES));
      return rows.map(row => ({
        term: row.term,
        score: row.score,
        lastSearched: row.lastSearched,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error('[HotSearchSQLite] 查询失败:', error);
      return [];
    }
  }

  /**
   * 清理超出限制的旧记录
   */
  private cleanupOldEntries(): void {
    try {
      // 删除超出最大数量的低分记录
      const stmt = this.db.prepare(`
        DELETE FROM hot_searches
        WHERE id NOT IN (
          SELECT id FROM hot_searches
          ORDER BY score DESC, last_searched DESC
          LIMIT ?
        )
      `);

      const result = stmt.run(this.MAX_ENTRIES);
      if (result.changes > 0) {
        console.log(`[HotSearchSQLite] 清理了 ${result.changes} 条旧记录`);
      }
    } catch (error) {
      console.error('[HotSearchSQLite] 清理失败:', error);
    }
  }

  /**
   * 清除所有热搜记录（需要密码验证）
   */
  async clearHotSearches(password: string): Promise<{ success: boolean; message: string }> {
    const correctPassword = process.env.HOT_SEARCH_PASSWORD || 'admin123';

    if (password !== correctPassword) {
      return { success: false, message: '密码错误' };
    }

    try {
      const stmt = this.db.prepare('DELETE FROM hot_searches');
      stmt.run();

      console.log('[HotSearchSQLite] 所有热搜记录已清除');
      return { success: true, message: '热搜记录已清除' };
    } catch (error) {
      console.error('[HotSearchSQLite] 清除失败:', error);
      return { success: false, message: '清除失败' };
    }
  }

  /**
   * 删除指定热搜词
   */
  async deleteHotSearch(term: string, password: string): Promise<{ success: boolean; message: string }> {
    const correctPassword = process.env.HOT_SEARCH_PASSWORD || 'admin123';

    if (password !== correctPassword) {
      return { success: false, message: '密码错误' };
    }

    try {
      const stmt = this.db.prepare('DELETE FROM hot_searches WHERE term = ?');
      const result = stmt.run(term);

      if (result.changes > 0) {
        console.log(`[HotSearchSQLite] 删除热搜词: "${term}"`);
        return { success: true, message: `热搜词 "${term}" 已删除` };
      } else {
        return { success: false, message: '热搜词不存在' };
      }
    } catch (error) {
      console.error('[HotSearchSQLite] 删除失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  /**
   * 获取热搜统计信息
   */
  async getStats(): Promise<HotSearchStats> {
    try {
      // 获取总数
      const countStmt = this.db.prepare('SELECT COUNT(*) as total FROM hot_searches');
      const countResult = countStmt.get();
      const total = countResult?.total || 0;

      // 获取 Top 10
      const topStmt = this.db.prepare(`
        SELECT term, score, last_searched as lastSearched, created_at as createdAt
        FROM hot_searches
        ORDER BY score DESC, last_searched DESC
        LIMIT 10
      `);
      const topTerms = topStmt.all().map(row => ({
        term: row.term,
        score: row.score,
        lastSearched: row.lastSearched,
        createdAt: row.createdAt,
      }));

      return { total, topTerms };
    } catch (error) {
      console.error('[HotSearchSQLite] 统计查询失败:', error);
      return { total: 0, topTerms: [] };
    }
  }

  /**
   * 获取数据库大小（MB）
   */
  getDatabaseSize(): number {
    try {
      const { statSync } = require('fs');
      if (existsSync(this.DB_PATH)) {
        const stats = statSync(this.DB_PATH);
        return Math.round((stats.size / (1024 * 1024)) * 100) / 100;
      }
    } catch (error) {
      // 忽略错误
    }
    return 0;
  }

  /**
   * 违规词检查（简化版）
   */
  private async isForbidden(term: string): Promise<boolean> {
    const forbiddenPatterns = [
      /政治|暴力|色情|赌博|毒品/i,
      /fuck|shit|bitch/i,
    ];

    return forbiddenPatterns.some(pattern => pattern.test(term));
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db && this.db.close) {
      this.db.close();
      console.log('[HotSearchSQLite] 数据库已关闭');
    }
  }
}

// 单例模式
let singleton: HotSearchSQLiteService | undefined;

export function getOrCreateHotSearchSQLiteService(): HotSearchSQLiteService {
  if (!singleton) {
    singleton = new HotSearchSQLiteService();
  }
  return singleton;
}
