/* 授权页：自设(self) 的集中管理页
   自己做的模型不计入「接单」，统一放在这里：上传展示图、勾发布平台、授权后转粉色(已收费)。
   页面分为「已授权」与「未授权」两个分区；授权收入计入本月收入。 */
(function(){
function isDone(o){ return !!o.end; }
function shareOf(o){ return o.share||{xhs:false, dy:false, xy:false}; }
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
    ? '<img src="'+o.pic+'" onclick="Views.order.big(\''+o.id+'\')" style="width:64px;height:64px;object-fit:cover;border-radius:14px;flex:0 0 auto;cursor:pointer">'
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

Views.auth = { render: function(root){
  var orders = (SH.S.orders||[]).slice();
  /* 已移入配件库的自设模型：在配件库里管理，这里不再显示 */
  var inAcc = {};
  (SH.S.accessories||[]).forEach(function(a){ if(a.sourceId) inAcc[a.sourceId]=true; });
  var list = orders.filter(function(o){ return o.type==='self' && !inAcc[o.id]; });

  var authed   = list.filter(function(o){ return o.authorized; });
  var unauthed = list.filter(function(o){ return !o.authorized; });
  var making   = unauthed.filter(function(o){ return !isDone(o); }).length;
  var unpaid   = unauthed.filter(function(o){ return isDone(o); }).length;

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
      arr.map(card).join('')+
    '</div>';
  }

  root.innerHTML =
  '<div class="vhead">'+SH.icon('tag')+'<h2>授权</h2>'+
  '<div class="right"><button class="clay-btn mini" onclick="Views.order.addSelf()">'+SH.icon('plus','white')+'添加自设模型</button></div></div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v" style="color:var(--ac-d)">'+authed.length+'</div><div class="l">已授权</div></div>'+
    '<div class="stat"><div class="v" style="color:var(--gr-d)">'+unpaid+'</div><div class="l">待授权</div></div>'+
    '<div class="stat"><div class="v">'+making+'</div><div class="l">制作中</div></div>'+
    '<div class="stat"><div class="v">'+list.length+'</div><div class="l">自设总数</div></div>'+
  '</div>'+
  '<div class="clay-card sm"><p class="hint">这里汇集<b>自设的模型</b>（不算接单）。上传展示图、勾选已发布的平台，授权拿到钱后点「标记授权」即可转粉色（已授权）。授权收入会自动计入首页的<b>本月收入</b>。已收进配件库的自设模型会自动从这里移出。</p></div>'+
  section('已授权', '已收费 ¥'+authed.reduce(function(s,o){return s+(+o.authFee||0);},0), authed, 'authed')+
  section('未授权', making?('制作中 '+making+' · 待授权 '+unpaid):'', unauthed, 'unauth')+
  (list.length===0 ? '<div class="clay-card"><p class="empty">还没有自设模型。点右上角「添加自设模型」把做好的模型收进来吧～</p></div>' : '')+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 跟 '+SH.esc(SH.vName())+' 说「自设了个OC，发小红书了」会自动建一张；说「XX 授权了，到手 800」会自动记收入并转粉色。</p></div>';
},

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
