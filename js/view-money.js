/* 记账：收入由「接单 / 授权」自动汇总，无需手动记录或上传截图 */
(function(){
var SRC_ICON = { order:'briefcase', auth:'tag', manual:'coin' };
var SRC_NAME = { order:'接单', auth:'授权', manual:'其他' };

/* 聚合所有已确认收入事件（客订收费 + 自设授权收入 + 历史手动记录） */
function incomeList(){
  var evs = [];
  (SH.S.orders||[]).forEach(function(o){
    if(o.type==='self'){
      /* 自设：已授权 → 收入 = 授权费，计入授权月 */
      if(o.authorized && ((+o.authFee>0) || o.authDate)){
        evs.push({src:'auth', date:o.authDate||o.end||'', amount:+o.authFee||0,
          name:o.name||'自设模型', cat:o.category||'其他', oid:o.id});
      }
    } else {
      /* 客订：已结单(有 end)且收费 >0 → 收入 = 收费，计入结单月 */
      if(o.end && (+o.fee>0)){
        evs.push({src:'order', date:o.end, amount:+o.fee||0,
          name:o.name||'模型', cat:o.category||'其他', client:o.client||'', oid:o.id});
      }
    }
  });
  /* 历史手动记录（早期记的「其他」收入），保留展示与清理 */
  (SH.S.expenses||[]).forEach(function(x){
    evs.push({src:'manual', date:x.date, amount:+x.amount||0,
      name:x.note||x.cat||'其他收入', cat:x.cat||'其他', eid:x.id, img:x.img});
  });
  evs.sort(function(a,b){
    var da=a.date||'0', db=b.date||'0';
    return db<da ? -1 : (db>da ? 1 : 0);
  });
  return evs;
}

Views.money = { render: function(root){
  var S = SH.S, t = SH.today();
  var month = t.slice(0,7);
  var evs = incomeList();
  var total = 0, mSum = 0;
  evs.forEach(function(e){ total += e.amount; if((e.date||'').slice(0,7)===month) mSum += e.amount; });

  /* 本月来源拆分（接单 / 授权 / 其他） */
  var bySrc = {接单:0, 授权:0, 其他:0};
  evs.forEach(function(e){ if((e.date||'').slice(0,7)===month) bySrc[SRC_NAME[e.src]] += e.amount; });
  var srcKeys = ['接单','授权','其他'].filter(function(k){ return bySrc[k]>0; });

  function row(e){
    var thumb = (e.src==='manual' && e.img)
      ? '<img '+SH.picAttr(e.img)+' style="width:38px;height:38px;border-radius:12px;object-fit:cover">'
      : '<span style="font-size:17px">'+SH.icon(SRC_ICON[e.src])+'</span>';
    var jump = (e.src==='order') ? "SH.go('order')" : (e.src==='auth' ? "SH.go('auth')" : '');
    var sub = (e.date||'?')+' · '+SRC_NAME[e.src]+(e.client ? ' · '+SH.esc(e.client) : (e.cat && e.cat!=='其他' ? ' · '+SH.esc(e.cat) : ''));
    var del = (e.src==='manual')
      ? '<button onclick="Views.money.del(\''+e.eid+'\')">'+SH.icon('trash')+'</button>'
      : '<span style="font-size:11px;color:var(--p300);white-space:nowrap">'+('去'+SRC_NAME[e.src])+' ›</span>';
    return '<div class="row"'+(jump?' onclick="'+jump+'" style="cursor:pointer"':'')+'>'+thumb+
      '<div class="grow"><b style="color:var(--p700)">'+SH.esc(e.name||'')+'</b><div class="sub">'+sub+'</div></div>'+
      '<b style="color:var(--p600)">¥'+e.amount.toFixed(2)+'</b>'+del+'</div>';
  }

  root.innerHTML =
  '<div class="vhead">'+SH.icon('coin')+'<h2>收入记账</h2></div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v">¥'+total.toFixed(2)+'</div><div class="l">总收入</div></div>'+
    '<div class="stat"><div class="v">¥'+mSum.toFixed(2)+'</div><div class="l">本月收入</div></div>'+
  '</div>'+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('tag')+' 本页收入由「接单」和「授权」自动汇总：已结单的客订按收费计入，已授权的自设按授权收入计入，无需手动记账或上传截图。点某笔可跳到对应单据。</p></div>'+
  (srcKeys.length ? '<div class="clay-card"><div class="sect" style="margin-top:0">本月来源</div>'+
    srcKeys.map(function(k){
      return '<div class="row"><div class="grow" style="font-size:14px">'+k+'</div><b style="color:var(--p600)">¥'+bySrc[k].toFixed(2)+'</b></div>'+
      '<div class="bar" style="height:8px;margin:2px 0 8px"><i style="width:'+(mSum?bySrc[k]/mSum*100:0)+'%"></i></div>';
    }).join('')+'</div>' : '')+
  '<div class="clay-card"><div class="sect" style="margin-top:0">收入明细</div>'+
  (evs.length ? evs.slice(0,60).map(row).join('')
    : '<p class="empty">还没有收入记录。去「接单」结单、或「授权」标记授权，这里会自动出现~</p>')+'</div>';
},
/* 仅「其他」类（历史手动记录）可删除；订单/授权收入请到对应页面处理 */
del: function(id){
  var ex = (SH.S.expenses||[]).filter(function(x){return x.id===id;})[0];
  if(ex) SH.delPic(ex.img);
  SH.S.expenses = (SH.S.expenses||[]).filter(function(x){return x.id!==id;});
  SH.save(); SH.refresh();
  SH.toast('已删除');
}};
})();
