# 🔥 PanHub 热搜功能实现文档

## 📋 问题解决

✅ **已解决**：首页空白无热搜问题

实现了完整的动态热搜系统，使用 SQLite 持久化存储，支持智能分类和实时更新。

## 🚀 快速开始

### 1. 安装依赖
```bash
pnpm add better-sqlite3
```

### 2. 启动开发服务器
```bash
pnpm dev
```

### 3. 测试功能
1. 访问 `http://localhost:3000`
2. 搜索任意关键词（如 "电影"）
3. 刷新页面查看热搜推荐
4. 点击标签页测试分类过滤

## 📊 API 接口

### 获取热搜列表
```bash
GET /api/hot-searches?limit=30
```

### 记录搜索词（自动调用）
```bash
POST /api/hot-searches
{ "term": "搜索关键词" }
```

### 删除热搜词（管理员）
```bash
POST /api/delete-hot-search
{ "term": "要删除的词", "password": "admin123" }
```

### 清空所有热搜（管理员）
```bash
POST /api/clear-hot-searches
{ "password": "admin123" }
```

## ⚙️ 配置

### 管理密码
在 `.env` 文件中设置：
```env
HOT_SEARCH_PASSWORD=your_custom_password
```
默认密码：`admin123`

### 修改最大记录数
编辑 `server/core/services/hotSearchSQLite.ts`：
```typescript
private readonly MAX_ENTRIES = 50;
```

### 修改刷新间隔
编辑 `pages/index/HotSearchTabs.vue`：
```typescript
const interval = setInterval(fetchHotSearches, 30000);
```

## 🧪 运行测试

```bash
pnpm test test/hot-search.test.ts
```

## 📋 功能清单

| 功能 | 状态 |
|------|------|
| SQLite 持久化 | ✅ |
| 内存降级 | ✅ |
| 自动记录 | ✅ |
| 智能分类 | ✅ |
| 违规过滤 | ✅ |
| 自动清理 | ✅ |
| 实时刷新 | ✅ |
| 玻璃拟态 UI | ✅ |
| 深色模式 | ✅ |
| 响应式 | ✅ |

## ⚠️ 注意事项

### better-sqlite3 安装失败
如果安装失败，系统会自动降级到内存模式（重启后数据丢失）

### Cloudflare Workers 部署
不支持文件系统，需要使用 Cloudflare D1 或 KV 替代 SQLite

### 数据目录权限
确保 `./data/` 目录有写入权限

## 📁 文件清单

**新增文件：**
- `server/core/services/hotSearchSQLite.ts`
- `server/api/hot-searches.get.ts`
- `server/api/hot-searches.post.ts`
- `server/api/clear-hot-searches.post.ts`
- `server/api/delete-hot-search.post.ts`
- `pages/index/HotSearchTabs.vue`
- `test/hot-search.test.ts`

**修改文件：**
- `pages/index/index.vue`
- `composables/useSearch.ts`
- `package.json`

---

**立即体验：** `pnpm dev` → `http://localhost:3000`
