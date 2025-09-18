<template>
  <div class="message-content">
    <template v-for="(seg, i) in segments" :key="i">
      <div v-if="seg.type==='code'" class="code-block">
        <div class="code-toolbar">
          <span class="lang">{{ seg.lang || 'text' }}</span>
          <div class="right">
            <el-button text size="small" @click="copyPlain(seg.code)">复制文本</el-button>
            <el-button text size="small" @click="copyMd(seg.lang, seg.code)">复制Markdown</el-button>
            <el-button text size="small" @click="toggle(i)">{{ expanded[i] ? '收起' : '展开' }}</el-button>
          </div>
        </div>
        <pre :class="['pre', expanded[i] ? 'expanded' : 'collapsed', 'language-'+(seg.lang||'js')]"><code :class="'language-'+(seg.lang||'js')" ref="setCodeRef(i)" v-html="getHighlighted(i, seg)"></code></pre>
        <div class="code-preview" v-if="!expanded[i]">{{ previewCode(seg.code) }}</div>
      </div>
      <div v-else-if="seg.type==='image'" class="image-block">
        <img :src="seg.src" :alt="seg.alt" @click="preview(seg.src)" />
      </div>
      <div v-else-if="seg.type==='table'" class="table-block">
        <table class="tbl">
          <thead>
            <tr>
              <th v-for="(h,hi) in seg.headers" :key="hi">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in seg.rows" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text">
        <template v-for="(p, j) in splitWithHighlight(seg.text)" :key="j">
          <span :class="{ hl: p.matched }">{{ p.text }}</span>
        </template>
      </p>
    </template>
    <span v-if="typing" class="typing-caret"></span>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import Prism from 'prismjs'
