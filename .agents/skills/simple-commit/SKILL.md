---
name: simple-commit
description: Generate a conventional commit message from user description and git diff. Use whenever the user asks for a commit message, mentions "commit message", "提交信息", "git commit", or describes changes and asks "给我一个commit message". This skill should trigger even if the user doesn't explicitly say "simple-commit" — any request for a commit message should use this skill.
---

# simple-commit

根据用户的变更描述 + `git diff` 生成一条 conventional commit message。

## 工作流程

1. 运行 `git diff --stat` 获取变更文件概览
2. 运行 `git diff` 获取完整变更内容
3. 结合用户的描述和 diff 内容，理解这次改动的核心目的
4. 生成一条 commit message，**只输出 message 本身，不加任何前缀、解释或代码块**

## 格式规范

```
type: 中文简洁描述
```

- **type**: 严格使用以下之一 — `feat` `fix` `refactor` `style` `docs` `test` `chore` `perf` `ci`
- **描述**: 用中文，一句话讲清改了什么，不超过 50 字，句末不加标点
- **不要加 scope**（如 `fix(CodePanel):`），直接 `fix:`

## type 选择指南

| type | 适用场景 |
|---|---|
| `feat` | 新功能、新特性 |
| `fix` | 修 bug、改行为、行为修正 |
| `refactor` | 重构，不改变外部行为 |
| `style` | 纯样式/格式化（不影响逻辑） |
| `docs` | 文档、注释 |
| `test` | 测试相关 |
| `chore` | 构建、依赖、配置 |
| `perf` | 性能优化 |
| `ci` | CI/CD 相关 |

## 示例

用户说"修改了生成html时编辑器的滚动条行为"
→ `git diff` 显示 CodePanel.tsx 中新增 auto-scroll 逻辑
→ 输出: `fix: 流式生成时编辑器自动滚动到底部`

用户说"新添加了mock相关特性"
→ `git diff` 显示新增 mock.py、vite.config.ts 中 proxy rewrite 逻辑
→ 输出: `feat: 新增 mock SSE 端点支持零成本开发调试`

用户说"添加了保存草稿功能"
→ `git diff` 显示新增 is_saved 字段、save-draft API、前端按钮
→ 输出: `feat: 生成页支持保存草稿`

## 注意事项

- 如果 diff 中包含不相关的改动，只聚焦用户描述的部分
- 如果用户描述与 diff 不符，以 diff 为准，但可以在回复中简要提醒用户
- 禁止输出除 commit message 以外的任何内容
