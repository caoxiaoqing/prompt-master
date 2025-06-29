# Prompt Optimizer - 双向同步系统

## 系统概述

本项目实现了一个完整的双向同步系统，确保前端项目管理模块中的文件结构与数据库 task_info 表保持实时同步。

## 核心特性

### 1. 双向同步机制
- **前端到数据库**: 实时同步用户的增删改操作
- **数据库到前端**: 自动拉取远程数据变更
- **冲突检测**: 智能识别并解决数据冲突
- **离线支持**: 网络断开时缓存操作，恢复后自动同步

### 2. 同步内容
- 文件夹/文件的层级结构
- 文件夹/文件的名称变更
- System Prompt 内容更新
- 聊天测试区的对话历史
- 模型参数配置

### 3. 异常处理
- **网络中断**: 自动切换到离线模式，缓存所有操作
- **并发冲突**: 智能冲突检测和解决策略
- **同步失败**: 自动重试机制和回滚保护
- **数据一致性**: 事务性操作确保数据完整性

## 技术架构

### 核心组件

#### 1. SyncService (`src/lib/syncService.ts`)
- 单例模式的同步服务
- 队列管理和批量处理
- 冲突检测和解决
- 离线模式支持
- 事件系统

#### 2. useSyncManager Hook (`src/hooks/useSyncManager.ts`)
- React Hook 封装同步逻辑
- 提供简单的 API 接口
- 状态管理和事件监听
- 自动同步触发

#### 3. SyncStatusIndicator (`src/components/SyncStatusIndicator.tsx`)
- 实时同步状态显示
- 手动同步控制
- 详细统计信息
- 错误提示和处理

#### 4. ConflictResolutionModal (`src/components/ConflictResolutionModal.tsx`)
- 冲突解决界面
- 数据对比显示
- 多种解决策略
- 批量处理支持

### 数据流程

```
用户操作 → useSyncManager → SyncService → 同步队列 → 数据库
    ↓                                                    ↓
状态更新 ← 冲突解决 ← 冲突检测 ← 远程数据拉取 ← 数据库变更
```

## 使用方法

### 1. 基本集成

```typescript
// 在组件中使用同步管理器
import { useSyncManager } from '../hooks/useSyncManager'

const MyComponent = () => {
  const {
    syncState,
    syncTaskCreate,
    syncTaskUpdate,
    syncTaskDelete,
    forceFullSync
  } = useSyncManager()

  // 创建任务时自动同步
  const handleCreateTask = (task) => {
    // 本地状态更新
    dispatch({ type: 'ADD_TASK', payload: task })
    
    // 同步到数据库
    syncTaskCreate(task)
  }
}
```

### 2. 监听同步状态

```typescript
// 监听同步事件
useEffect(() => {
  const handleSyncComplete = (event) => {
    console.log('同步完成:', event.data)
  }

  syncService.addEventListener('sync_complete', handleSyncComplete)
  
  return () => {
    syncService.removeEventListener('sync_complete', handleSyncComplete)
  }
}, [])
```

### 3. 手动同步控制

```typescript
// 强制全量同步
await forceFullSync()

// 从远程拉取数据
await pullFromRemote()

// 推送本地数据
await pushToRemote()
```

## 配置选项

### SyncConfig 配置

```typescript
const syncConfig = {
  autoSyncInterval: 30000,     // 自动同步间隔（毫秒）
  batchSize: 10,               // 批量同步大小
  maxRetries: 3,               // 最大重试次数
  conflictResolution: 'local_wins', // 冲突解决策略
  enableRealTimeSync: true,    // 启用实时同步
  enableOfflineMode: true      // 启用离线模式
}
```

### 冲突解决策略

- **LOCAL_WINS**: 本地数据优先
- **REMOTE_WINS**: 远程数据优先
- **MERGE**: 智能合并
- **ASK_USER**: 询问用户选择

## 性能优化

### 1. 增量同步
- 只同步变更的数据
- 时间戳比较避免重复同步
- 批量处理减少网络请求

### 2. 本地缓存
- 离线操作缓存
- 智能预加载
- 内存优化管理

### 3. 队列管理
- 优先级排序
- 去重合并
- 自动重试

## 监控和调试

### 1. 同步统计
```typescript
const stats = getSyncStats()
console.log('同步统计:', {
  totalOperations: stats.totalOperations,
  successfulOperations: stats.successfulOperations,
  failedOperations: stats.failedOperations,
  conflictOperations: stats.conflictOperations
})
```

### 2. 队列状态
```typescript
const queueStatus = getQueueStatus()
console.log('队列状态:', {
  length: queueStatus.length,
  items: queueStatus.items
})
```

### 3. 事件日志
所有同步操作都会产生详细的控制台日志，便于调试和监控。

## 最佳实践

### 1. 错误处理
- 始终包装同步操作在 try-catch 中
- 提供用户友好的错误提示
- 记录详细的错误日志

### 2. 性能考虑
- 避免频繁的小量同步
- 使用防抖延迟批量操作
- 合理设置同步间隔

### 3. 用户体验
- 显示同步状态指示器
- 提供手动同步选项
- 离线模式友好提示

## 扩展性

系统设计支持轻松扩展：
- 新的数据类型同步
- 自定义冲突解决策略
- 不同的存储后端
- 实时协作功能

## 安全考虑

- 所有同步操作都经过用户身份验证
- 行级安全策略保护数据访问
- 敏感数据加密传输
- 操作日志审计跟踪