import { ElMessage } from 'element-plus'
export default {
  name: 'MessageContent',
  props: { text: String, highlight: String, typing: Boolean },
  setup(props, { expose }) {
    const parse = (input) => {
      const result = []
      if (!input) return result
      const codeRe = /```([\w-]*)\r?\n([\s\S]*?)```/g
      let lastIndex = 0
      let m
      while ((m = codeRe.exec(input)) !== null) {
        const start = m.index
        if (start > lastIndex) {
          const prev = input.slice(lastIndex, start)
          pushTextAndImages(result, prev)
        }
        result.push({ type: 'code', lang: (m[1] || '').trim(), code: m[2] })
        lastIndex = codeRe.lastIndex
      }
      if (lastIndex < input.length) {
        pushTextAndImages(result, input.slice(lastIndex))
      }
      return result
    }
    // 解析 Markdown 表格：将文本切分为表格块与普通文本块
    const parseTablesInText = (text) => {
      const lines = String(text || '').split(/\r?\n/)
      const out = []
      let buf = []
      let i = 0
      const looksLikeHeader = (line) => /\|/.test(line)
      const looksLikeSep = (line) => /\|\s*:?-{2,}\s*(\|\s*:?-{2,}\s*)+\|?/.test(line)
      const splitCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim())
      while (i < lines.length) {
        if (i + 1 < lines.length && looksLikeHeader(lines[i]) && looksLikeSep(lines[i + 1])) {
          if (buf.length) { out.push({ type: 'text', text: buf.join('\n') }); buf = [] }
          const headers = splitCells(lines[i])
          i += 2
          const rows = []
          while (i < lines.length && /\|/.test(lines[i])) {
            rows.push(splitCells(lines[i]))
            i++
          }
          out.push({ type: 'table', headers, rows })
          continue
        }
        buf.push(lines[i])
        i++
      }
      if (buf.length) out.push({ type: 'text', text: buf.join('\n') })
      return out
    }

    const pushTextAndImages = (arr, chunk) => {
      const parts = parseTablesInText(chunk)
      const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
      for (const part of parts) {
        if (part.type === 'table') { arr.push(part); continue }
        const text = part.text || ''
        let last = 0
        let im
        while ((im = imgRe.exec(text)) !== null) {
          const s = im.index
          if (s > last) arr.push({ type: 'text', text: text.slice(last, s) })
          arr.push({ type: 'image', alt: im[1], src: im[2] })
          last = imgRe.lastIndex
        }
        if (last < text.length) arr.push({ type: 'text', text: text.slice(last) })
      }
    }

    const segments = computed(() => parse(props.text || ''))
    const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const splitWithHighlight = (text) => {
      const kw = (props.highlight || '').trim()
      if (!kw) return [{ text, matched: false }]
      try {
        const re = new RegExp(escapeReg(kw), 'gi')
        const parts = []
        let lastIndex = 0
        let m
        while ((m = re.exec(text)) !== null) {
          const start = m.index
          const end = start + m[0].length
          if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start), matched: false })
          parts.push({ text: text.slice(start, end), matched: true })
          lastIndex = end
        }
        if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), matched: false })
        return parts.length ? parts : [{ text, matched: false }]
      } catch (_) {
        return [{ text, matched: false }]
      }
    }
    const expanded = ref({})
    const codeHtmlCache = ref({})
    const codeRefs = ref({})
    const setCodeRef = (i) => (el) => { if (el) { codeRefs.value[i] = el } }
    const loadPrismLang = async (lang) => {
      const map = {
        javascript: () => import('prismjs/components/prism-javascript'),
        typescript: () => import('prismjs/components/prism-typescript'),
        json: () => import('prismjs/components/prism-json'),
        markdown: () => import('prismjs/components/prism-markdown'),
        python: () => import('prismjs/components/prism-python'),
        bash: () => import('prismjs/components/prism-bash'),
        markup: () => import('prismjs/components/prism-markup'),
        css: () => import('prismjs/components/prism-css'),
        yaml: () => import('prismjs/components/prism-yaml'),
        sql: () => import('prismjs/components/prism-sql'),
        java: () => import('prismjs/components/prism-java'),
        go: () => import('prismjs/components/prism-go'),
        rust: () => import('prismjs/components/prism-rust')
      }
      const loader = map[lang]
      if (loader && !Prism.languages[lang]) {
        try { await loader() } catch {}
      }
    }
    const getHighlighted = (i, seg) => {
      const lang = (seg.lang || 'js').toLowerCase()
      // 异步懒加载语言语法后再高亮，首次渲染可能是基础色
      loadPrismLang(lang)
      const grammar = Prism.languages[lang] || Prism.languages.javascript
      const html = Prism.highlight(seg.code, grammar, lang)
      codeHtmlCache.value[i] = html
      return html
    }
    const previewCode = (code) => {
      const t = String(code || '')
      if (t.length <= 120) return t
      return t.slice(0, 120) + ' ...'
    }
    const toggle = (idx) => { expanded.value[idx] = !expanded.value[idx] }
    const expandAll = () => {
      segments.value.forEach((s, i) => { if (s.type === 'code') expanded.value[i] = true })
    }
    const collapseAll = () => {
      segments.value.forEach((s, i) => { if (s.type === 'code') expanded.value[i] = false })
    }
    const copyPlain = async (code) => { try { await navigator.clipboard.writeText(code); ElMessage.success('已复制') } catch {} }
    const copyMd = async (lang, code) => {
      const md = '```' + (lang || '') + '\n' + (code || '') + '\n```'
      try { await navigator.clipboard.writeText(md); ElMessage.success('已复制 Markdown') } catch {}
    }
    const preview = (src) => { window.open(src, '_blank') }

    expose({ expandAll, collapseAll })
    return { segments, expanded, toggle, copyPlain, copyMd, preview, splitWithHighlight, setCodeRef, getHighlighted, previewCode, expandAll, collapseAll }
  }
}
</script>

<style scoped>
.message-content { display: flex; flex-direction: column; gap: 8px; }
.text { white-space: pre-wrap; line-height: 1.6; color: var(--color-text); }
.code-block { border: 1px solid var(--color-border); border-radius: 10px; background: #0c0f16; }
.code-toolbar { display:flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid var(--color-border); }
.lang { color: var(--color-text-secondary); font-size: 12px; }
.code-toolbar .right { display:flex; gap:4px; align-items:center; }
.pre { margin: 0; padding: 10px 12px; max-height: 220px; overflow: auto; color: #eaeaea; }
.pre.expanded { max-height: none; }
.code-preview { margin-top: 6px; color: var(--color-text-secondary); font-size: 12px; }
.image-block img { max-width: 100%; border-radius: 8px; cursor: zoom-in; }
.table-block { overflow: auto; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border: 1px solid var(--color-border); padding: 6px 8px; font-size: 12px; }
.hl { background: rgba(255, 214, 10, 0.35); color: #fff; border-radius: 2px; padding: 0 1px; }
.typing-caret { display:inline-block; width: 8px; height: 1.2em; background: #ffd60a; margin-left: 2px; vertical-align: text-bottom; animation: caretBlink 1s step-end infinite; border-radius: 1px; }
@keyframes caretBlink { 50% { opacity: 0; } }
</style>


