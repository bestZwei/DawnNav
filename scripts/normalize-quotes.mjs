// 语料规范化：把素材整理为「两行一条」通用格式，并编译为插件运行时读取的 quotes.json。
//
// 通用格式约定（plugins/quote-marquee/quotes.txt）：
//   每条目严格两行 —— 第 1 行 = 正文；第 2 行 = 其他（署名、出处等说明，允许为空行）。
//   插件不感知素材的具体结构，只按行对读取，替换素材无需改动插件代码。
//
// 用法：
//   node scripts/normalize-quotes.mjs                       # quotes.txt → quotes.json
//   node scripts/normalize-quotes.mjs <源文件>              # 源文件 → quotes.txt → quotes.json
//
// 源文件解析（<源文件> 形态）针对 mao-quote-zh.txt 的版式：
//   主题行（短行、无句读）/ 语录正文行 / 「——《出处》（日期）」署名行 / 「衍生：」注释行（丢弃）。
//   一段完整语录为一条目（不做切句），出处随条目整体滚动。
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const PLUGIN_DIR = path.join(ROOT, "plugins", "quote-marquee")
const TXT_PATH = path.join(PLUGIN_DIR, "quotes.txt")
const JSON_PATH = path.join(PLUGIN_DIR, "quotes.json")

// ---------- 源文件解析（mao-quote-zh.txt 版式） ----------

// 素材全部语录的作者署名，统一拼进「其他」行：——毛泽东《出处》（日期）
const AUTHOR = "毛泽东"

function parseSource(sourcePath) {
  const lines = readFileSync(sourcePath, "utf8").split(/\r?\n/)
  const records = []
  let pendingText = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith("——") || line.startsWith("—《") || line.startsWith("—〈")) {
      // 署名行：归一化书名号、去除尾注标记，收束当前条目，并补上作者署名
      const source = line.replace(/^[—]+/, "")
        .replaceAll("〈", "《").replaceAll("〉", "》")
        .replace(/\[\d+\]/g, "").trim()
      const meta = `——${AUTHOR}${source}`
      if (pendingText !== null) {
        records.push({ text: pendingText, meta })
        pendingText = null
      }
      continue
    }
    if (line.startsWith("衍生")) continue // 编辑注记，不入语料

    const hasPunct = /[。！？；，：、“”]/.test(line)
    if (line.length <= 16 && !hasPunct) {
      // 主题行：仅用于原文分组，输出格式中不带主题
      continue
    }

    // 语录正文行：无署名行的语录同样挂作者署名
    const text = line.replace(/\[\d+\]/g, "").trim()
    if (pendingText !== null) records.push({ text: pendingText, meta: `——${AUTHOR}` })
    pendingText = text
  }
  if (pendingText !== null) records.push({ text: pendingText, meta: `——${AUTHOR}` })
  return records
}

// ---------- 去重（同文只保留首条） ----------

function dedupe(records) {
  const entries = []
  const seen = new Set()
  for (const { text, meta } of records) {
    if (text.length < 4 || seen.has(text)) continue
    seen.add(text)
    entries.push({ text, meta })
  }
  return entries
}

// ---------- 两行一条通用格式 ⇄ JSON ----------

function txtToEntries(txtContent) {
  const lines = txtContent.split(/\r?\n/)
  const entries = []
  for (let i = 0; i < lines.length; i += 2) {
    const text = (lines[i] ?? "").trim()
    const meta = (lines[i + 1] ?? "").trim()
    if (!text) continue
    entries.push({ text, meta })
  }
  return entries
}

function writeArtifacts(entries) {
  const txt = entries.map((e) => `${e.text}\n${e.meta}`).join("\n") + "\n"
  writeFileSync(TXT_PATH, txt, "utf8")
  writeFileSync(JSON_PATH, JSON.stringify(entries), "utf8")

  const lengths = entries.map((e) => e.text.length)
  const avg = (lengths.reduce((a, b) => a + b, 0) / entries.length).toFixed(1)
  console.log(`✅ 条目 ${entries.length} 条（平均 ${avg} 字，最长 ${Math.max(...lengths)} 字）`)
  console.log(`   ${path.relative(ROOT, TXT_PATH)}`)
  console.log(`   ${path.relative(ROOT, JSON_PATH)}`)
}

// ---------- 入口 ----------

const sourceArg = process.argv[2]
if (sourceArg) {
  const sourcePath = path.resolve(ROOT, sourceArg)
  if (!existsSync(sourcePath)) {
    console.error(`❌ 源文件不存在：${sourcePath}`)
    process.exit(1)
  }
  console.log(`📄 解析源文件：${path.relative(ROOT, sourcePath)}`)
  writeArtifacts(dedupe(parseSource(sourcePath)))
} else {
  if (!existsSync(TXT_PATH)) {
    console.error(`❌ 未找到 ${path.relative(ROOT, TXT_PATH)}，请先传入源文件路径生成`)
    process.exit(1)
  }
  console.log("📄 从既有 quotes.txt 编译 JSON")
  writeArtifacts(txtToEntries(readFileSync(TXT_PATH, "utf8")))
}
