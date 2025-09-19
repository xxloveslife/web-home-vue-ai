export const settingsMock = {
  navbarPosition: 'left',     // 'left' | 'top'
  topicPosition: 'left',      // 'left' | 'right'
  showAssistants: true,
  showTopics: true,
  messageStyle: 'classic',    // 'classic' | 'bubble'
  themeMode: 'dark',          // 'light' | 'dark'
  primaryColor: '#4e8cff',
  showMessageTime: true,
  timeFormat: 'full',         // 'full' | 'relative'
  sidebarIcons: { visible: ['assistants','agents','paintings','translate','minapp','knowledge','files'], disabled: [] }
}

export const assistantsMock = [
  {
    id: 'a1',
    name: 'Assistant A',
    model: { id: 'gpt-4o', name: 'GPT-4o' },
    topics: [
      { id: 't1', assistantId: 'a1', name: '默认话题', isNameManuallyEdited: false },
      { id: 't2', assistantId: 'a1', name: '工作流讨论', isNameManuallyEdited: false },
      { id: 't9', assistantId: 'a1', name: '富块测试', isNameManuallyEdited: false }
    ],
    settings: {}
  },
  {
    id: 'a2',
    name: 'Assistant B',
    model: { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
    topics: [
      { id: 't3', assistantId: 'a2', name: '技术栈选型', isNameManuallyEdited: false }
    ],
    settings: {}
  }
]

export const messagesMockByTopic = {
  t1: [
    { id: 'm1', topicId: 't1', role: 'user', content: '你好', blocks: [], status: 'SUCCESS', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: 'm2', topicId: 't1', role: 'assistant', content: '你好！需要什么帮助？', blocks: [], status: 'SUCCESS', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString() }
  ],
  t2: [
    { id: 'm3', topicId: 't2', role: 'user', content: '介绍一下项目结构', blocks: [], status: 'SUCCESS', createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString() }
  ],
  t3: [
    { id: 'm4', topicId: 't3', role: 'assistant', content: '我们可以使用 Vue3 + Pinia', blocks: [], status: 'SUCCESS', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() }
  ],
  t9: [
    {
      id: 'm9a', topicId: 't9', role: 'assistant', status: 'SUCCESS', createdAt: new Date().toISOString(),
      content: '这是一条用于测试的消息，包含代码块与图片。\n\n```js\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log(\'hello from JS:\', add(2, 3));\n```\n\n```python\ndef greet(name):\n    return f"hello {name}"\n\nprint(greet("world"))\n```\n\n![占位图](https://placehold.co/320x180)\n\n关键字：测试（用于搜索高亮验证）'
    },
    {
      id: 'm9b', topicId: 't9', role: 'assistant', status: 'SUCCESS', createdAt: new Date().toISOString(),
      content: '工具执行结果示例',
      blocks: [
        { type: 'tool-result', durationMs: 128, payload: { 
          command: 'npm run build', 
          exitCode: 0, 
          stdout: 'Build started...\nCompiling modules (1/12)\nCompiling modules (2/12)\nCompiling modules (3/12)\nCompiling modules (4/12)\nCompiling modules (5/12)\nCompiling modules (6/12)\nCompiling modules (7/12)\nCompiling modules (8/12)\nCompiling modules (9/12)\nCompiling modules (10/12)\nCompiling modules (11/12)\nCompiling modules (12/12)\nBundling chunks A...\nBundling chunks B...\nOptimizing assets...\nEmitting files...\nDONE  Build complete in 7.53s\nFile sizes:\n  dist/index.html        1.2 kB\n  dist/assets/app.js     154.3 kB\n  dist/assets/vendor.js  512.8 kB\n', 
          stderr: 'Warning: deprecated api used in module X (line 42)\nWarning: source map missing for vendor.js\n' 
        } }
      ]
    },
    {
      id: 'm9c', topicId: 't9', role: 'assistant', status: 'SUCCESS', createdAt: new Date().toISOString(),
      content: '这是一个告警块演示',
      blocks: [
        { type: 'alert', level: 'warning', text: '磁盘剩余空间不足 10%，请及时清理。' },
        { type: 'alert', level: 'success', text: '依赖安装完成。' }
      ]
    },
    {
      id: 'm9d', topicId: 't9', role: 'assistant', status: 'SUCCESS', createdAt: new Date().toISOString(),
      content: '文件与表格展示',
      blocks: [
        { type: 'file', name: 'report.pdf', size: 1024 * 1024 * 2, url: 'https://example.com/report.pdf' },
        { type: 'table', headers: ['名称', '分数'], rows: [['Alice', 95], ['Bob', 88], ['Carol', 91]] }
      ]
    }
  ]
}


