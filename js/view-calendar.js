/* 日历：仅显示接单（截止日 / 制作中 / 接单 / 结单） */
(function(){
var cy = null, cm = null;

/* ---- 接单：日历上显示模型的 deadline / 制作中 ---- */
function odDiff(a,b){ var da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00'); if(isNaN(da)||isNaN(db)) return null; return Math.round((db-da)/864e5); }
function odUsed(o){ var d=odDiff(o.start,o.end||SH.today()); return d==null?null:Math.max(0,d); }
/* 该天与某张单的关系：due 截止 / start 接单 / end 结单 / span 制作中 */
function odRel(o,ds){
  var r=[];
  if(o.due && o.due===ds) r.push('due');
  if(o.start && o.start===ds) r.push('start');
  if(o.end && o.end===ds) r.push('end');
  var from=o.start, to=o.end||o.due||o.start;
  if(from && to && ds>=from && ds<=to) r.push('span');
  return r;
}
function odList(){ return SH.S.orders||[]; }

Views.calendar = { render: function(root){
  var now = SH.bjNow();
  if(cy===null){ cy = now.getFullYear(); cm = now.getMonth(); }
  var t = SH.today(), S = SH.S;
  var first = new Date(cy,cm,1), start = first.getDay(), dim = new Date(cy,cm+1,0).getDate();

  var html = '<div class="vhead">'+SH.icon('calendar')+'<h2>日历</h2>'+
  '<div class="right"><button class="clay-btn mini ghost" onclick="Views.calendar.nav(-1)">←</button>'+
  '<span style="font-weight:600;color:var(--p700);padding:6px 4px">'+cy+'年'+(cm+1)+'月</span>'+
  '<button class="clay-btn mini ghost" onclick="Views.calendar.nav(1)">→</button></div></div>'+
  '<div class="clay-card"><div class="calgrid">'+
  SH.weekCN.map(function(w){return '<div class="wd">'+w.slice(1)+'</div>';}).join('');
  for(var i=0;i<start;i++) html += '<div class="calcell dim"></div>';
  for(var d=1;d<=dim;d++){
    var ds = cy+'-'+('0'+(cm+1)).slice(-2)+'-'+('0'+d).slice(-2);
    var dots = '';
    var odDue=false, odSpan=false;
    odList().forEach(function(o){ var r=odRel(o,ds); if(r.indexOf('due')>=0) odDue=true; else if(r.indexOf('span')>=0) odSpan=true; });
    if(odDue) dots = '<span class="evdue">'+SH.icon('briefcase')+'</span>';
    else if(odSpan) dots += '<span class="evwork">'+SH.icon('cube')+'</span>';
    html += '<div class="calcell '+(ds===t?'today':'')+'" onclick="Views.calendar.day(\''+ds+'\')">'+d+
    '<div class="dots">'+dots+'</div></div>';
  }
  html += '</div></div>'+
  '<div class="clay-card sm"><p class="hint"><b style="color:#c0392b">●</b> 截止日 · <b style="color:#5b6ab0">●</b> 制作中 — 日历只显示接单相关：点某天看当天相关的单（用时日长 / 截止 / 修改次数）。要加单去「接单」页。</p></div>';
  root.innerHTML = html;
},
nav: function(d){ cm += d; if(cm<0){cm=11;cy--;} if(cm>11){cm=0;cy++;} SH.refresh(); },
day: function(ds){
  var rel = odList().filter(function(o){ return odRel(o,ds).length; });
  var orderHtml = rel.length
    ? '<div class="sect" style="margin-top:0">'+SH.icon('briefcase')+'当天相关的单</div>'+rel.map(function(o){
        var r=odRel(o,ds), done=!!o.end;
        var tag = r.indexOf('due')>=0 ? '<b style="color:#c0392b">今天截止</b>'
                : r.indexOf('end')>=0 ? '<b style="color:#1a7f4b">今天结单</b>'
                : r.indexOf('start')>=0 ? '今天接单' : (done?'已结单':'制作中');
        return '<div class="row">'+
          '<span style="font-size:16px">'+(done?SH.icon('check'):SH.icon('cube'))+'</span>'+
          '<div class="grow"><b style="color:var(--p700)">'+SH.esc(o.name)+'</b>'+
          (o.category?'<span style="font-size:11px;padding:1px 7px;border-radius:99px;background:#eef0ff;color:#5a4bd6;margin-left:6px">'+SH.esc(o.category)+'</span>':'')+
          (o.type==='self'?'<span style="font-size:11px;padding:1px 7px;border-radius:99px;background:var(--ac-soft);color:var(--ac-d);margin-left:6px">自设</span>':'')+
          '<div class="sub">'+tag+' · '+(o.type==='self'?(o.authorized?('授权 ¥'+(+o.authFee||0)):'待授权'):('¥'+(+o.fee||0)))+' · 修改 '+(o.rev||0)+' 次</div>'+
          '<div class="sub">接单 '+SH.esc(o.start||'—')+(o.due?' → 截止 '+SH.esc(o.due):'')+(o.end?' · 结单 '+SH.esc(o.end):'')+' · 用时 '+(odUsed(o)==null?'—':odUsed(o)+' 天')+'</div>'+
          '</div>'+
          '<button onclick="SH.closeModal();Views.order.edit(\''+o.id+'\')">'+SH.icon('edit')+'</button>'+
        '</div>';
      }).join('')
    : '<p class="empty">这天没有相关的单</p>';
  SH.modal('<h3>'+ds+'</h3>'+orderHtml);
}};
})();
