// Next.js 服务启动钩子：提醒会话密钥配置状态。
//
// SESSION_SECRET 缺失时会话签名退化为内置回退密钥（功能可用但强度受限），
// 在启动日志给出提示。这是最早能提醒部署者的位置（Docker 场景 entrypoint
// 也会兜底生成并持久化密钥）。

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const configured =
    process.env.SESSION_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()

  if (!configured) {
    console.warn(
      "[启动检查] 未配置 SESSION_SECRET（或 NEXTAUTH_SECRET），" +
        "管理后台会话将使用公开回退密钥签名（可被伪造，仅建议演示/内网使用）。\n" +
        "配置方法：openssl rand -base64 32 生成，设置为环境变量 SESSION_SECRET 后重新部署。"
    )
  }
}
