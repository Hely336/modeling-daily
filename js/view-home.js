/* 首页：接单总览 */
(function(){
function hDiff(a,b){
  var da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00');
  if(isNaN(da)||isNaN(db)) return null;
  return Math.round((db-da)/864e5);
}

Views.home = { render: function(root){
  var S = SH.S, t = SH.today(), now = SH.bjNow();
  var h = now.getHours();
  var greet = h<5?'夜深了':h<9?'早上好':h<12?'上午好':h<14?'中午好':h<18?'下午好':'晚上好';
  var nm = S.profile.name || '';
  var lastV = S.chat.filter(function(m){return m.role==='v';}).slice(-1)[0];

  var orders = S.orders||[];
  /* 首页排单：客订(进行中) + 自建(未授权，仍在做) 都显示；已授权的自建视为完成，移出排单。
     接单页(view-order) 只显示客订，自建统一在「未授权库」管理。 */
  var doing = orders.filter(function(o){ return (!o.end && o.type!=='self') || (o.type==='self' && !o.authorized && !o.end); });
  var doneClient = orders.filter(function(o){return !!o.end && o.type!=='self';});
  /* 已结单小结仅客订：累计收入只算客订，自设授权收入见「授权」页与本月收入 */
  var clientTotal = 0;
  doneClient.forEach(function(o){ if(SH.modelPaid(o)) clientTotal += SH.modelIncome(o); });
  /* 收入：客订收费(fee) + 自设模型授权收入(authFee)。自设模型按「授权月份(authDate)」计入本月收入 */
  var month = t.slice(0,7), mIncome = 0, total = 0;
  orders.forEach(function(o){
    if(o.type==='self'){
      if(o.authorized && (+o.authFee||0)>0){
        var amt = +o.authFee||0; total += amt;
        if((o.authDate||o.end||'').slice(0,7)===month) mIncome += amt;
      }
    } else if(SH.modelPaid(o)){
      total += SH.modelIncome(o);
      if((o.end||'').slice(0,7)===month) mIncome += SH.modelIncome(o);
    }
  });
  /* 排单：客订排在前，自建排在后；同组内按 deadline 升序（逾期/最近要交的在前） */
  doing.sort(function(a,b){
    var ac = (a.type==='self')?1:0, bc = (b.type==='self')?1:0;
    if(ac!==bc) return ac-bc;
    var da=a.due||'9999-99-99', db=b.due||'9999-99-99'; return da<db?-1:(da>db?1:0);
  });
  var urgent = doing.filter(function(o){ var d=o.due?hDiff(t,o.due):null; return d!=null && d<=3; });

  /* 一行排单（客订 / 自建 都显示，用类型标签区分） */
  function line(o, num){
    var isSelf = o.type==='self';
    var left = o.due?hDiff(t,o.due):null;
    var used = o.start?hDiff(o.start, o.end||t):null;
    var leftTxt='', col='var(--p600)';
    if(left!=null){
      leftTxt = left<0 ? '逾期 '+(-left)+' 天' : (left===0?'今天要交':'剩 '+left+' 天');
      col = left<0 ? '#c0392b' : (left<=2 ? '#a06a00' : 'var(--p600)');
    }
    var typePill = isSelf ? '<span class="pill pill-self">自设</span>' : '<span class="pill pill-client">客订</span>';
    var feeTxt = isSelf ? (o.authorized?'已授权':'待授权') : ('¥'+(+o.fee||0));
    return '<div class="row" style="cursor:pointer" onclick="Views.order.edit(\''+o.id+'\')">'+
      '<span class="seq">'+(num||'')+'</span>'+
      (o.pic?'<img src="'+o.pic+'" style="width:40px;height:40px;object-fit:cover;border-radius:12px;flex:0 0 auto">':'<span style="font-size:17px">'+SH.icon('cube')+'</span>')+
      '<div class="grow"><b style="color:var(--p700)">'+SH.esc(o.name)+'</b> '+typePill+
      (o.category?'<span style="font-size:11px;padding:1px 7px;border-radius:99px;background:#eef0ff;color:#5a4bd6;margin-left:6px">'+SH.esc(o.category)+'</span>':'')+
      '<div class="sub">'+feeTxt+' · 修改 '+(o.rev||0)+' 次'+(used!=null?' · 已用 '+Math.max(0,used)+' 天':'')+'</div>'+
      (o.due?'<div class="sub">截止 '+SH.esc(o.due)+(leftTxt?' · <b style="color:'+col+'">'+leftTxt+'</b>':'')+'</div>':'')+
      '</div>'+
      '<button class="donecheck" title="完成制作" onclick="event.stopPropagation();Views.order.finish(\''+o.id+'\',0)">'+SH.icon('check')+'</button>'+
      '</div>';
  }

  root.innerHTML =
  '<div class="vhead"><div><h2 style="font-size:24px">'+greet+(nm?'，'+SH.esc(nm):'')+' '+SH.icon('sparkle')+'</h2>'+
  '<p class="hint">'+t+' '+SH.weekCN[now.getDay()]+' · 北京时间 <b id="bjclock">'+SH.hm(now)+'</b></p></div>'+
  '<div class="right"><button class="apistat gray" onclick="Victor.ping()" title="点击测试与 AI 大模型的连接"><i></i><span class="apistat-t">未配置</span></button><button class="clay-btn mini" onclick="SH.go(\'focus\')">'+SH.icon('timer','white')+'专注</button></div></div>'+

  /* Victor 消息卡 */
  '<div class="clay-card" style="cursor:pointer" onclick="SH.go(\'chat\')">'+
    '<div style="display:flex;gap:12px;align-items:flex-start">'+
    '<div class="avat" style="width:42px;height:42px;border-radius:50%;background:var(--bg);color:var(--ac-d);display:flex;align-items:center;justify-content:center;font-weight:600;flex:none;box-shadow:var(--sh-sm)">'+SH.esc(SH.vName().slice(0,1).toUpperCase())+'</div>'+
    '<div><div style="font-weight:600;color:var(--p700);font-size:14px">'+SH.esc(SH.vName())+' <span class="hint" style="font-weight:400">· 在线盯着你</span></div>'+
    '<p style="font-size:13px;margin-top:4px;color:var(--p600);line-height:1.5">'+SH.esc(lastV?lastV.text.slice(0,70)+(lastV.text.length>70?'…':''):'点我开始对话')+'</p></div></div></div>'+

  /* 数据条：接单概况（单行三列） */
  '<div class="statrow" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v">'+doing.length+'</div><div class="l">进行中</div></div>'+
    '<div class="stat"><div class="v">¥'+mIncome+'</div><div class="l">本月收入</div></div>'+
    '<div class="stat"><div class="v" style="color:'+(urgent.length?'#c0392b':'inherit')+'">'+urgent.length+'</div><div class="l">3天内到期</div></div>'+
  '</div>'+

  /* 排单提醒 */
  '<div class="clay-card"><div class="sect" style="margin-top:0">'+SH.icon('list')+'排单'+(urgent.length?' <span class="hint">'+urgent.length+' 单要交了</span>':'')+
  '<button class="clay-btn mini" style="margin-left:auto" onclick="Views.home.addOrder()">'+SH.icon('plus','white')+'新增排单</button></div>'+
  (doing.length ? doing.slice(0,5).map(function(o,i){return line(o,i+1);}).join('')+
      (doing.length>5?'<p class="hint" style="margin-top:6px">还有 '+(doing.length-5)+' 单，去接单页看全部</p>':'')
    : '<p class="empty" style="padding:10px 0">手头没有在做的单～点「新增排单」接一个新模型吧</p>')+
  '</div>'+

  /* 已结单小结（仅客订；自建模型见「未授权库」） */
  (doneClient.length ? '<div class="clay-card"><div class="sect" style="margin-top:0">'+SH.icon('check')+'已结单 '+doneClient.length+' 单 · 累计 ¥'+clientTotal+
  '<button class="clay-btn mini" style="margin-left:auto" onclick="SH.go(\'order\')">查看</button></div>'+
  doneClient.slice(-3).reverse().map(function(o){
    var used = o.start&&o.end?hDiff(o.start,o.end):null;
    var paid = SH.modelPaid(o);
    return '<div class="row">'+
      '<span style="font-size:16px;'+(paid?'color:var(--ac)':'color:var(--gr)')+'">'+SH.icon(paid?'check':'cube')+'</span>'+
      '<div class="grow"><b style="color:var(--p700)">'+SH.esc(o.name)+'</b>'+
      '<div class="sub">'+(paid?('已收费 ¥'+SH.modelIncome(o)):'未授权 · 待授权')+' · 修改 '+(o.rev||0)+' 次'+(used!=null?' · 用时 '+Math.max(0,used)+' 天':'')+' · 结单 '+SH.esc(o.end||'')+'</div></div></div>';
  }).join('')+'</div>' : '')+

  '<div class="clay-card sm"><p class="hint">'+SH.icon('chat')+' 直接跟 '+SH.esc(SH.vName())+' 说「接了个机甲模型，收费1200，8月20日交」就能记账；改了一稿说「改了一版」，他帮你记修改次数。</p></div>';
  if(window.Victor && Victor.renderApiDot) Victor.renderApiDot();
},

/* 首页「新增排单」：先选 自建 / 客订 */
addOrder: function(){
  SH.modal('<h3>新增什么模型？</h3>'+
  '<button class="clay-btn big" style="width:100%;margin-top:8px" onclick="Views.order.addClient()">'+SH.icon('briefcase','white')+' 客订</button>'+
  '<p class="hint" style="margin:6px 2px 0">客户的订单 · 记收入 / 排单 / 修改次数</p>'+
  '<button class="clay-btn big" style="width:100%;margin-top:14px" onclick="Views.order.addSelf()">'+SH.icon('cube','white')+' 自设</button>'+
  '<p class="hint" style="margin:6px 2px 0">个人作品 · 可分享展示 / 待授权，归入「未授权库」</p>'+
  '<button class="clay-btn big" style="width:100%;margin-top:14px" onclick="Views.acc.edit()">'+SH.icon('box','white')+' 配件</button>'+
  '<p class="hint" style="margin:6px 2px 0">做好的小配件 · 直接收进「配件库」</p>');
}};
})();
