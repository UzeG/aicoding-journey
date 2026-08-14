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

  // 抽屉跟随「当前用户」的主题（与应用 UI 一致）——读 App 缓存在 localStorage 的 manifest.theme
  function applyTheme(hex) {
    if (hex && HEX_RE.test(hex)) {
      document.documentElement.style.setProperty('--pi-theme', hex)
    }
  }
  var cachedTheme = null
  try { cachedTheme = localStorage.getItem('manifest.theme') } catch (e) { cachedTheme = null }
  applyTheme(cachedTheme)
  var OPEN = false
  var state = { liked: false, favorited: false, likeCount: 0, favCount: 0, comments: [], page: null }

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

  var isMobile = function () {
    return window.matchMedia('(max-width: 640px)').matches
  }

  // ── styles ──
  var style = document.createElement('style')
  style.textContent = `
:root{--pi-theme:#0E7A6C;}
#pi-trigger{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:2147483004;width:30px;height:76px;border:none;background:var(--pi-theme);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:12px 0 0 12px;box-shadow:-2px 0 10px rgba(0,0,0,.22);}
#pi-trigger:hover{filter:brightness(.9);}
#pi-panel{position:fixed;right:0;top:50%;transform:translate(100%,-50%);z-index:2147483002;width:min(90vw,400px);height:min(88vh,880px);background:var(--pi-theme);border-radius:1rem 0 0 1rem;box-shadow:-8px 0 30px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;color:#fff;transition:transform .3s ease;}
#pi-panel.open{transform:translate(0,-50%);}
#pi-panel .pi-head{display:flex;align-items:center;gap:.8rem;padding:.8rem 1.1rem;border-bottom:1px solid rgba(255,255,255,.15);flex-shrink:0;}
#pi-panel .pi-title{font-weight:600;font-size:1rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
#pi-panel .pi-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .85rem;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(255,255,255,.12);cursor:pointer;font:inherit;font-size:.85rem;color:#fff;white-space:nowrap;flex-shrink:0;}
#pi-panel .pi-btn.on{background:#fff;color:var(--pi-theme);border-color:#fff;}
#pi-panel .pi-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.15);flex-shrink:0;}
#pi-panel .pi-tab{flex:1;padding:.7rem .5rem;background:none;border:none;font:inherit;cursor:pointer;color:rgba(255,255,255,.7);border-bottom:2px solid transparent;}
#pi-panel .pi-tab.on{color:#fff;border-bottom-color:#fff;font-weight:600;}
#pi-panel .pi-body{flex:1;overflow-y:auto;padding:1rem 1.1rem;}
#pi-panel .pi-body[hidden]{display:none;}
/* author tab */
#pi-panel .pi-author{display:flex;align-items:center;gap:.8rem;padding-bottom:.9rem;border-bottom:1px solid rgba(255,255,255,.15);margin-bottom:1rem;}
#pi-panel .pi-avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:1.3rem;color:#fff;}
#pi-panel .pi-author-meta{min-width:0;}
#pi-panel .pi-name{font-weight:600;font-size:1.05rem;}
#pi-panel .pi-id{font-size:.82rem;color:rgba(255,255,255,.75);}
#pi-panel .pi-bio{font-size:.85rem;color:rgba(255,255,255,.85);margin-top:.15rem;white-space:pre-wrap;word-break:break-word;}
#pi-panel .pi-works-title{font-weight:600;font-size:.92rem;margin-bottom:.6rem;color:rgba(255,255,255,.9);}
#pi-panel .pi-work{display:flex;align-items:center;gap:.7rem;padding:.5rem .6rem;border-radius:10px;text-decoration:none;color:#fff;margin-bottom:.4rem;}
#pi-panel .pi-work:hover{background:rgba(255,255,255,.12);}
#pi-panel .pi-work-cover{width:56px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.7);font-size:.6rem;}
#pi-panel .pi-work-meta{min-width:0;}
#pi-panel .pi-work-name{font-size:.9rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#pi-panel .pi-work-url{font-size:.78rem;color:rgba(255,255,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* comments */
#pi-panel .pi-comment{border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:.6rem .8rem;margin-bottom:.6rem;background:rgba(255,255,255,.12);}
#pi-panel .pi-comment-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem;}
#pi-panel .pi-comment-name{font-weight:600;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#pi-panel .pi-comment-time{color:rgba(255,255,255,.6);font-size:.72rem;margin-left:.5rem;}
#pi-panel .pi-comment-del{background:none;border:none;color:rgba(255,255,255,.85);font-size:.72rem;cursor:pointer;padding:0 .2rem;}
#pi-panel .pi-comment-body{font-size:.88rem;white-space:pre-wrap;word-break:break-word;}
#pi-panel .pi-empty{color:rgba(255,255,255,.7);font-size:.85rem;text-align:center;padding:1.5rem 0;}
#pi-panel .pi-form{margin-top:.6rem;}
#pi-panel .pi-ta{width:100%;box-sizing:border-box;padding:.55rem .7rem;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(255,255,255,.15);font:inherit;font-size:.88rem;color:#fff;resize:vertical;}
#pi-panel .pi-ta::placeholder{color:rgba(255,255,255,.6);}
#pi-panel .pi-submit{margin-top:.45rem;padding:.4rem 1rem;border:none;border-radius:8px;background:#fff;color:var(--pi-theme);cursor:pointer;font:inherit;font-size:.88rem;font-weight:600;}
.pi-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:2147483005;font-family:system-ui,sans-serif;}
.pi-modal-box{background:var(--pi-theme);border-radius:12px;padding:1.5rem;max-width:320px;text-align:center;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.3);}
.pi-modal-title{font-weight:600;margin:0 0 .5rem;font-size:1rem;}
.pi-modal-desc{color:rgba(255,255,255,.8);font-size:.9rem;margin:0 0 1rem;}
.pi-modal-row{display:flex;gap:.5rem;justify-content:center;}
.pi-modal-cancel{padding:.4rem 1rem;border:1px solid rgba(255,255,255,.4);border-radius:8px;background:transparent;color:#fff;cursor:pointer;font:inherit;}
.pi-modal-go{padding:.4rem 1rem;border:none;border-radius:8px;background:#fff;color:var(--pi-theme);font:inherit;font-weight:600;cursor:pointer;}
@media (max-width:640px){
  #pi-trigger{right:1rem;bottom:1.2rem;top:auto;transform:none;width:44px;height:44px;border-radius:50%;box-shadow:0 2px 14px rgba(0,0,0,.35);}
  #pi-panel{right:0;left:0;bottom:0;top:auto;transform:translateY(100%);width:100%;height:78vh;border-radius:1rem 1rem 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.25);}
  #pi-panel.open{transform:translateY(0);}
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

  // head: current work title + like/favorite
  var head = document.createElement('div')
  head.className = 'pi-head'
  var titleEl = document.createElement('div')
  titleEl.className = 'pi-title'
  var likeBtn = makeBtn('♡ 点赞')
  var favBtn = makeBtn('☆ 收藏')
  likeBtn.addEventListener('click', toggleLike)
  favBtn.addEventListener('click', toggleFavorite)
  head.appendChild(titleEl)
  head.appendChild(likeBtn)
  head.appendChild(favBtn)
  panel.appendChild(head)

  // tabs
  var tabs = document.createElement('div')
  tabs.className = 'pi-tabs'
  var tabAuthor = makeTab('作者', 'author')
  var tabComments = makeTab('评论', 'comments')
  tabs.appendChild(tabAuthor)
  tabs.appendChild(tabComments)
  panel.appendChild(tabs)

  // author body
  var authorBody = document.createElement('div')
  authorBody.className = 'pi-body'
  authorBody.id = 'pi-body-author'
  var authorCard = document.createElement('div')
  authorCard.className = 'pi-author'
  var avatarBox = document.createElement('span')
  avatarBox.className = 'pi-avatar'
  var authorMeta = document.createElement('div')
  authorMeta.className = 'pi-author-meta'
  var nameEl = document.createElement('div')
  nameEl.className = 'pi-name'
  var idEl = document.createElement('div')
  idEl.className = 'pi-id'
  var bioEl = document.createElement('div')
  bioEl.className = 'pi-bio'
  authorMeta.appendChild(nameEl)
  authorMeta.appendChild(idEl)
  authorMeta.appendChild(bioEl)
  authorCard.appendChild(avatarBox)
  authorCard.appendChild(authorMeta)
  var worksTitle = document.createElement('div')
  worksTitle.className = 'pi-works-title'
  worksTitle.textContent = 'TA 的其他作品'
  var worksList = document.createElement('div')
  worksList.id = 'pi-works'
  authorBody.appendChild(authorCard)
  authorBody.appendChild(worksTitle)
  authorBody.appendChild(worksList)
  panel.appendChild(authorBody)

  // comments body
  var commentsBody = document.createElement('div')
  commentsBody.className = 'pi-body'
  commentsBody.id = 'pi-body-comments'
  commentsBody.hidden = true
  var listEl = document.createElement('div')
  commentsBody.appendChild(listEl)
  var form = document.createElement('div')
  form.className = 'pi-form'
  var ta = document.createElement('textarea')
  ta.className = 'pi-ta'
  ta.placeholder = '写下你的评论…'
  ta.maxLength = 500
  ta.rows = 2
  var submitBtn = document.createElement('button')
  submitBtn.className = 'pi-submit'
  submitBtn.textContent = '发表评论'
  submitBtn.type = 'button'
  submitBtn.addEventListener('click', submitComment)
  form.appendChild(ta)
  form.appendChild(submitBtn)
  commentsBody.appendChild(form)
  panel.appendChild(commentsBody)

  document.documentElement.appendChild(panel)

  function makeBtn(label) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = 'pi-btn'
    b.textContent = label
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
    updateIcon()
  }

  function updateIcon() {
    var key = OPEN ? (isMobile() ? 'down' : 'right') : (isMobile() ? 'up' : 'left')
    trigger.innerHTML = ICONS[key]
  }

  window.addEventListener('resize', updateIcon)

  // ── render ──
  function renderHead() {
    var p = state.page
    titleEl.textContent = p && p.title ? p.title : ''
    titleEl.title = p && p.title ? p.title : ''
    setLikeButton()
    setFavButton()
  }

  function setLikeButton() {
    likeBtn.textContent = (state.liked ? '♥ 已赞' : '♡ 点赞') + ' ' + state.likeCount
    likeBtn.classList.toggle('on', state.liked)
  }

  function setFavButton() {
    favBtn.textContent = (state.favorited ? '★ 已收藏' : '☆ 收藏') + ' ' + state.favCount
    favBtn.classList.toggle('on', state.favorited)
  }

  function renderAuthor() {
    var p = state.page
    if (!p || !p.author) return
    var author = p.author
    var displayName = author.nickname || author.user_id || '匿名'
    nameEl.textContent = displayName
    idEl.textContent = '@' + (author.user_id || '')
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
      var item = document.createElement('div')
      item.className = 'pi-comment'
      var headRow = document.createElement('div')
      headRow.className = 'pi-comment-head'
      var name = document.createElement('span')
      name.className = 'pi-comment-name'
      name.textContent = (c.user && (c.user.nickname || c.user.user_id)) || '匿名'
      var right = document.createElement('span')
      right.style.cssText = 'display:flex;align-items:center;flex-shrink:0;'
      var time = document.createElement('span')
      time.className = 'pi-comment-time'
      time.textContent = formatTime(c.created_at)
      right.appendChild(time)
      if (c.is_mine) {
        var del = document.createElement('button')
        del.className = 'pi-comment-del'
        del.textContent = '删除'
        del.type = 'button'
        del.addEventListener('click', function () { deleteComment(c.id) })
        right.appendChild(del)
      }
      headRow.appendChild(name)
      headRow.appendChild(right)
      var body = document.createElement('div')
      body.className = 'pi-comment-body'
      body.textContent = c.content // XSS-safe
      item.appendChild(headRow)
      item.appendChild(body)
      listEl.appendChild(item)
    })
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString('zh-CN', { hour12: false })
    } catch (e) {
      return iso || ''
    }
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
    submitBtn.textContent = '发布中…'
    api('/api/pages/' + pk + '/comments', { method: 'POST', body: { content: text } }).then(function (c) {
      state.comments.unshift(c)
      renderComments()
      ta.value = ''
    }).catch(function () {}).finally(function () {
      submitBtn.disabled = false
      submitBtn.textContent = '发表评论'
    })
  }

  function deleteComment(id) {
    api('/api/pages/' + pk + '/comments/' + id, { method: 'DELETE' }).then(function () {
      state.comments = state.comments.filter(function (c) { return c.id !== id })
      renderComments()
    }).catch(function () {})
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
    }
    renderHead()
    renderAuthor()
    renderComments()
  }).catch(function () {
    /* 加载失败则保持静默，不打扰页面 */
  })
})()
