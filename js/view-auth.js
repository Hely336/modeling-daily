/* 授权页：自设(self) 的集中管理页
   自己做的模型不计入「接单」，统一放在这里：上传展示图、勾发布平台、授权后转粉色(已收费)。
   页面分为「已授权」与「未授权」两个分区；授权收入计入本月收入。 */
(function(){
function isDone(o){ return !!o.end; }
function shareOf(o){ return o.share||{xhs:false, dy:false, xy:false}; }
function isGroup(o){ return Array.isArray(o.models) && o.models.length>0; }
function groupAuth(o){
  var m = o.models, n = m.length;
  var done = m.filter(function(x){ return x.authorized; }).length;
  var sum = m.reduce(function(s,x){ return s + (x.authorized ? (+x.authFee||0) : 0); }, 0);
  return { n:n, done:done, sum:sum, all: done===n };
}
function statusOf(o){
  if(!isDone(o)) return {cls:'pill-amber', txt:'制作中'};
  if(o.authorized) return {cls:'pill-paid', txt:'已授权 ¥'+(o.authFee||0)};
  return {cls:'pill-unpaid', txt:'待授权'};
}

/* 单张模型卡（两分区共用） */
function card(o){
  var st = statusOf(o);
  var sh = shareOf(o);
  var pc = (!isDone(o)) ? 'pcard' : (o.authorized ? 'pcard paid' : 'pcard unpaid');
  var pic = o.pic
    ? '<img '+SH.picAttr(o.pic)+' onclick="Views.order.big(\''+o.id+'\')" style="width:64px;height:64px;object-fit:cover;border-radius:14px;flex:0 0 auto;cursor:pointer">'
    : '<div onclick="Views.order.edit(\''+o.id+'\')" style="width:64px;height:64px;border-radius:14px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--p50);box-shadow:var(--sh-in-s);color:var(--p300);font-size:11px;text-align:center;cursor:pointer">未传<br>展示图</div>';
  var plats = [['xhs','小红书'],['dy','抖音'],['xy','闲鱼']].map(function(m){
    return '<span class="shchk '+(sh[m[0]]?'on':'')+'" onclick="Views.auth.toggleShare(\''+o.id+'\',\''+m[0]+'\',this)">'+m[1]+'</span>';
  }).join('');
  return '<div class="clay-card '+pc+'">'+
    '<div class="row">'+pic+'<div class="grow">'+
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="color:var(--p700)">'+SH.esc(o.name||'未命名模型')+'</b>'+
        '<span class="pill '+st.cls+'">'+st.txt+'</span>'+
        '<span class="pill pill-self">自设</span>'+
        (o.category?'<span class="pill pill-cat">'+SH.esc(o.category)+'</span>':'')+
      '</div>'+
      '<div class="sub">'+(o.end?('结单 '+SH.esc(o.end)):'制作中…')+(o.authorized?(' · 授权 '+(o.authDate||o.end||'')):'')+'</div>'+
    '</div></div>'+
    '<div class="shrow" style="margin-top:10px"><span class="shlbl">已发布平台</span>'+plats+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'+
      (isDone(o) && !o.authorized ? '<button class="clay-btn mini" style="color:var(--gr-d)" onclick="Views.order.authorize(\''+o.id+'\')">'+SH.icon('tag')+'标记授权</button>' : '')+
      '<button class="clay-btn mini ghost" onclick="Views.order.edit(\''+o.id+'\')">编辑</button>'+
      '<button class="clay-btn mini ghost" style="margin-left:auto" onclick="Views.order.del(\''+o.id+'\')">'+SH.icon('trash')+'</button>'+
    '</div>'+
  '</div>';
}

/* 一组模型（含多个子模型）卡片：整组状态 + 整组一次性授权 */
function groupCard(o){
  var gi = groupAuth(o);
  var pc = o.authorized ? 'pcard paid' : 'pcard unpaid';
  var statusTxt = o.authorized ? ('已授权 ¥'+(+o.authFee||0)) : ('未授权 · 共 '+gi.n+' 个');
  var statusCls = o.authorized ? 'pill-paid' : 'pill-unpaid';
  var modelsHtml = o.models.map(function(m){
    var mp = m.pic
      ? '<img '+SH.picAttr(m.pic)+' onclick="Views.order.bigModel(\''+o.id+'\',\''+m.id+'\')" style="width:48px;height:48px;object-fit:cover;border-radius:12px;flex:0 0 auto;cursor:pointer">'
      : '<div style="width:48px;height:48px;border-radius:12px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--p50);color:var(--p300);font-size:10px;text-align:center">无图</div>';
    return '<div class="clay-card" style="margin-top:10px">'+
      '<div class="row">'+mp+'<div class="grow">'+
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="color:var(--p700)">'+SH.esc(m.name||'子模型')+'</b>'+
          (o.authorized ? '<span class="pill pill-paid">已授权</span>' : '')+
        '</div>'+
        '<div class="sub">'+(o.authorized?'整组已授权':'待整组授权')+'</div>'+
      '</div></div>'+
    '</div>';
  }).join('');
  return '<div class="clay-card '+pc+'">'+
    '<div class="row"><div class="grow">'+
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="color:var(--p700);font-size:16px">'+SH.esc(o.name||'未命名模型组')+'</b>'+
        '<span class="pill '+statusCls+'">'+statusTxt+'</span>'+
        '<span class="pill pill-self">自设组</span>'+
        (o.category?'<span class="pill pill-cat">'+SH.esc(o.category)+'</span>':'')+
      '</div>'+
      '<div class="sub">共 '+gi.n+' 个模型'+(o.authorized?('，授权收入 ¥'+(+o.authFee||0)):'，整组一次性授权、统一计费')+'</div>'+
    '</div></div>'+
    modelsHtml+
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'+
      (isDone(o) && !o.authorized ? '<button class="clay-btn mini" style="color:var(--gr-d)" onclick="Views.order.authorize(\''+o.id+'\')">'+SH.icon('tag')+'标记授权</button>' : '')+
      '<button class="clay-btn mini ghost" onclick="Views.order.edit(\''+o.id+'\')">编辑</button>'+
      '<button class="clay-btn mini ghost" style="margin-left:auto" onclick="Views.order.del(\''+o.id+'\')">'+SH.icon('trash')+'</button>'+
    '</div>'+
  '</div>';
}

var filterAuth = 'all';
Views.auth = { render: function(root){
  var orders = (SH.S.orders||[]).slice();
  /* 已移入配件库的自设模型：在配件库里管理，这里不再显示 */
  var inAcc = {};
  (SH.S.accessories||[]).forEach(function(a){ if(a.sourceId) inAcc[a.sourceId]=true; });
  var list = orders.filter(function(o){ return o.type==='self' && !inAcc[o.id]; });

  var authed   = list.filter(function(o){ return o.authorized; });
  var unauthed = list.filter(function(o){ return !o.authorized; });
  var making   = unauthed.filter(function(o){ return !isDone(o); }).length;
  var unpaid   = unauthed.length;

  /* 各分区按结单时间倒序（最近操作的在前） */
  authed.sort(function(a,b){
    var da=(a.authDate||a.end||'0'), db=(b.authDate||b.end||'0');
    if(da!==db) return da<db?1:-1;
    return (a.created||'')<(b.created||'')?1:-1;
  });
  unauthed.sort(function(a,b){
    var da = a.end||'9999-99-99', db = b.end||'9999-99-99';
    if(da!==db) return da<db?1:-1;
    return (a.created||'')<(b.created||'')?1:-1;
  });

  function section(title, sub, arr, cls){
    if(!arr.length) return '';
    return '<div class="sect-block" style="margin-top:18px">'+
      '<div class="sect" style="margin-top:0">'+SH.icon(cls==='authed'?'check':'clock')+title+' <span class="hint">'+arr.length+'</span>'+
        (sub?'<span class="hint" style="margin-left:6px">'+sub+'</span>':'')+'</div>'+
      arr.map(function(o){ return isGroup(o) ? groupCard(o) : card(o); }).join('')+
    '</div>';
  }

  /* 顶部分类切换：全部 / 未授权 / 已授权 */
  var showAuthed = (filterAuth==='all' || filterAuth==='authed');
  var showUnauth = (filterAuth==='all' || filterAuth==='unauth');
  var body = '';
  if(list.length===0){
    body = '<div class="clay-card"><p class="empty">还没有自设模型。点右上角「添加自设模型」把做好的模型收进来吧～</p></div>';
  } else {
    if(showAuthed) body += section('已授权', '授权收入 ¥'+authed.reduce(function(s,o){return s+SH.modelIncome(o);},0), authed, 'authed');
    if(showUnauth) body += section('未授权', making?('制作中 '+making+' · 待授权 '+unpaid):'', unauthed, 'unauth');
    /* 当前分类下没有模型（比如切到「已授权」但还没授权过） */
    if((showAuthed?authed.length:0)+(showUnauth?unauthed.length:0)===0){
      body = '<div class="clay-card"><p class="empty">该分类下暂时没有模型～</p></div>';
    }
  }

  root.innerHTML =
  '<div class="vhead">'+SH.icon('tag')+'<h2>授权</h2>'+
  '<div class="right"><button class="clay-btn mini" onclick="Views.order.addSelf()">'+SH.icon('plus','white')+'添加自设模型</button></div></div>'+
  '<div class="seg">'+
    ['all','unauth','authed'].map(function(f){ return '<button class="'+(filterAuth===f?'on':'')+'" onclick="Views.auth.setFilterAuth(\''+f+'\')">'+(f==='all'?'全部':f==='unauth'?'未授权':'已授权')+'</button>'; }).join('')+
  '</div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v" style="color:var(--ac-d)">'+authed.length+'</div><div class="l">已授权</div></div>'+
    '<div class="stat"><div class="v" style="color:var(--gr-d)">'+unpaid+'</div><div class="l">待授权</div></div>'+
    '<div class="stat"><div class="v">'+making+'</div><div class="l">制作中</div></div>'+
    '<div class="stat"><div class="v">'+list.length+'</div><div class="l">自设总数</div></div>'+
  '</div>'+
  '<div class="clay-card sm"><p class="hint">这里汇集<b>自设的模型</b>（不算接单）。一组模型可在编辑时拆成多个子模型，<b>整组一次性「标记授权」、统一计费</b>；只要整组还没授权，就仍算「未授权」。整组授权后会立刻计入<b>本月收入</b>并转入「已授权」。已收进配件库的自设模型会自动从这里移出。</p></div>'+
  body +
  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 跟 '+SH.esc(SH.vName())+' 说「自设了个OC，发小红书了」会自动建一张；说「XX 授权了，到手 800」会自动记收入并转粉色。</p></div>';
},

setFilterAuth: function(f){ filterAuth = f; SH.refresh(); },

toggleShare: function(id, plat, el){
  var o = (SH.S.orders||[]).filter(function(x){return x.id===id;})[0];
  if(!o) return;
  if(!o.share) o.share = {xhs:false, dy:false, xy:false};
  o.share[plat] = !o.share[plat];
  SH.save();
  el.classList.toggle('on', o.share[plat]);
  SH.toast(o.share[plat] ? '已记录发布平台' : '已取消');
}};
})();
