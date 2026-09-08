/* 接单：客订 记录 · 排单 · 修改次数 · 结单 · 收尾款
   自设(self) 不在这里，统一归到「未授权库」(auth 页) 管理 */
(function(){
function d2n(s){ if(!s) return null; var d=new Date(s+'T00:00:00'); return isNaN(d.getTime())?null:d; }
/* 相差天数：b - a */
function diffDays(a,b){
  var da=d2n(a), db=d2n(b); if(!da||!db) return null;
  return Math.round((db-da)/86400000);
}
function isDone(o){ return !!o.end; }
/* 用时日长：结单->start~end；进行中->start~今天 */
function usedDays(o){ var d=diffDays(o.start, o.end||SH.today()); return d==null?null:Math.max(0,d); }
/* 距 deadline 剩余天数，负数=逾期 */
function leftDays(o){ if(!o.due) return null; return diffDays(SH.today(), o.due); }
function getOrders(){
  if(!SH.S.orders) SH.S.orders = [];
  return SH.S.orders;
}
function shareOf(o){ return (o && o.share)||{xhs:false, dy:false, xy:false}; }

/* 单张模型卡（仅客订） */
function card(o, num){
  var done = isDone(o);
  var paid = SH.modelPaid(o);
  var used = usedDays(o), left = leftDays(o);
  var statusBadge;
  if(!done){
    statusBadge = (left!=null && left<0)
      ? '<span class="pill pill-red">逾期 '+(-left)+' 天</span>'
      : '<span class="pill pill-amber">进行中</span>';
  } else {
    statusBadge = paid
      ? '<span class="pill pill-paid">已收费 ¥'+SH.modelIncome(o)+'</span>'
      : '<span class="pill pill-unpaid">未授权</span>';
  }
  var catBadge = o.category ? '<span class="pill pill-cat">'+SH.esc(o.category)+'</span>' : '';
  var shareHtml = SH.modelShareHtml(o);
  var picHtml = o.pic ? '<img src="'+o.pic+'" onclick="Views.order.big(\''+o.id+'\')" style="width:56px;height:56px;object-fit:cover;border-radius:16px;flex:0 0 auto;cursor:pointer">' : '';
  var leftTxt = '';
  if(!done && left!=null) leftTxt = left<0 ? '逾期 '+(-left)+' 天' : (left===0 ? '今天到期' : '剩 '+left+' 天');
  var pc = done ? (paid ? 'pcard paid' : 'pcard unpaid') : 'pcard';
  var feeLine = (o.client ? SH.esc(o.client) : '未填客户') + ' · <b style="color:var(--p600)">¥'+(+o.fee||0)+'</b>';
  return '<div class="clay-card '+pc+'">'+
    '<div class="row">'+(num?'<span class="seq">'+num+'</span>':'')+picHtml+'<div class="grow">'+
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="color:var(--p700)">'+SH.esc(o.name||'未命名模型')+'</b>'+statusBadge+catBadge+'</div>'+
      '<div class="sub">'+feeLine+'</div>'+
      '<div class="sub">'+SH.esc(o.start||'—')+(done&&o.end?' → 结单 '+SH.esc(o.end):'')+(o.due?' · 截止 '+SH.esc(o.due):'')+'</div>'+
      '<div class="sub">用时 '+(used==null?'—':used+' 天')+(leftTxt?' · <b style="color:'+(left<0?'#c0392b':'#a06a00')+'">'+leftTxt+'</b>':'')+(o.rev?' · 修改 '+o.rev+' 次':'')+'</div>'+
      (shareHtml?'<div class="shrow">'+shareHtml+'</div>':'')+
    '</div></div>'+
    '<div class="row" style="margin-top:6px">'+
      '<span style="font-size:13px;color:var(--p600)">修改次数</span>'+
      '<div style="margin-left:auto;display:flex;align-items:center;gap:8px">'+
        '<button class="clay-btn mini ghost" onclick="Views.order.rev(\''+o.id+'\',-1)">−</button>'+
        '<b style="min-width:22px;text-align:center;color:var(--p700)">'+(o.rev||0)+'</b>'+
        '<button class="clay-btn mini" onclick="Views.order.rev(\''+o.id+'\',1)">+</button>'+
      '</div>'+
    '</div>'+
    (o.due?'<div class="row" style="margin-top:6px">'+
      '<span style="font-size:13px;color:var(--p600)">截止 Deadline</span>'+
      '<input type="date" class="due-in" style="margin-left:auto" value="'+o.due+'" onchange="Views.order.setDue(\''+o.id+'\',this.value)">'+
    '</div>':'')+
    ((o.revLog&&o.revLog.length)?'<p class="hint" style="margin-top:2px">共记 '+o.revLog.length+' 次修改，最近 '+SH.esc(o.revLog[o.revLog.length-1])+'</p>':'')+
    (o.note?'<p class="hint">'+SH.icon('pen')+' '+SH.esc(o.note)+'</p>':'')+
    '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+
      (done
        ? '<button class="clay-btn mini ghost" onclick="Views.order.finish(\''+o.id+'\',1)">↩︎ 取消结单</button>'
        : '<button class="clay-btn mini" onclick="Views.order.finish(\''+o.id+'\',0)">'+SH.icon('check')+'标记完成</button>')+
      (done && !paid ? '<button class="clay-btn mini" style="color:var(--gr-d)" onclick="Views.order.authorize(\''+o.id+'\')">'+SH.icon('tag')+'标记授权</button>' : '')+
      '<button class="clay-btn mini ghost" onclick="Views.order.edit(\''+o.id+'\')">编辑</button>'+
      '<button class="clay-btn mini ghost" style="margin-left:auto" onclick="Views.order.del(\''+o.id+'\')">'+SH.icon('trash')+'</button>'+
    '</div>'+
  '</div>';
}

var pendingPic;
var pendingLock = null;   /* 'client' | 'self' | null（来自新增排单/新增自建） */
var filter = 'all';
Views.order = { render: function(root){
  var t = SH.today();
  /* 接单页只展示客订；自设(self) 归到「未授权库」 */
  var all = getOrders().filter(function(o){ return o.type!=='self'; });
  var month = t.slice(0,7);
  var mIncome=0, total=0, pend=0, paidCnt=0, unpaidCnt=0;
  all.forEach(function(o){
    if(SH.modelPaid(o)){
      total += SH.modelIncome(o); paidCnt++;
      if((o.end||'').slice(0,7)===month) mIncome += SH.modelIncome(o);
    } else if(isDone(o)){ unpaidCnt++; }
  });
  all.forEach(function(o){ if(!isDone(o)) pend += +o.fee||0; });

  var list = all;
  if(filter==='doing') list = all.filter(function(o){return !isDone(o);});
  else if(filter==='done') list = all.filter(isDone);
  var doing = list.filter(function(o){return !isDone(o);});
  var done  = list.filter(isDone);
  doing.sort(function(a,b){ var da=a.due||'9999-99-99', db=b.due||'9999-99-99'; return da<db?-1:(da>db?1:0); });
  done.sort(function(a,b){ return (a.end||'')<(b.end||'')?1:-1; });

  root.innerHTML =
  '<div class="vhead">'+SH.icon('briefcase')+'<h2>接单</h2>'+
  '<div class="right"><button class="clay-btn mini" onclick="Views.order.addClient()">'+SH.icon('plus','white')+'新增排单</button></div></div>'+
  '<div class="seg">'+
    ['all','doing','done'].map(function(f){ return '<button class="'+(filter===f?'on':'')+'" onclick="Views.order.setFilter(\''+f+'\')">'+(f==='all'?'全部':f==='doing'?'进行中':'已结单')+'</button>'; }).join('')+
  '</div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v">'+doing.length+'</div><div class="l">进行中</div></div>'+
    '<div class="stat"><div class="v">¥'+mIncome+'</div><div class="l">本月收入</div></div>'+
    '<div class="stat"><div class="v" style="color:var(--ac-d)">'+paidCnt+'</div><div class="l">已收费</div></div>'+
    '<div class="stat"><div class="v" style="color:var(--gr-d)">'+unpaidCnt+'</div><div class="l">未授权</div></div>'+
  '</div>'+
  '<div class="sect">'+SH.icon('list')+'排单（按截止日期）</div>'+
  (doing.length ? doing.map(function(o,i){return card(o, i+1);}).join('')
    : '<div class="clay-card"><p class="empty">还没有进行中的单，点右上角「新增排单」接一个吧</p></div>')+
  '<div class="sect">'+SH.icon('check')+'已结单 · 累计 ¥'+total+'</div>'+
  (done.length ? done.map(function(o){return card(o);}).join('')
    : '<div class="clay-card"><p class="empty">还没有结单的模型</p></div>')+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 跟 '+SH.esc(SH.vName())+' 说「接了个机甲模型，收费1200，8月20日交」就能记上；改了一稿就说「改了一版」。自己做的模型请到「未授权库」添加。</p></div>';
},

setFilter: function(f){ filter = f; SH.refresh(); },

/* 锁定类型的新增入口 */
addClient: function(){ this.edit(null, 'client'); },
addSelf:   function(){ this.edit(null, 'self'); },

/* 新增(id为空) / 编辑；lock 可锁定类型（'client'|'self'） */
edit: function(id, lock){
  var o = id ? (getOrders().filter(function(x){return x.id===id;})[0]) : null;
  pendingPic = o ? o.pic : undefined;
  pendingLock = lock || null;
  var t = SH.today();
  var sh = shareOf(o);
  var isSelf = o ? o.type==='self' : (lock==='self');
  var lockType = (lock==='client' || lock==='self');
  var clientBoxDisplay = lockType ? (lock==='client' ? 'block' : 'none') : 'block';
  var selfBoxDisplay = lockType ? (lock==='self' ? 'block' : 'none') : (isSelf ? 'block' : 'none');
  SH.modal('<h3>'+(o?(lockType?'编辑模型':(isSelf?'编辑自设模型':'编辑模型')):'新增模型')+'</h3>'+
  '<div class="mrow"><label>模型名称</label><input class="clay-input" id="od_name" value="'+SH.esc(o?(o.name||''):'')+'" placeholder="如：赛博机甲少女"></div>'+
  '<div class="mrow"><label>模型分类</label><select class="clay-input" id="od_cat" onchange="Views.order.catChange()">'+
    ['','人物-OC','人物-自设','人物-照片','道具','动物','食物','组合','配件'].map(function(c){ return '<option value="'+c+'"'+(o&&o.category===c?' selected':'')+'>'+(c||'不填')+'</option>'; }).join('')+
  '</select></div>'+
  '<div id="od_acc_hint" class="hint" style="display:none;margin:-4px 0 10px;color:var(--gr-d)">'+SH.icon('box')+' 选了「配件」会直接收进「配件库」，不进接单 / 授权库。</div>'+

  (lockType ? '' : '<div class="mrow"><label>类型</label><select class="clay-input" id="od_type" onchange="Views.order.typeChange()">'+
    ['client','self'].map(function(tp){ return '<option value="'+tp+'"'+(o&&o.type===tp?' selected':'')+'>'+(tp==='client'?'客订':'自设')+'</option>'; }).join('')+
  '</select></div>')+
  '<div id="od_client_box" style="display:'+clientBoxDisplay+'">'+
    '<div class="grid2">'+
      '<div class="mrow"><label>客户 / 甲方</label><input class="clay-input" id="od_client" value="'+SH.esc(o&&o.type==='client'?(o.client||''):'')+'" placeholder="选填"></div>'+
      '<div class="mrow"><label>收费 ¥</label><input class="clay-input" id="od_fee" type="number" value="'+(o&&o.type==='client'?(o.fee||''):'')+'" placeholder="0"></div>'+
    '</div>'+
  '</div>'+
  '<div id="od_self_box" style="display:'+selfBoxDisplay+'">'+
    '<div class="grid2">'+
      '<div class="mrow"><label>是否已授权</label><select class="clay-input" id="od_auth">'+
        ['','1'].map(function(v){ return '<option value="'+v+'"'+(o&&o.type==='self'&&o.authorized&&v==='1'?' selected':'')+'>'+(v?'已授权':'未授权')+'</option>'; }).join('')+
      '</select></div>'+
      '<div class="mrow"><label>授权收入 ¥</label><input class="clay-input" id="od_authfee" type="number" value="'+(o&&o.type==='self'?(o.authFee||''):'')+'" placeholder="0"></div>'+
    '</div>'+
  '</div>'+
  '<div class="mrow"><label>模型图片</label>'+
    '<div id="od_picbox" style="display:flex;align-items:center;gap:10px">'+
      (o&&o.pic?'<img src="'+o.pic+'" style="width:56px;height:56px;object-fit:cover;border-radius:14px">':'<span class="hint">未上传</span>')+
      '<label class="clay-btn mini" style="cursor:pointer">上传<input id="od_pic" type="file" accept="image/*" style="display:none" onchange="Views.order.pick(event)"></label>'+
    '</div></div>'+
  '<div id="od_date_box"><div class="grid2">'+
    '<div class="mrow"><label>接单日期</label><input class="clay-input" id="od_start" type="date" value="'+SH.esc(o?(o.start||''):t)+'"></div>'+
    '<div class="mrow"><label>截止 Deadline</label><input class="clay-input" id="od_due" type="date" value="'+SH.esc(o?(o.due||''):'')+'"></div>'+
  '</div></div>'+

  (o?'<div class="mrow"><label>结单日期（填了即视为已结单）</label><input class="clay-input" id="od_end" type="date" value="'+SH.esc(o.end||'')+'"></div>':'')+
  '<div id="od_share_box"><div class="mrow"><label>分享 / 展示平台</label>'+
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">'+
      '<label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--p600)"><input type="checkbox" id="od_xhs" '+(sh.xhs?'checked':'')+'> 小红书</label>'+
      '<label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--p600)"><input type="checkbox" id="od_dy" '+(sh.dy?'checked':'')+'> 抖音</label>'+
      '<label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--p600)"><input type="checkbox" id="od_xy" '+(sh.xy?'checked':'')+'> 闲鱼</label>'+
    '</div></div></div>'+
  '<div class="mrow"><label>备注</label><input class="clay-input" id="od_note" value="'+SH.esc(o?(o.note||''):'')+'" placeholder="如：含2次免费修改"></div>'+

  '<button class="clay-btn big" style="width:100%" onclick="Views.order.save('+(o?'\''+o.id+'\'':'null')+')">保存</button>'+
  (o?'<button class="clay-btn ghost" style="width:100%;margin-top:8px" onclick="Views.order.del(\''+o.id+'\')">删除这张单</button>':''));
},

typeChange: function(){
  var self = document.getElementById('od_type').value==='self';
  var isAcc = document.getElementById('od_cat') && document.getElementById('od_cat').value==='配件';
  document.getElementById('od_client_box').style.display = (isAcc||self) ? 'none' : 'block';
  document.getElementById('od_self_box').style.display = (isAcc ? 'none' : (self ? 'block' : 'none'));
},

/* 选「配件」类别：隐藏与配件无关的字段，提示将收进配件库 */
catChange: function(){
  var el = document.getElementById('od_cat'); if(!el) return;
  var isAcc = el.value==='配件';
  var lock = pendingLock;
  var typeSel = document.getElementById('od_type');
  var isSelf = typeSel ? typeSel.value==='self' : (lock==='self');
  var cb = document.getElementById('od_client_box');
  var sb = document.getElementById('od_self_box');
  if(cb) cb.style.display = isAcc ? 'none' : (lock==='client' ? 'block' : (lock ? 'none' : 'block'));
  if(sb) sb.style.display = isAcc ? 'none' : (lock==='self' ? 'block' : (lock ? 'none' : (isSelf ? 'block' : 'none')));
  var db = document.getElementById('od_date_box'); if(db) db.style.display = isAcc ? 'none' : 'block';
  var shb = document.getElementById('od_share_box'); if(shb) shb.style.display = isAcc ? 'none' : 'block';
  var hn = document.getElementById('od_acc_hint'); if(hn) hn.style.display = isAcc ? 'block' : 'none';
},

save: function(id){
  var name = document.getElementById('od_name').value.trim();
  if(!name) return SH.toast('模型名称还没填哦');
  var type = pendingLock || document.getElementById('od_type').value;
  var start = document.getElementById('od_start').value || SH.today();
  var due = document.getElementById('od_due').value;
  var note = document.getElementById('od_note').value.trim();
  var cat = document.getElementById('od_cat').value;
  /* 配件类别：直接收进配件库，不进入接单 / 授权库 */
  if(cat==='配件'){
    if(!SH.S.accessories) SH.S.accessories = [];
    if(id) SH.S.orders = getOrders().filter(function(x){ return x.id!==id; });
    SH.S.accessories.push({id:SH.uid(), name:name, category:'配件', note:note, pic:pendingPic||'', sourceId:'', created:SH.today()});
    pendingPic = undefined; pendingLock = null;
    SH.save(); SH.closeModal(); SH.refresh();
    SH.toast('已收进配件库 💪');
    return;
  }
  var share = {
    xhs: document.getElementById('od_xhs').checked,
    dy: document.getElementById('od_dy').checked,
    xy: document.getElementById('od_xy').checked
  };
  var client='', fee=0, authorized=false, authFee=0;
  if(type==='client'){
    client = document.getElementById('od_client').value.trim();
    fee = parseFloat(document.getElementById('od_fee').value)||0;
  } else {
    authorized = document.getElementById('od_auth').value==='1';
    authFee = parseFloat(document.getElementById('od_authfee').value)||0;
  }
  if(id){
    getOrders().forEach(function(o){ if(o.id===id){
      o.name=name; o.type=type; o.category=cat; o.share=share; o.start=start; o.due=due; o.note=note;
      o.client=client; o.fee=fee; o.authorized=authorized; o.authFee=authFee;
      if(pendingPic!==undefined) o.pic=pendingPic;
      var eEl = document.getElementById('od_end'); if(eEl) o.end = eEl.value;
      if(o.type==='self' && o.authorized && !o.authDate) o.authDate = SH.today();
    }});
  } else {
    getOrders().push({id:SH.uid(), name:name, type:type, category:cat, share:share,
      start:start, due:due, end:'', rev:0, revLog:[], note:note,
      client:client, fee:fee, authorized:authorized, authFee:authFee,
      authDate:(type==='self' && authorized ? SH.today() : ''), pic:pendingPic||''});
  }
  pendingPic = undefined; pendingLock = null;
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast(id?'已更新 ✨':'添加成功，开工！💪');
},

/* 修改次数 +1 / -1 */
rev: function(id, d){
  getOrders().forEach(function(o){ if(o.id===id){
    o.rev = Math.max(0, (o.rev||0)+d);
    if(!o.revLog) o.revLog = [];
    if(d>0) o.revLog.push(SH.today());
    else if(d<0 && o.revLog.length) o.revLog.pop();
  }});
  SH.save(); SH.refresh();
},

/* 行内修改截止日 */
setDue: function(id, val){
  getOrders().forEach(function(o){ if(o.id===id) o.due = val||''; });
  SH.save(); SH.refresh();
},

/* 结单 / 取消结单（自建模型此处=建模完成） */
finish: function(id, undo){
  getOrders().forEach(function(o){ if(o.id===id) o.end = undo ? '' : SH.today(); });
  SH.save(); SH.refresh();
  if(!undo){
    var o = getOrders().filter(function(x){return x.id===id;})[0];
    var dd = o?usedDays(o):null;
    SH.toast('标记完成'+(dd!=null?'，用时 '+dd+' 天':'')+' ✨');
  }
},

/* 标记授权 / 收费：录入收入金额 */
authorize: function(id){
  var o = getOrders().filter(function(x){return x.id===id;})[0];
  if(!o) return;
  var def = o.type==='self' ? (o.authFee||'') : (o.fee||'');
  SH.modal('<h3>'+(o.type==='self'?'标记授权':'标记收费')+'</h3>'+
    '<p class="hint" style="margin-bottom:10px">'+SH.esc(o.name)+'</p>'+
    '<div class="mrow"><label>'+(o.type==='self'?'授权收入 ¥':'实收金额 ¥')+'</label><input class="clay-input" id="au_amt" type="number" value="'+def+'" placeholder="0"></div>'+
    '<button class="clay-btn big" style="width:100%" onclick="Views.order.doAuthorize(\''+id+'\')">确认'+(o.type==='self'?'授权':'收费')+'</button>');
},
doAuthorize: function(id){
  var amt = parseFloat(document.getElementById('au_amt').value)||0;
  var o = getOrders().filter(function(x){return x.id===id;})[0];
  if(!o) return;
  if(o.type==='self'){ o.authorized=true; o.authFee=amt; if(!o.authDate) o.authDate=SH.today(); }
  else { o.fee=amt; }
  if(!o.end) o.end = SH.today();
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast('已记一笔收入 ✨');
},

del: function(id){
  if(!confirm('确定删除这张单？删除后不可恢复。')) return;
  SH.S.orders = getOrders().filter(function(x){return x.id!==id;});
  SH.save(); SH.closeModal(); SH.refresh();
  SH.toast('已删除');
},

/* 选模型图片：压缩后暂存，保存时写入 */
pick: function(ev){
  var f = ev.target.files && ev.target.files[0];
  if(!f) return;
  SH.compressImg(f, 800, function(d){
    pendingPic = d;
    document.getElementById('od_picbox').innerHTML =
      '<img src="'+d+'" style="width:56px;height:56px;object-fit:cover;border-radius:14px">'+
      '<label class="clay-btn mini" style="cursor:pointer">重传<input id="od_pic" type="file" accept="image/*" style="display:none" onchange="Views.order.pick(event)"></label>';
  });
},
/* 大图查看 */
big: function(id){
  var o = getOrders().filter(function(x){return x.id===id;})[0];
  if(o && o.pic) SH.modal('<img src="'+o.pic+'" style="width:100%;border-radius:16px">');
}};
})();
