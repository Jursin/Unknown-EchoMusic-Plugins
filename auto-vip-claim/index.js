const getToday = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  } catch {
    return new Date(Date.now() + 480 * 60 * 1000).toISOString().slice(0, 10)
  }
}

const isAuthExpired = (body) => {
  const payload = body?.data && typeof body.data === 'object' ? body.data : body
  return (
    [body?.error_code, body?.err_code, body?.errcode, payload?.error_code, payload?.err_code, payload?.errcode].some(
      (code) => [20018, 51002].includes(Number(code)),
    ) ||
    [body?.msg, payload?.msg].some(
      (message) => typeof message === 'string' && message.includes('登录已过期'),
    )
  )
}

const hasClaimedToday = (rec) => {
  const today = getToday()
  const list = rec?.data?.list ?? rec?.data ?? []
  return Array.isArray(list) && list.some((r) => r.day === today || r.receive_day === today)
}

const readAccounts = async (ctx) => {
  const [user, device] = await Promise.all([
    ctx.electron.storage.getKv('pinia:user').catch(() => null),
    ctx.electron.storage.getKv('pinia:device').catch(() => null),
  ])
  const dfid = String(device?.info?.dfid ?? '')
  const seen = new Set()

  const normalize = (info) => {
    const userid = Number(info?.userid ?? info?.userId ?? 0)
    const token = String(info?.token ?? '')
    if (!userid || !token || seen.has(userid)) return null
    seen.add(userid)
    return {
      userid,
      token,
      t1: String(info?.t1 ?? ''),
      nickname: String(info?.nickname ?? info?.userName ?? ''),
      dfid,
    }
  }

  const current = user?.isLoggedIn ? normalize(user.info) : null
  const others = []
  for (const saved of Array.isArray(user?.savedAccounts) ? user.savedAccounts : []) {
    const account = normalize(saved)
    if (account) others.push(account)
  }
  return { current, others }
}

const buildAuth = (account) => {
  const parts = [`token=${account.token}`, `userid=${account.userid}`]
  if (account.t1) parts.push(`t1=${account.t1}`)
  if (account.dfid) parts.push(`dfid=${account.dfid}`)
  return parts.join(';')
}

const requestAs = async (ctx, account, url, params) => {
  const res = await ctx.electron.api
    .request({ method: 'GET', url, params, headers: { Authorization: buildAuth(account) } })
    .catch((error) => error?.response?.body ?? error?.response?.data ?? error?.body ?? null)
  return res?.body ?? res
}

const claimDayVip = async (record, claim, upgrade) => {
  const rec = await record().catch(() => null)
  if (isAuthExpired(rec)) return 'expired'
  if (hasClaimedToday(rec)) return 'already'
  const res = await claim().catch(() => null)
  if (isAuthExpired(res)) return 'expired'
  await upgrade().catch(() => {})
  return Number(res?.status) === 1 ? 'claimed' : 'failed'
}

export function activate(ctx) {
  const claimCurrent = () =>
    claimDayVip(
      () => ctx.kugou.user.getVipMonthRecord(),
      () => ctx.kugou.user.claimDayVip(getToday()),
      () => ctx.kugou.user.upgradeDayVip(),
    )

  const claimOther = (account) =>
    claimDayVip(
      () => requestAs(ctx, account, '/youth/month/vip/record'),
      () => requestAs(ctx, account, '/youth/day/vip', { receive_day: getToday() }),
      () => requestAs(ctx, account, '/youth/day/vip/upgrade'),
    )

  let running = false
  let doneToday = ''
  const warned = new Set()

  const claim = async ({ silent = false } = {}) => {
    if (running) return
    const today = getToday()
    if (doneToday === today) return
    running = true
    try {
      const { current, others } = await readAccounts(ctx)

      let claimedCount = 0
      const expired = []

      if (current) {
        const status = await claimCurrent()
        if (status === 'claimed') claimedCount++
      }

      for (const account of others) {
        const status = await claimOther(account)
        if (status === 'claimed') claimedCount++
        else if (status === 'expired' && !warned.has(account.userid)) {
          warned.add(account.userid)
          expired.push(account.nickname || account.userid)
        }
      }

      expired.forEach((name) => ctx.toast.warning(`账号 ${name} 登录已过期，请重新登录`))
      if (!expired.length) doneToday = today

      if (!silent) {
        if (claimedCount) ctx.toast.success(`已领取 ${claimedCount} 个账号的今日畅听会员 🎉`)
        else if (!expired.length) ctx.toast.info('今日畅听会员均已领取')
      }
    } finally {
      running = false
    }
  }

  void claim()
  ctx.events.onTrackChange(() => claim({ silent: true }))
}
