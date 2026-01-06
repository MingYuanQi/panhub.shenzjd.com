<template>
  <div class="hot-search-tabs">
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: currentTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="tabs-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 热搜列表 -->
      <div v-else-if="filteredSearches.length > 0" class="searches-list">
        <button
          v-for="(item, index) in filteredSearches"
          :key="item.term"
          class="search-item"
          @click="onSearchClick(item.term)"
          :style="{ animationDelay: `${index * 0.05}s` }"
        >
          <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
          <span class="term">{{ item.term }}</span>
          <span class="score" v-if="item.score > 1">🔥 {{ item.score }}</span>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>暂无热搜数据</p>
        <small>搜索后会自动记录并显示</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface HotSearchItem {
  term: string;
  score: number;
  lastSearched?: number;
  createdAt?: number;
}

interface Tab {
  key: string;
  label: string;
  icon: string;
  keywords: string[];
}

const props = defineProps<{
  onSearch: (term: string) => void;
}>();

const currentTab = ref<string>('all');
const loading = ref<boolean>(false);
const allSearches = ref<HotSearchItem[]>([]);

// Tab 配置
const tabs: Tab[] = [
  { key: 'all', label: '全部', icon: '🔥', keywords: [] },
  { key: 'movie', label: '影视', icon: '🎬', keywords: ['电影', '剧集', '电视剧', '动漫', '动画', '纪录片', '综艺'] },
  { key: 'software', label: '软件', icon: '💻', keywords: ['软件', '工具', '应用', 'APP', '程序', '安装包'] },
  { key: 'study', label: '学习', icon: '📚', keywords: ['学习', '资料', '教程', '课程', '文档', '电子书', '教材'] },
  { key: 'music', label: '音乐', icon: '🎵', keywords: ['音乐', '歌曲', 'MP3', '无损', 'FLAC'] },
  { key: 'game', label: '游戏', icon: '🎮', keywords: ['游戏', 'Steam', '单机', '手游', '网游'] },
];

// 过滤当前 Tab 的热搜
const filteredSearches = computed(() => {
  if (currentTab.value === 'all') {
    return allSearches.value;
  }

  const tab = tabs.find(t => t.key === currentTab.value);
  if (!tab || tab.keywords.length === 0) return allSearches.value;

  return allSearches.value.filter(item => {
    return tab.keywords.some(keyword => item.term.includes(keyword));
  });
});

// 获取热搜数据
async function fetchHotSearches() {
  loading.value = true;
  try {
    const response = await fetch('/api/hot-searches?limit=30');
    const data = await response.json();

    if (data.code === 0 && data.data?.hotSearches) {
      allSearches.value = data.data.hotSearches;
    }
  } catch (error) {
    console.error('获取热搜失败:', error);
    allSearches.value = [];
  } finally {
    loading.value = false;
  }
}

// 切换 Tab
function switchTab(tabKey: string) {
  currentTab.value = tabKey;
}

// 点击搜索词
function onSearchClick(term: string) {
  props.onSearch(term);
}

// 定时刷新（每 30 秒）
onMounted(() => {
  fetchHotSearches();
  const interval = setInterval(fetchHotSearches, 30000);

  // 清理定时器
  onUnmounted(() => {
    clearInterval(interval);
  });
});
</script>

<style scoped>
.hot-search-tabs {
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

/* Tab 头部 */
.tabs-header {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-header::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 1;
  min-width: 60px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.tab-icon {
  font-size: 16px;
}

.tab-label {
  font-weight: 600;
}

/* 内容区域 */
.tabs-content {
  padding: 16px;
  min-height: 120px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 热搜列表 */
.searches-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 14px;
  color: var(--text-primary);
  text-align: left;
  animation: slideIn 0.3s ease backwards;
}

.search-item:hover {
  background: var(--bg-primary);
  border-color: var(--primary);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.rank {
  font-weight: 700;
  font-size: 16px;
  width: 24px;
  text-align: center;
  color: var(--text-tertiary);
}

.rank.top {
  color: var(--primary);
  text-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
}

.rank.top:nth-child(1) {
  color: #f59e0b; /* 金牌 */
}

.rank.top:nth-child(2) {
  color: #94a3b8; /* 银牌 */
}

.rank.top:nth-child(3) {
  color: #cd7f32; /* 铜牌 */
}

.term {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score {
  font-size: 12px;
  color: #ef4444;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px 8px;
  border-radius: 999px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.empty-state small {
  opacity: 0.7;
}

/* 动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端优化 */
@media (max-width: 640px) {
  .tabs-header {
    padding: 6px;
  }

  .tab-btn {
    min-width: 50px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .tab-icon {
    font-size: 14px;
  }

  .tabs-content {
    padding: 12px;
  }

  .search-item {
    padding: 10px 12px;
    font-size: 13px;
  }

  .rank {
    width: 20px;
    font-size: 14px;
  }

  .score {
    font-size: 11px;
    padding: 3px 6px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .hot-search-tabs {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .tabs-header {
    background: rgba(0, 0, 0, 0.2);
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .search-item {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .search-item:hover {
    background: rgba(15, 23, 42, 0.7);
  }

  .score {
    background: rgba(239, 68, 68, 0.15);
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .tab-btn:hover,
  .search-item:hover {
    transform: none;
  }

  .search-item {
    animation: none;
  }

  .spinner {
    animation: none;
    opacity: 0.7;
  }
}
</style>
