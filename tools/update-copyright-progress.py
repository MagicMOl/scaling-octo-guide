import os

DOC = r'D:\本机电脑查询\restart-life-app\docs\软著申请材料清单.md'

with open(DOC, 'r', encoding='utf-8') as f:
    t = f.read()

add = '''
---

## 六、当前进度（2026-11-28）

| 项 | 状态 | 文件 |
|---|---|---|
| 材料清单 | ✅ 完成 | 本文件 |
| 名称与登记信息 | ✅ 定稿 | 全称 25号底片个人经历档案管理与项目孵化系统 / 简称 25号底片 / V1.0 |
| 源程序文档 | ✅ 54 页 | `softcopyright-output/源程序_25号底片_20261128.pdf` |
| 软件说明书 | ✅ 11 页 / 2788 字 | `softcopyright-output/软件说明书_25号底片_20261128.pdf` |
| 界面截图 | ✅ 9 张 | `softcopyright-output/shots/` |
| 身份证与实名 | ⬜ 待你办理 | — |
| 在线填报 | ⬜ 待你办理 | 按第二节 B 表填写 |

**源程序**：2695 行，按 50 行/页分 54 页，页眉「25号底片个人经历档案管理与项目孵化系统 V1.0」，页脚「第 X 页 共 54 页」，已逐页校验无溢出。

**说明书**：含软件概述、运行环境、主要功能（九节）、操作流程、技术特点（五节）、常见问题、术语说明，配 8 张界面图。
'''

if '## 六、当前进度' not in t:
    t = t.rstrip() + '\n' + add

with open(DOC, 'w', encoding='utf-8') as f:
    f.write(t)
print('ok', round(os.path.getsize(DOC) / 1024), 'KB')
