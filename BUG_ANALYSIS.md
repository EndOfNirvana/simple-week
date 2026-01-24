# Bug 分析报告

## 问题 1: 周数据独立性问题

### 现象
- 第3周 (1.12-1.18) 和第2周 (1.5-1.11) 的备注都显示 "11"
- 切换周时，备注内容没有变化

### 根本原因
在 `usePlannerStore.ts` 中，`weekId` 的计算方式有问题：

```javascript
const year = currentDate.getFullYear();
const weekNumber = Math.ceil(
  ((currentDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 
  new Date(year, 0, 1).getDay() + 1) / 7
);
const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
```

这个计算方式不准确，应该使用 `date-fns` 的 `getISOWeek` 函数，就像 `date-utils.ts` 中的 `getWeekId` 函数一样。

### 修复方案
使用 `date-utils.ts` 中已有的 `getWeekId` 函数替换手动计算。

---

## 问题 2: 任务输入无效

### 现象
- 点击 "+ 添加任务" 后输入内容，但任务没有保存

### 可能原因
1. API 调用失败
2. 输入框 blur 事件处理问题
3. 认证问题导致 API 被拒绝

### 需要检查
- 浏览器控制台是否有错误
- 网络请求是否成功

---

## 问题 3: 标题输入内容不显示

### 现象
- 在 CustomContentArea 输入 "111111" 后不显示

### 可能原因
`CustomContentArea` 组件的状态管理问题：
- `editText` 状态在 blur 时更新到服务器
- 但 `customText` 从服务器返回后可能没有正确更新 UI

### 修复方案
检查 `handleTextBlur` 函数和状态同步逻辑

---

## 问题 4: UI 重叠

### 现象
- 导出图片、今天按钮和箭头位置重叠

### 修复方案
调整 header 区域的布局，增加间距或调整元素位置
