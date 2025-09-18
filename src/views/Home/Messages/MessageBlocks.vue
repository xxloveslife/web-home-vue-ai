<template>
  <div class="message-blocks" v-if="blocks && blocks.length">
    <div v-for="(b, idx) in blocks" :key="idx" class="block" :class="'block-'+(b.type||'unknown')">
      <template v-if="b.type==='tool-result'">
        <div class="block-title">工具执行结果</div>
        <div class="kv">
          <div><span class="k">命令</span><span class="v">{{ b.payload?.command || b.command || '—' }}</span></div>
          <div><span class="k">退出码</span><span class="v">{{ b.payload?.exitCode ?? b.exitCode ?? '—' }}</span></div>
          <div v-if="b.durationMs != null"><span class="k">耗时</span><span class="v">{{ b.durationMs }} ms</span></div>
        </div>
        <div class="io">
          <div class="io-header">
            <span>stdout（{{ countLines(b.payload?.stdout || b.stdout || '') }} 行）</span>
            <div class="actions">
              <el-button text size="small" @click="toggleOpen(idx, 'out')">{{ isOpen(idx,'out') ? '收起' : '展开' }}</el-button>
              <el-button text size="small" @click="copyText(b.payload?.stdout || b.stdout)">复制</el-button>
            </div>
          </div>
          <pre v-if="isOpen(idx,'out')" class="block-pre">{{ b.payload?.stdout || b.stdout || '' }}</pre>
          <div v-else class="preview">{{ previewText(b.payload?.stdout || b.stdout || '') }}</div>
        </div>
        <div class="io">
          <div class="io-header">
            <span>stderr（{{ countLines(b.payload?.stderr || b.stderr || '') }} 行）</span>
            <div class="actions">
              <el-button text size="small" @click="toggleOpen(idx, 'err')">{{ isOpen(idx,'err') ? '收起' : '展开' }}</el-button>
              <el-button text size="small" @click="copyText(b.payload?.stderr || b.stderr)">复制</el-button>
            </div>
          </div>
          <pre v-if="isOpen(idx,'err')" class="block-pre error">{{ b.payload?.stderr || b.stderr || '' }}</pre>
          <div v-else class="preview error">{{ previewText(b.payload?.stderr || b.stderr || '') }}</div>
        </div>
      </template>
      <template v-else-if="b.type==='table'">
        <div class="block-title">表格（Mock）</div>
        <table class="tbl">
          <thead>
            <tr>
              <th v-for="(h,i) in (b.headers||[])" :key="i">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in (b.rows||[])" :key="r">
              <td v-for="(cell, c) in row" :key="c">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <template v-else-if="b.type==='alert'">
        <div class="alert" :class="'level-'+(b.level||'info')">
          <div class="alert-title">{{ alertTitle(b.level) }}</div>
          <div class="alert-body">{{ b.text || b.message }}</div>
        </div>
      </template>
      <template v-else-if="b.type==='file'">
        <div class="block-title">文件（Mock）</div>
        <div class="file-row">
          <div class="name">{{ b.name || 'unknown' }}</div>
          <div class="meta" v-if="b.size">{{ formatSize(b.size) }}</div>
          <el-button text size="small" @click="preview(b)">预览</el-button>
          <el-button text size="small" @click="download(b)">下载</el-button>
        </div>
      </template>
      <template v-else>
        <div class="block-title">未知块 {{ b.type }}</div>
        <pre class="block-pre">{{ pretty(b) }}</pre>
      </template>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
export default {
  name: 'MessageBlocks',
  props: { blocks: Array },
  setup() {
    const pretty = (obj) => {
      try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
    }
    const download = (b) => {
      // Mock: 直接打开链接或提示
      if (b && b.url) window.open(b.url, '_blank')
    }
    const preview = (b) => {
      if (b && b.url) window.open(b.url, '_blank')
    }
    const openMap = reactive({})
    const isOpen = (idx, which) => openMap[idx + ':' + which] === true
    const toggleOpen = (idx, which) => { const k = idx + ':' + which; openMap[k] = !openMap[k] }
    const copyText = async (text) => { try { await navigator.clipboard.writeText(text || ''); ElMessage.success('已复制') } catch {} }
    const countLines = (text) => (text ? String(text).split(/\r?\n/).length : 0)
    const previewText = (text) => {
      const t = String(text || '')
      if (t.length <= 120) return t
      return t.slice(0, 120) + ' ...'
    }
    const alertTitle = (level) => ({ success: '成功', warning: '警告', error: '错误', info: '提示' }[level || 'info'])
    const formatSize = (s) => {
      if (!s && s !== 0) return ''
      const units = ['B','KB','MB','GB']
      let n = Number(s) || 0, i = 0
      while (n >= 1024 && i < units.length-1) { n /= 1024; i++ }
      return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + units[i]
    }
    return { pretty, download, preview, isOpen, toggleOpen, copyText, alertTitle, formatSize, countLines, previewText }
  }
}
</script>

<style scoped>
.message-blocks { display:flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.block { border: 1px dashed var(--color-border); border-radius: 8px; padding: 10px 12px; background: rgba(255,255,255,.02); }
.block-title { font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; font-size: 13px; }
.block-pre { margin: 0; padding: 10px; background: #0c0f16; color: #eaeaea; border-radius: 6px; overflow: auto; font-size: 12px; line-height: 1.5; }
.block-pre.error { background: #1a0d0d; color: #ffb4b4; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border: 1px solid var(--color-border); padding: 6px 8px; font-size: 12px; }
.file-row { display: flex; align-items: center; gap: 8px; }
.file-row .name { flex: 1; }
.file-row .meta { color: var(--color-text-secondary); font-size: 12px; }
.kv { display:grid; grid-template-columns: 80px 1fr; gap: 6px 12px; margin-bottom: 6px; }
.kv .k { color: var(--color-text-secondary); margin-right: 6px; }
.kv .v { color: var(--color-text); }
.io { margin-top: 8px; }
.io-header { display:flex; align-items:center; justify-content:space-between; }
.alert { border:1px solid var(--color-border); border-radius:8px; padding:8px 10px; }
.alert .alert-title { font-weight: 700; margin-bottom: 4px; }
.alert.level-info { background: rgba(59,130,246,.08); border-color: rgba(59,130,246,.35); }
.alert.level-success { background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.35); }
.alert.level-warning { background: rgba(234,179,8,.08); border-color: rgba(234,179,8,.35); }
.alert.level-error { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.35); }
</style>


