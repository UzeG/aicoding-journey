/* Platform interaction widget — right-side drawer on published pages.
   A small chevron arrow at the screen edge toggles a drawer:
     PC: slides in from the right, vertically centered, width slightly < screen width.
     Mobile: slides up from the bottom as a bottom sheet.
   The drawer is a fixed overlay above the page (page layout is NOT affected).
   Two tabs: 作者 (author info + their other published works) / 评论 (comments).
   Vanilla JS, no deps. Reads JWT from localStorage (same-origin app). Appended to
   <html> so it stays on top. */
(function () {
  'use strict'

  var root = document.getElementById('platform-interactions')
  if (!root) return
  var pk = root.getAttribute('data-pk')
  if (!pk) return

  var TOKEN_KEY = 'access_token'
  var HEX_RE = /^#[0-9a-fA-F]{6}$/

  // 抽屉跟随「当前用户」的外观（浅/深/设备）与主题色——读 App 缓存在 localStorage 的 manifest.*
  function hexMix(a, b, t) {
    var pa = parseInt(a.slice(1), 16)
    var pb = parseInt(b.slice(1), 16)
    var r = Math.round(((pa >> 16) & 255) * t + ((pb >> 16) & 255) * (1 - t))
    var g = Math.round(((pa >> 8) & 255) * t + ((pb >> 8) & 255) * (1 - t))
    var bl = Math.round((pa & 255) * t + (pb & 255) * (1 - t))
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)
  }
  function applyPiTheme() {
    var root = document.documentElement
    var mode = 'system'
    try {
      var m = localStorage.getItem('manifest.appearance')
      if (m === 'light' || m === 'dark' || m === 'system') mode = m
    } catch (e) {}
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    var theme = '#3d5a80'
    try {
      var t = localStorage.getItem('manifest.theme')
      if (t && HEX_RE.test(t)) theme = t.toLowerCase()
    } catch (e) {}
    var set = function (k, v) { root.style.setProperty(k, v) }
    if (dark) {
      set('--pi-surface', '#1c1e18')
      set('--pi-text', '#e9e5d8')
      set('--pi-muted', '#98937f')
      set('--pi-border', 'rgba(233,229,216,.16)')
      set('--pi-theme-fg', '#10110d')
      set('--pi-theme', hexMix(theme, '#ffffff', 0.4)) // 深色用提亮主色，保证可读
    } else {
      set('--pi-surface', '#ffffff')
      set('--pi-text', '#20221f')
      set('--pi-muted', '#6e6a61')
      set('--pi-border', 'rgba(32,34,31,.16)')
      set('--pi-theme-fg', '#ffffff')
      set('--pi-theme', theme)
    }
  }
  applyPiTheme()
  // 跟随设备模式下，系统深浅变化时重算
  var piMq = window.matchMedia('(prefers-color-scheme: dark)')
  var onSchemeChange = function () {
    try {
      var m = localStorage.getItem('manifest.appearance')
      if (m !== 'light' && m !== 'dark') applyPiTheme()
    } catch (e) {}
  }
  if (piMq.addEventListener) piMq.addEventListener('change', onSchemeChange)
  var OPEN = false
  var state = { liked: false, favorited: false, likeCount: 0, favCount: 0, comments: [], page: null, isFollowing: false, followerCount: 0, worksCount: 0, viewerIsSelf: false }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' }
  }

  // api(path) — path is a full /api/... path
  function api(path, opts) {
    opts = opts || {}
    var headers = { 'Content-Type': 'application/json' }
    var tok = getToken()
    if (tok) headers['Authorization'] = 'Bearer ' + tok
    return fetch(path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        showLoginModal()
        throw new Error('unauthorized')
      }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.detail || ('请求失败 (' + res.status + ')'))
        return data
      })
    })
  }

  var ICONS = {
    left: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    right: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  }
  var FILE_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  var SEND_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
  var HEART_ICON =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
  var HEART_FILLED =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
  var STAR_ICON =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  var STAR_FILLED =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  var TRASH_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
  var SHARE_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>'
  var REPORT_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>'
  var EYE_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'

  // ── styles ──
  var style = document.createElement('style')
  style.textContent = `
:root{
  --pi-theme:#3D5A80;
  --pi-theme-fg:#fff;
  --pi-surface:#fff;
  --pi-text:#20221f;
  --pi-muted:#6e6a61;
  --pi-border:rgba(32,34,31,.16);
}
#pi-trigger{position:fixed;right:1rem;bottom:1.2rem;z-index:3004;width:36px;height:36px;border:none;background:var(--pi-theme);color:var(--pi-theme-fg);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:50%;box-shadow:0 2px 14px rgba(0,0,0,.35);opacity:.35;transition:opacity .2s ease;}
#pi-trigger:hover{filter:brightness(.92);opacity:1;}
html.pi-open #pi-trigger{opacity:0;pointer-events:none;}
/* 抽屉：底部上滑 bottom sheet（PC/移动端统一；打开时盖住右下角触发按钮） */
#pi-panel{position:fixed;left:0;right:0;bottom:0;z-index:3004;transform:translateY(100%);height:78vh;background:var(--pi-surface);border-radius:1rem 1rem 0 0;box-shadow:0 -3px 14px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;color:var(--pi-text);opacity:0;visibility:hidden;transition:transform .3s ease,opacity .3s ease,visibility 0s linear .3s;touch-action:none;}
#pi-panel.open{transform:translateY(0);opacity:1;visibility:visible;transition:transform .3s ease,opacity .3s ease,visibility 0s;}
/* 简介区：项目名 / 发布时间 / 描述（每项一行） */
#pi-panel .pi-proj-title{font-weight:700;font-size:1.15rem;line-height:1.3;margin-bottom:.35rem;word-break:break-word;}
#pi-panel .pi-proj-time{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--pi-muted);margin-bottom:.5rem;}
#pi-panel .pi-proj-time svg{width:14px;height:14px;flex-shrink:0;}
#pi-panel .pi-proj-desc{font-size:.85rem;color:var(--pi-muted);white-space:pre-wrap;word-break:break-word;margin-bottom:.75rem;}
/* 描述下 tags：可换行、左排、tag 间 gap */
#pi-panel .pi-tags{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:0;}
#pi-panel .pi-tag{font-size:.78rem;color:var(--pi-theme);text-decoration:none;border-radius:999px;padding:.1rem .55rem;background:color-mix(in srgb, var(--pi-theme) 10%, transparent);white-space:nowrap;line-height:1.4;}
#pi-panel .pi-tag:hover{background:color-mix(in srgb, var(--pi-theme) 20%, transparent);}
/* 简介区：点赞/收藏/转发（icon+数字上下居中，项间 justify-around） */
#pi-panel .pi-actions{display:flex;justify-content:space-around;align-items:stretch;padding:1rem 0 .8rem;border-bottom:1px solid var(--pi-border);margin-bottom:1rem;}
/* 按钮等高（stretch）+ 内容顶部对齐 + count 固定 min-height → icon 严格同一排（无论有无数字） */
#pi-panel .pi-action{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.3rem;background:none;border:none;padding:.3rem .6rem;cursor:pointer;color:var(--pi-text);font:inherit;border-radius:8px;}
#pi-panel .pi-action svg{width:24px;height:24px;display:block;} /* 统一 24px，display:block 消除基线间隙 */
#pi-panel .pi-action .pi-count{display:block;font-size:.75rem;color:var(--pi-muted);min-width:1em;min-height:.9rem;line-height:.9rem;text-align:center;}
#pi-panel .pi-action.on{color:var(--pi-theme);}
#pi-panel .pi-action.on .pi-count{color:var(--pi-theme);}
#pi-panel .pi-tabs{display:flex;border-bottom:1px solid var(--pi-border);flex-shrink:0;}
#pi-panel .pi-tab{flex:1;padding:.7rem .5rem;background:none;border:none;font:inherit;cursor:pointer;color:var(--pi-muted);border-bottom:2px solid transparent;}
#pi-panel .pi-tab.on{color:var(--pi-theme);border-bottom-color:var(--pi-theme);font-weight:600;}
#pi-panel .pi-body{flex:1;overflow-y:auto;padding:1rem 1.1rem;touch-action:auto;overscroll-behavior:contain;}
#pi-panel .pi-body[hidden]{display:none;}
#pi-panel .pi-grabber{display:flex;align-items:center;justify-content:center;padding:.75rem 0 .4rem;cursor:grab;touch-action:none;flex-shrink:0;}
#pi-panel .pi-grabber::before{content:'';width:56px;height:5px;border-radius:3px;background:var(--pi-muted);opacity:.4;}
/* 简介区：作者行（头像 + 名字/关注·作品数 + 关注按钮） */
#pi-panel .pi-author-row{display:flex;align-items:center;gap:.8rem;padding-bottom:.75rem;margin-bottom:0;cursor:pointer;}
#pi-panel .pi-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;background:color-mix(in srgb, var(--pi-theme) 14%, transparent);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:1.2rem;color:var(--pi-theme);}
#pi-panel .pi-author-meta{min-width:0;display:flex;flex-direction:column;gap:.3rem;align-items:flex-start;}
#pi-panel .pi-name{font-weight:600;font-size:1.05rem;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
#pi-panel .pi-stats{font-size:.8rem;color:var(--pi-muted);display:flex;align-items:center;gap:.75rem;}
#pi-panel .pi-follow{margin-left:auto;display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .8rem;border:1px solid var(--pi-border);border-radius:999px;background:color-mix(in srgb, var(--pi-theme) 10%, transparent);color:var(--pi-text);cursor:pointer;font:inherit;font-size:.82rem;white-space:nowrap;flex-shrink:0;}
#pi-panel .pi-follow.on{background:var(--pi-theme);color:var(--pi-theme-fg);border-color:var(--pi-theme);font-weight:600;}
#pi-panel .pi-works-title{font-weight:600;font-size:.92rem;margin-bottom:.6rem;color:var(--pi-text);}
#pi-panel .pi-work{display:flex;align-items:center;gap:.7rem;padding:.5rem .6rem;border-radius:10px;text-decoration:none;color:var(--pi-text);margin-bottom:.4rem;}
#pi-panel .pi-work:hover{background:color-mix(in srgb, var(--pi-theme) 8%, transparent);}
#pi-panel .pi-work-cover{width:56px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;background:color-mix(in srgb, var(--pi-theme) 12%, transparent);display:flex;align-items:center;justify-content:center;color:var(--pi-muted);font-size:.6rem;}
#pi-panel .pi-work-meta{min-width:0;}
#pi-panel .pi-work-name{font-size:.9rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#pi-panel .pi-work-url{font-size:.78rem;color:var(--pi-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* comments */
#pi-panel .pi-comments{flex:1;display:flex;flex-direction:column;overflow:hidden;padding:0;touch-action:auto;}
#pi-panel .pi-comments-list{flex:1;overflow-y:auto;padding:1rem 1.1rem;touch-action:auto;overscroll-behavior:contain;}
#pi-panel .pi-comment{position:relative;display:flex;align-items:flex-start;gap:.6rem;padding:.6rem .8rem;border:1px solid var(--pi-border);border-radius:10px;margin-bottom:.6rem;background:color-mix(in srgb, var(--pi-theme) 6%, transparent);}
#pi-panel .pi-comment-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;background:color-mix(in srgb, var(--pi-theme) 14%, transparent);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:.85rem;color:var(--pi-theme);}
#pi-panel .pi-comment-avatar-link{display:flex;flex-shrink:0;border-radius:50%;}
#pi-panel .pi-comment-main{flex:1;min-width:0;}
#pi-panel .pi-comment-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem;}
#pi-panel .pi-comment-name{font-weight:600;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#pi-panel .pi-comment-name[href]{color:inherit;text-decoration:none;cursor:pointer;}
#pi-panel .pi-comment-name[href]:hover{text-decoration:underline;}
#pi-panel .pi-comment-time{color:var(--pi-muted);font-size:.72rem;margin-left:.5rem;opacity:.8;}
#pi-panel .pi-comment-del{display:inline-flex;align-items:center;justify-content:center;align-self:center;flex-shrink:0;width:24px;height:24px;padding:0;background:none;border:none;border-radius:6px;color:var(--pi-muted);cursor:pointer;}
#pi-panel .pi-comment-del:hover{background:color-mix(in srgb, var(--pi-theme) 12%, transparent);color:var(--pi-text);}
/* 删除评论确认（局部小弹窗，锚定在评论条上） */
#pi-panel .pi-confirm{position:absolute;right:.6rem;top:.6rem;z-index:10;display:flex;align-items:center;gap:.45rem;background:var(--pi-surface);color:var(--pi-theme);border:1px solid var(--pi-border);border-radius:10px;padding:.4rem .6rem;box-shadow:0 6px 18px rgba(0,0,0,.3);font-size:.8rem;white-space:nowrap;}
#pi-panel .pi-confirm-yes{border:none;border-radius:6px;background:var(--pi-theme);color:var(--pi-theme-fg);padding:.28rem .6rem;cursor:pointer;font:inherit;font-size:.76rem;font-weight:600;}
#pi-panel .pi-confirm-no{border:1px solid var(--pi-border);border-radius:6px;background:transparent;color:var(--pi-theme);padding:.28rem .6rem;cursor:pointer;font:inherit;font-size:.76rem;}
#pi-panel .pi-comment-body{font-size:.88rem;white-space:pre-wrap;word-break:break-word;}
#pi-panel .pi-empty{color:var(--pi-muted);font-size:.85rem;text-align:center;padding:1.5rem 0;}
#pi-panel .pi-form{flex-shrink:0;display:flex;align-items:stretch;gap:.5rem;padding:.7rem 1.1rem;border-top:1px solid var(--pi-border);}
#pi-panel .pi-ta{flex:1;height:38px;box-sizing:border-box;padding:.5rem .7rem;border:1px solid var(--pi-border);border-radius:8px;background:color-mix(in srgb, var(--pi-theme) 7%, transparent);font:inherit;font-size:.88rem;color:var(--pi-text);resize:none;touch-action:auto;}
#pi-panel .pi-ta::placeholder{color:var(--pi-muted);}
#pi-panel .pi-submit{height:38px;width:38px;padding:0;border:none;border-radius:8px;background:var(--pi-theme);color:var(--pi-theme-fg);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}
.pi-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:3005;font-family:system-ui,sans-serif;}
.pi-modal-box{background:var(--pi-surface);border-radius:12px;padding:1.5rem;max-width:320px;text-align:center;color:var(--pi-text);box-shadow:0 8px 30px rgba(0,0,0,.3);}
.pi-modal-title{font-weight:600;margin:0 0 .5rem;font-size:1rem;}
.pi-modal-desc{color:var(--pi-muted);font-size:.9rem;margin:0 0 1rem;}
.pi-modal-row{display:flex;gap:.5rem;justify-content:center;}
.pi-modal-cancel{padding:.4rem 1rem;border:1px solid var(--pi-border);border-radius:8px;background:transparent;color:var(--pi-text);cursor:pointer;font:inherit;}
.pi-modal-go{padding:.4rem 1rem;border:none;border-radius:8px;background:var(--pi-theme);color:var(--pi-theme-fg);font:inherit;font-weight:600;cursor:pointer;}
/* PC：抽屉收窄并锚定右下角（移动端保持基础全宽 bottom sheet） */
@media (min-width:641px){
  #pi-panel{left:auto;right:1rem;width:min(92vw,420px);height:min(82vh,760px);}
}
`
  document.head.appendChild(style)

  // ── trigger arrow ──
  var trigger = document.createElement('button')
  trigger.id = 'pi-trigger'
  trigger.title = '互动'
  trigger.setAttribute('aria-label', '打开互动面板')
  trigger.innerHTML = ICONS.left
  trigger.addEventListener('click', togglePanel)
  document.documentElement.appendChild(trigger)

  // ── panel ──
  var panel = document.createElement('div')
  panel.id = 'pi-panel'

  // grabber: mobile bottom-sheet drag handle (iOS-style)
  var grabber = document.createElement('div')
  grabber.className = 'pi-grabber'
  panel.appendChild(grabber)

  // tabs
  var tabs = document.createElement('div')
  tabs.className = 'pi-tabs'
  var tabAuthor = makeTab('简介', 'author')
  var tabComments = makeTab('评论', 'comments')
  tabs.appendChild(tabAuthor)
  tabs.appendChild(tabComments)
  panel.appendChild(tabs)

  // 简介 body（自上而下：作者行 → 项目名 → 发布时间 → 描述 → 点赞/收藏/转发 → TA 的其他作品）
  var authorBody = document.createElement('div')
  authorBody.className = 'pi-body'
  authorBody.id = 'pi-body-author'
  var authorUserId = null

  // 1) 作者行：头像 + 名字/统计（x关注者 y作品）+ 关注按钮
  var authorRow = document.createElement('div')
  authorRow.className = 'pi-author-row'
  var avatarBox = document.createElement('span')
  avatarBox.className = 'pi-avatar'
  var authorMeta = document.createElement('div')
  authorMeta.className = 'pi-author-meta'
  var nameEl = document.createElement('div')
  nameEl.className = 'pi-name'
  var statsEl = document.createElement('div')
  statsEl.className = 'pi-stats'
  var followBtn = document.createElement('button')
  followBtn.type = 'button'
  followBtn.className = 'pi-follow'
  followBtn.textContent = '关注'
  followBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleFollow() })
  authorMeta.appendChild(nameEl)
  authorMeta.appendChild(statsEl)
  authorRow.appendChild(avatarBox)
  authorRow.appendChild(authorMeta)
  authorRow.appendChild(followBtn)
  // 点击作者信息栏 → 打开作者个人主页
  authorRow.addEventListener('click', function () {
    if (authorUserId) window.location.href = '/' + encodeURIComponent(authorUserId)
  })

  // 2/3/4) 项目名 / 发布时间 / 描述
  var projTitleEl = document.createElement('div')
  projTitleEl.className = 'pi-proj-title'
  var projTimeEl = document.createElement('div')
  projTimeEl.className = 'pi-proj-time'
  var projDescEl = document.createElement('div')
  projDescEl.className = 'pi-proj-desc'
  var tagsEl = document.createElement('div')
  tagsEl.className = 'pi-tags'

  // 5) 点赞/收藏/转发/举报（icon+数字上下居中；转发/举报仅图标，功能暂未实现）
  //    每个 action 都带 count 占位（转发/举报为空），保证 icon 严格同一排
  var actionsEl = document.createElement('div')
  actionsEl.className = 'pi-actions'
  var likeBtn = makeBtn('')
  var favBtn = makeBtn('')
  var shareBtn = makeBtn(SHARE_ICON + '<span class="pi-count"></span>')
  var reportBtn = makeBtn(REPORT_ICON + '<span class="pi-count"></span>')
  likeBtn.addEventListener('click', toggleLike)
  favBtn.addEventListener('click', toggleFavorite)
  actionsEl.appendChild(likeBtn)
  actionsEl.appendChild(favBtn)
  actionsEl.appendChild(shareBtn)
  actionsEl.appendChild(reportBtn)

  // 6) TA 的其他作品
  var worksTitle = document.createElement('div')
  worksTitle.className = 'pi-works-title'
  worksTitle.textContent = 'TA 的其他作品'
  var worksList = document.createElement('div')
  worksList.id = 'pi-works'

  authorBody.appendChild(authorRow)
  authorBody.appendChild(projTitleEl)
  authorBody.appendChild(projTimeEl)
  authorBody.appendChild(projDescEl)
  authorBody.appendChild(tagsEl)
  authorBody.appendChild(actionsEl)
  authorBody.appendChild(worksTitle)
  authorBody.appendChild(worksList)
  panel.appendChild(authorBody)

  // comments body
  var commentsBody = document.createElement('div')
  commentsBody.className = 'pi-body pi-comments'
  commentsBody.id = 'pi-body-comments'
  commentsBody.hidden = true
  var listWrap = document.createElement('div')
  listWrap.className = 'pi-comments-list'
  commentsBody.appendChild(listWrap)
  var listEl = document.createElement('div')
  listWrap.appendChild(listEl)
  var form = document.createElement('div')
  form.className = 'pi-form'
  var ta = document.createElement('textarea')
  ta.className = 'pi-ta'
  ta.placeholder = '写下你的评论…'
  ta.maxLength = 500
  ta.rows = 1
  var submitBtn = document.createElement('button')
  submitBtn.className = 'pi-submit'
  submitBtn.innerHTML = SEND_ICON
  submitBtn.title = '发表评论'
  submitBtn.type = 'button'
  submitBtn.addEventListener('click', submitComment)
  form.appendChild(ta)
  form.appendChild(submitBtn)
  commentsBody.appendChild(form)
  panel.appendChild(commentsBody)

  document.documentElement.appendChild(panel)

  function makeBtn(content) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = 'pi-action'
    b.innerHTML = content || ''
    return b
  }

  function makeTab(label, key) {
    var t = document.createElement('button')
    t.type = 'button'
    t.className = 'pi-tab'
    t.textContent = label
    t.addEventListener('click', function () { switchTab(key) })
    return t
  }

  function switchTab(key) {
    var isAuthor = key === 'author'
    tabAuthor.classList.toggle('on', isAuthor)
    tabComments.classList.toggle('on', !isAuthor)
    authorBody.hidden = !isAuthor
    commentsBody.hidden = isAuthor
  }

  // ── open / close ──
  function togglePanel() {
    OPEN = !OPEN
    panel.classList.toggle('open', OPEN)
    document.documentElement.classList.toggle('pi-open', OPEN)
    updateIcon()
  }

  // ── mobile bottom-sheet drag-to-dismiss (grabber) ──
  var dragStartY = 0
  var dragging = false
  grabber.addEventListener('pointerdown', function (e) {
    if (!OPEN) return
    dragging = true
    dragStartY = e.clientY
    panel.style.transition = 'none'
    try { grabber.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
    e.preventDefault()
  })
  grabber.addEventListener('pointermove', function (e) {
    if (!dragging) return
    var dy = e.clientY - dragStartY
    if (dy < 0) dy = 0
    panel.style.transform = 'translateY(' + dy + 'px)'
  })
  function endDrag(e) {
    if (!dragging) return
    dragging = false
    panel.style.transition = ''
    panel.style.transform = ''
    togglePanel() // 点击或拖动横杠都收起
  }
  grabber.addEventListener('pointerup', endDrag)
  grabber.addEventListener('pointercancel', endDrag)

  function updateIcon() {
    trigger.innerHTML = OPEN ? ICONS.down : ICONS.up
  }

  window.addEventListener('resize', updateIcon)

  // ── render ──
  function renderIntro() {
    var p = state.page
    projTitleEl.textContent = p && p.title ? p.title : ''
    // 时间行：眼睛icon 访问量 发布时间
    projTimeEl.innerHTML = ''
    var eye = document.createElement('span')
    eye.innerHTML = EYE_ICON
    var viewsEl = document.createElement('span')
    viewsEl.textContent = formatViews((p && p.view_count) || 0)
    var timeSpan = document.createElement('span')
    timeSpan.textContent = p && p.created_at ? formatDate(p.created_at) : ''
    projTimeEl.appendChild(eye)
    projTimeEl.appendChild(viewsEl)
    projTimeEl.appendChild(timeSpan)
    if (p && p.description) {
      projDescEl.textContent = p.description
      projDescEl.style.display = ''
    } else {
      projDescEl.textContent = ''
      projDescEl.style.display = 'none'
    }
    tagsEl.innerHTML = ''
    if (p && p.tags && p.tags.length) {
      tagsEl.style.display = ''
      p.tags.forEach(function (t) {
        var a = document.createElement('a')
        a.className = 'pi-tag'
        a.href = '/gallery?tag=' + encodeURIComponent(t)
        a.textContent = '#' + t
        a.title = '在作品广场搜索：' + t
        tagsEl.appendChild(a)
      })
    } else {
      tagsEl.style.display = 'none'
    }
    setLikeButton()
    setFavButton()
  }

  function setLikeButton() {
    likeBtn.innerHTML = (state.liked ? HEART_FILLED : HEART_ICON) + '<span class="pi-count">' + state.likeCount + '</span>'
    likeBtn.title = state.liked ? '取消点赞' : '点赞'
    likeBtn.classList.toggle('on', state.liked)
  }

  function setFavButton() {
    favBtn.innerHTML = (state.favorited ? STAR_FILLED : STAR_ICON) + '<span class="pi-count">' + state.favCount + '</span>'
    favBtn.title = state.favorited ? '取消收藏' : '收藏'
    favBtn.classList.toggle('on', state.favorited)
  }

  function renderAuthor() {
    var p = state.page
    if (!p || !p.author) return
    var author = p.author
    var displayName = author.nickname || author.user_id || '匿名'
    nameEl.textContent = displayName
    authorUserId = author.user_id || null
    if (author.avatar_url) {
      if (avatarBox.tagName !== 'IMG') {
        var img = document.createElement('img')
        img.className = 'pi-avatar'
        avatarBox.replaceWith(img)
        avatarBox = img
      }
      avatarBox.src = author.avatar_url
      avatarBox.alt = ''
    } else {
      if (avatarBox.tagName === 'IMG') {
        var span = document.createElement('span')
        span.className = 'pi-avatar'
        avatarBox.replaceWith(span)
        avatarBox = span
      }
      avatarBox.textContent = displayName.slice(0, 1).toUpperCase()
    }
    // author's other published works — fetched separately
    if (author.user_id) {
      api('/api/users/' + encodeURIComponent(author.user_id)).then(function (d) {
        state.isFollowing = !!d.is_following
        state.followerCount = d.follower_count || 0
        state.worksCount = (d.pages || []).filter(function (wp) { return wp.is_published }).length
        renderFollow()
        renderWorks((d.pages || []).filter(function (wp) {
          return wp.is_published && wp.page_id && wp.page_id !== p.page_id
        }), author.user_id)
      }).catch(function () {})
    }
  }

  function renderWorks(works, authorId) {
    worksList.innerHTML = ''
    if (!works.length) {
      var empty = document.createElement('p')
      empty.className = 'pi-empty'
      empty.textContent = 'TA 暂无其他已发布作品'
      worksList.appendChild(empty)
      return
    }
    works.forEach(function (w) {
      var a = document.createElement('a')
      a.className = 'pi-work'
      a.href = '/' + encodeURIComponent(authorId) + '/' + encodeURIComponent(w.page_id)
      a.target = '_blank'
      a.rel = 'noopener noreferrer'

      if (w.cover_url) {
        var cover = document.createElement('img')
        cover.className = 'pi-work-cover'
        cover.alt = ''
        cover.src = w.cover_url
        a.appendChild(cover)
      } else {
        // 无封面 → 与个人页一致的文件图标占位
        var ph = document.createElement('span')
        ph.className = 'pi-work-cover'
        ph.innerHTML = FILE_ICON
        a.appendChild(ph)
      }
      var meta = document.createElement('div')
      meta.className = 'pi-work-meta'
      var name = document.createElement('div')
      name.className = 'pi-work-name'
      name.textContent = w.title || '未命名'
      var url = document.createElement('div')
      url.className = 'pi-work-url'
      url.textContent = '/' + authorId + '/' + w.page_id
      meta.appendChild(name)
      meta.appendChild(url)

      a.appendChild(meta)
      worksList.appendChild(a)
    })
  }

  function renderComments() {
    listEl.innerHTML = ''
    if (!state.comments.length) {
      var empty = document.createElement('p')
      empty.className = 'pi-empty'
      empty.textContent = '还没有评论，来抢沙发～'
      listEl.appendChild(empty)
      return
    }
    state.comments.forEach(function (c) {
      var user = c.user || {}
      var displayName = user.nickname || user.user_id || '匿名'
      var item = document.createElement('div')
      item.className = 'pi-comment'
      // 左侧头像（无头像用首字母；有 user_id 时可点击进入主页）
      var avatar = document.createElement('span')
      avatar.className = 'pi-comment-avatar'
      if (user.avatar_url) {
        avatar = document.createElement('img')
        avatar.className = 'pi-comment-avatar'
        avatar.src = user.avatar_url
        avatar.alt = ''
      } else {
        avatar.textContent = displayName.slice(0, 1).toUpperCase()
      }
      if (user.user_id) {
        var avatarLink = document.createElement('a')
        avatarLink.className = 'pi-comment-avatar-link'
        avatarLink.href = '/' + encodeURIComponent(user.user_id)
        avatarLink.title = '查看 ' + displayName + ' 的主页'
        avatarLink.setAttribute('aria-label', displayName + ' 的主页')
        avatarLink.appendChild(avatar)
        avatar = avatarLink
      }
      // 右侧：上 = 用户名（可点击进主页），下 = 内容
      var main = document.createElement('div')
      main.className = 'pi-comment-main'
      var headRow = document.createElement('div')
      headRow.className = 'pi-comment-head'
      var name = document.createElement(user.user_id ? 'a' : 'span')
      name.className = 'pi-comment-name'
      if (user.user_id) name.href = '/' + encodeURIComponent(user.user_id)
      name.textContent = displayName
      var right = document.createElement('span')
      right.style.cssText = 'display:flex;align-items:center;flex-shrink:0;'
      var time = document.createElement('span')
      time.className = 'pi-comment-time'
      time.textContent = formatTime(c.created_at)
      right.appendChild(time)
      headRow.appendChild(name)
      headRow.appendChild(right)
      // 删除按钮：评论块右侧、垂直居中（仅自己评论）
      var del = null
      if (c.is_mine) {
        del = document.createElement('button')
        del.className = 'pi-comment-del'
        del.type = 'button'
        del.title = '删除评论'
        del.innerHTML = TRASH_ICON
        del.addEventListener('click', function (e) {
          e.stopPropagation()
          showDeleteConfirm(c, del)
        })
      }
      var body = document.createElement('div')
      body.className = 'pi-comment-body'
      body.textContent = c.content // XSS-safe
      main.appendChild(headRow)
      main.appendChild(body)
      item.appendChild(avatar)
      item.appendChild(main)
      if (del) item.appendChild(del)
      listEl.appendChild(item)
    })
  }

  function renderFollow() {
    statsEl.innerHTML = ''
    var f = document.createElement('span')
    f.textContent = state.followerCount + ' 关注者'
    var w = document.createElement('span')
    w.textContent = state.worksCount + ' 作品'
    statsEl.appendChild(f)
    statsEl.appendChild(w)
    if (state.viewerIsSelf || !state.page || !state.page.author) {
      followBtn.style.display = 'none'
      return
    }
    followBtn.style.display = ''
    followBtn.textContent = state.isFollowing ? '已关注' : '关注'
    followBtn.classList.toggle('on', state.isFollowing)
  }

  function toggleFollow() {
    if (requireLogin()) return
    var authorId = state.page && state.page.author ? state.page.author.user_id : ''
    if (!authorId) return
    var prevFollowing = state.isFollowing
    var prevCount = state.followerCount
    state.isFollowing = !prevFollowing
    state.followerCount = state.isFollowing ? prevCount + 1 : Math.max(0, prevCount - 1)
    renderFollow()
    api('/api/users/' + encodeURIComponent(authorId) + '/follow', { method: prevFollowing ? 'DELETE' : 'POST' }).then(function (d) {
      state.isFollowing = !!d.is_following
      state.followerCount = d.follower_count || 0
      renderFollow()
    }).catch(function () {
      state.isFollowing = prevFollowing
      state.followerCount = prevCount
      renderFollow()
    })
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString('zh-CN', { hour12: false })
    } catch (e) {
      return iso || ''
    }
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso)
      var y = d.getFullYear()
      var m = d.getMonth() + 1
      var day = d.getDate()
      var hh = String(d.getHours()).padStart(2, '0')
      var mm = String(d.getMinutes()).padStart(2, '0')
      return y + '年' + m + '月' + day + '日 ' + hh + ':' + mm
    } catch (e) {
      return iso || ''
    }
  }

  function formatViews(n) {
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
    return String(n)
  }

  // ── actions ──
  function requireLogin() {
    if (!getToken()) { showLoginModal(); return true }
    return false
  }

  function toggleLike() {
    if (requireLogin()) return
    var prev = state.liked
    state.liked = !prev
    state.likeCount += state.liked ? 1 : -1
    setLikeButton()
    api('/api/pages/' + pk + '/like', { method: 'POST' }).then(function (d) {
      state.liked = d.state
      state.likeCount = d.count
      setLikeButton()
    }).catch(function () {
      state.liked = prev
      state.likeCount = prev ? 1 : 0
      setLikeButton()
    })
  }

  function toggleFavorite() {
    if (requireLogin()) return
    var prev = state.favorited
    state.favorited = !prev
    state.favCount += state.favorited ? 1 : -1
    setFavButton()
    api('/api/pages/' + pk + '/favorite', { method: 'POST' }).then(function (d) {
      state.favorited = d.state
      state.favCount = d.count
      setFavButton()
    }).catch(function () {
      state.favorited = prev
      state.favCount = prev ? 1 : 0
      setFavButton()
    })
  }

  function submitComment() {
    if (requireLogin()) return
    var text = (ta.value || '').trim()
    if (!text) return
    submitBtn.disabled = true
    submitBtn.innerHTML = '…'
    api('/api/pages/' + pk + '/comments', { method: 'POST', body: { content: text } }).then(function (c) {
      state.comments.unshift(c)
      renderComments()
      ta.value = ''
    }).catch(function () {}).finally(function () {
      submitBtn.disabled = false
      submitBtn.innerHTML = SEND_ICON
    })
  }

  function deleteComment(id) {
    api('/api/pages/' + pk + '/comments/' + id, { method: 'DELETE' }).then(function () {
      state.comments = state.comments.filter(function (c) { return c.id !== id })
      renderComments()
    }).catch(function () {})
  }

  // 删除评论的局部确认弹窗（锚定在评论条上，非全局遮罩）
  function showDeleteConfirm(comment, anchorBtn) {
    // 先关闭可能已存在的确认条
    var prev = document.querySelector('.pi-confirm')
    if (prev) prev.remove()

    var item = anchorBtn.closest('.pi-comment')
    if (!item) return

    var pop = document.createElement('div')
    pop.className = 'pi-confirm'
    pop.textContent = '删除这条评论？'
    var yes = document.createElement('button')
    yes.type = 'button'
    yes.className = 'pi-confirm-yes'
    yes.textContent = '删除'
    yes.addEventListener('click', function (e) {
      e.stopPropagation()
      pop.remove()
      deleteComment(comment.id)
    })
    var no = document.createElement('button')
    no.type = 'button'
    no.className = 'pi-confirm-no'
    no.textContent = '取消'
    no.addEventListener('click', function (e) { e.stopPropagation(); pop.remove() })
    pop.appendChild(yes)
    pop.appendChild(no)
    item.appendChild(pop)

    // 点击弹窗外部任意处 → 关闭（延时绑定，避免吞掉本次触发的 click）
    setTimeout(function () {
      document.addEventListener('click', function handler(e) {
        if (!document.contains(pop)) { document.removeEventListener('click', handler); return }
        if (e.target.closest && e.target.closest('.pi-confirm')) return
        pop.remove()
        document.removeEventListener('click', handler)
      })
    }, 0)
  }

  // ── login modal ──
  function showLoginModal() {
    var existing = document.getElementById('pi-login-modal')
    if (existing) return
    var overlayBox = document.createElement('div')
    overlayBox.id = 'pi-login-modal'
    overlayBox.className = 'pi-modal'
    var box = document.createElement('div')
    box.className = 'pi-modal-box'
    var title = document.createElement('p')
    title.className = 'pi-modal-title'
    title.textContent = '当前未登录'
    var desc = document.createElement('p')
    desc.className = 'pi-modal-desc'
    desc.textContent = '登录后可点赞、收藏、评论。'
    var row = document.createElement('div')
    row.className = 'pi-modal-row'
    var cancel = document.createElement('button')
    cancel.className = 'pi-modal-cancel'
    cancel.textContent = '取消'
    cancel.type = 'button'
    cancel.addEventListener('click', function () { overlayBox.remove() })
    var confirmBtn = document.createElement('button')
    confirmBtn.className = 'pi-modal-go'
    confirmBtn.textContent = '去登录'
    confirmBtn.type = 'button'
    confirmBtn.addEventListener('click', function () {
      var redirect = encodeURIComponent(location.pathname + location.search)
      location.href = '/login?redirect=' + redirect
    })
    row.appendChild(cancel)
    row.appendChild(confirmBtn)
    box.appendChild(title)
    box.appendChild(desc)
    box.appendChild(row)
    overlayBox.appendChild(box)
    document.documentElement.appendChild(overlayBox)
  }

  // ── init ──
  switchTab('author')
  updateIcon()
  api('/api/pages/' + pk + '/interactions').then(function (d) {
    state.likeCount = d.like_count || 0
    state.favCount = d.favorite_count || 0
    state.comments = d.comments || []
    state.page = d.page || null
    if (d.viewer) {
      state.liked = !!d.viewer.liked
      state.favorited = !!d.viewer.favorited
      state.viewerIsSelf = !!d.viewer.is_self
    }
    renderIntro()
    renderAuthor()
    renderComments()
  }).catch(function () {
    /* 加载失败则保持静默，不打扰页面 */
  })
})()
