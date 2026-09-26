import { getAdminCategories } from "@/lib/actions"

// 前台/后台共用的管理员分类列表加载器。
// 首页每张站点卡片都常挂载一个编辑弹窗，若各自拉取分类会在页面打开瞬间
// 产生数十个内容相同的 Server Action 请求（实测 48 卡 = 48 次），
// 这里做模块级单飞：并发共享同一次请求，成功结果短 TTL 缓存。
// TTL 只影响「已成功后的重复打开」；失败不写缓存，下次调用即重试。
//
// ⚠️ 仅允许 "use client" 组件引用：模块级缓存在服务端组件中会跨请求、
// 跨工作区存活（getAdminCategories 按后台当前选中工作区过滤，与当前
// 域名对应的工作区不一定相同），串数据比 30 秒旧列表严重得多。

export interface AdminCategory {
  id: string
  name: string
}

const CACHE_TTL_MS = 30 * 1000

let cache: { list: AdminCategory[]; at: number } | null = null
let inflight: Promise<AdminCategory[] | null> | null = null
// 代数计数：invalidate 时已在飞行中的请求 resolve 后不得写回 cache，
// 否则旧列表会把刚失效的缓存刷回去并续期 30 秒
let generation = 0

export function fetchAdminCategoriesShared(): Promise<AdminCategory[] | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Promise.resolve(cache.list)
  }
  if (inflight) {
    return inflight
  }

  const gen = generation
  const request = getAdminCategories()
    .then((result) => {
      const list = result.success && result.data ? (result.data as AdminCategory[]) : null
      if (list && gen === generation) {
        cache = { list, at: Date.now() }
      }
      return list
    })
    .finally(() => {
      // 仅当仍指向自己这轮请求时才清引用：中途 invalidate 后其他调用者
      // 可能已发起新一轮请求，不能替它清掉（否则第三个调用者无法合流）
      if (inflight === request) {
        inflight = null
      }
    })
  inflight = request
  return request
}

// 使分类缓存失效：分类增删改/排序成功后调用，避免同一标签页 30 秒内
// 读到旧列表（旧名称、已删除的分类 id、旧的默认选中项）。
// 注意模块级缓存按标签页各存一份，跨标签页失效靠 30 秒 TTL 自然过期。
export function invalidateAdminCategoriesCache() {
  generation++
  cache = null
  inflight = null
}
