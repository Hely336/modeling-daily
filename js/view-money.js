/* 记账：收入由「接单 / 授权」自动汇总，无需手动记录或上传截图 */
(function(){
var SRC_ICON = { order:'briefcase', auth:'tag', manual:'coin' };
var SRC_NAME = { order:'接单', auth:'授权', manual:'其他' };

/* 聚合所有已确认收入事件（客订收费 + 自设授权收入 + 历史手动记录） */
function incomeList(){
  var evs = [];
  (SH.S.orders||[]).forEach(function(o){
    if(o.type==='self'){
      /* 自设：可能是单模型，也可能是「一组模型」(o.models) */
      if(Array.isArray(o.models) && o.models.length){
        if(o.authorized){
          /* 整组一次性授权：整组授权费计为一笔收入 */
          if((+o.authFee>0) || o.authDate)
            evs.push({src:'auth', date:o.authDate||o.end||'', amount:+o.authFee||0,
              name:o.name||'模型组', cat:o.category||'其他', oid:o.id});
        } else {
          /* 旧数据：子模型各自授权过 → 各自计收入（向后兼容） */
          o.models.forEach(function(m){
            if(m.authorized && ((+m.authFee>0) || m.authDate))
              evs.push({src:'auth', date:m.authDate||o.end||'', amount:+m.authFee||0,
                name:(o.name||'模型组')+' · '+(m.name||'子模型'), cat:o.category||'其他', oid:o.id, mid:m.id});
          });
        }
      } else if(o.authorized && ((+o.authFee>0) || o.authDate)){
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

var curMonth = null; /* 用户选择的「按月查看」月份，默认当前月 */

Views.money = { render: function(root){
  var S = SH.S, t = SH.today();
  var thisMonth = t.slice(0,7);
  var evs = incomeList();
  var total = 0;
  evs.forEach(function(e){ total += e.amount; });

  /* 收集所有有收入的月份（降序），并始终补上当前月 */
  var mset = {};
  evs.forEach(function(e){ var m=(e.date||'').slice(0,7); if(m) mset[m]=1; });
  mset[thisMonth] = 1;
  var months = Object.keys(mset).sort().reverse();

  /* 当前选中的月份（默认当前月，若之前选的月份已无数据则回退当前月） */
  var sel = (curMonth && mset[curMonth]) ? curMonth : thisMonth;
  curMonth = sel;

  var mEvs = evs.filter(function(e){ return (e.date||'').slice(0,7)===sel; });
  var mSum = 0; mEvs.forEach(function(e){ mSum += e.amount; });

  /* 选中月来源拆分（接单 / 授权 / 其他） */
  var bySrc = {接单:0, 授权:0, 其他:0};
  mEvs.forEach(function(e){ bySrc[SRC_NAME[e.src]] += e.amount; });
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

  /* 月份下拉选项 */
  var selOpts = months.map(function(m){
    return '<option value="'+m+'"'+(m===sel?' selected':'')+'>'+(m===thisMonth ? m+'（本月）' : m)+'</option>';
  }).join('');

  /* 各月收入汇总（点任一行切换选中月） */
  var monthSummary = months.map(function(m){
    var s = evs.filter(function(e){ return (e.date||'').slice(0,7)===m; })
               .reduce(function(a,e){ return a + e.amount; }, 0);
    var active = (m===sel);
    return '<div class="row" onclick="Views.money.pick(\''+m+'\')" style="cursor:pointer'+(active?'background:var(--p50)':'')+'">'+
      '<div class="grow" style="font-size:14px">'+m+(m===thisMonth?' <span style="color:var(--p300);font-size:11px">本月</span>':'')+'</div>'+
      '<b style="color:'+(active?'var(--p600)':'var(--p400)')+'">¥'+s.toFixed(2)+'</b></div>';
  }).join('');

  root.innerHTML =
  '<div class="vhead">'+SH.icon('coin')+'<h2>收入记账</h2></div>'+
  '<div class="grid2" style="margin-bottom:16px">'+
    '<div class="stat"><div class="v">¥'+total.toFixed(2)+'</div><div class="l">总收入</div></div>'+
    '<div class="stat"><div class="v">¥'+mSum.toFixed(2)+'</div><div class="l">'+(sel===thisMonth?'本月收入':sel+' 收入')+'</div></div>'+
  '</div>'+
  '<div class="clay-card sm"><p class="hint">'+SH.icon('tag')+' 本页收入由「接单」和「授权」自动汇总：已结单的客订按收费计入，已授权的自设按授权收入计入，无需手动记账或上传截图。点某笔可跳到对应单据；下方可按月份查看每月收入。</p></div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">按月查看</div>'+
    '<select id="mm_month" class="clay-input" onchange="Views.money.pick(this.value)" style="margin-bottom:10px">'+selOpts+'</select>'+
    (srcKeys.length ? srcKeys.map(function(k){
      return '<div class="row"><div class="grow" style="font-size:14px">'+k+'</div><b style="color:var(--p600)">¥'+bySrc[k].toFixed(2)+'</b></div>'+
      '<div class="bar" style="height:8px;margin:2px 0 8px"><i style="width:'+(mSum?bySrc[k]/mSum*100:0)+'%"></i></div>';
    }).join('')
    : '<p class="empty">该月暂无收入</p>')+
  '</div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">各月收入</div>'+monthSummary+'</div>'+
  '<div class="clay-card"><div class="sect" style="margin-top:0">'+sel+' 收入明细</div>'+
  (mEvs.length ? mEvs.map(row).join('')
    : '<p class="empty">该月还没有收入记录。去「接单」结单、或「授权」标记授权，这里会自动出现~</p>')+'</div>';
},
/* 切换「按月查看」的月份并刷新本页 */
pick: function(m){ curMonth = m; SH.refresh(); },
/* 仅「其他」类（历史手动记录）可删除；订单/授权收入请到对应页面处理 */
del: function(id){
  var ex = (SH.S.expenses||[]).filter(function(x){return x.id===id;})[0];
  if(ex) SH.delPic(ex.img);
  SH.S.expenses = (SH.S.expenses||[]).filter(function(x){return x.id!==id;});
  SH.save(); SH.refresh();
  SH.toast('已删除');
}};
})();
