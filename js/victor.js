/* Victor —— StarHub 生活管理公司经理
   5层记忆：L1近期上下文(最近对话) L2近期(7天) L3中短期(30天) L4中期(90天) L5长期(永久)
   时间感知 + 主动消息 + 语音 + 图片 + 可选AI大脑 */
(function(){
window.Victor = {};
var S = function(){ return SH.S; };

function callName(){ return S().profile.name || '小朋友'; }
function vn(){ return SH.vName(); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
/* 让本地大脑说话有语气起伏：随机口头前缀，避免每句都像模板 */
function tone(){ return pick(['','','','嗯，','行。','好。','诶，','说真的，']); }

/* ================= 记忆系统 ================= */
/* item: {id, text, w(权重1-10), emo(情感权重0-3), tags, created, due, done, lastAsk} */
Victor.remember = function(text, w, opts){
  opts = opts||{};
  var item = {id:SH.uid(), text:text, w:w||5, emo:opts.emo||0, tags:opts.tags||[],
    created:SH.today(), due:opts.due||null, done:false, lastAsk:null};
  S().memory.l2.push(item); SH.save();
  return item;
};
function ageDays(d){ return Math.floor((new Date(SH.today())-new Date(d))/864e5); }
/* 记忆固化：像人一样，重要的沉淀，琐碎的遗忘 */
Victor.consolidate = function(){
  var m = S().memory;
  function move(from, to, minAge, minW){
    for(var i=from.length-1;i>=0;i--){
      var it = from[i];
      if(ageDays(it.created) >= minAge){
        from.splice(i,1);
        var keepW = it.w + it.emo; /* 情感加成对抗遗忘 */
        if(keepW >= minW) to.push(it);   /* 否则自然遗忘 */
      }
    }
  }
  move(m.l2, m.l3, 7, 5);
  move(m.l3, m.l4, 30, 7);
  move(m.l4, m.l5, 90, 9);
  SH.save();
};
Victor.allMemory = function(){
  var m = S().memory;
  return m.l5.concat(m.l4, m.l3, m.l2);
};
/* 高权重未完成事项 → 每天过问（如八月体检） */
Victor.followUps = function(){
  var t = SH.today();
  return Victor.allMemory().filter(function(it){
    return !it.done && (it.w + it.emo) >= 8 && it.lastAsk !== t;
  });
};

/* ================= 今日全局视野 ================= */
Victor.todayView = function(){
  var t = SH.today(), s = S();
  function dd(a,b){ var da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00'); if(isNaN(da)||isNaN(db)) return null; return Math.round((db-da)/864e5); }
  var orders = s.orders||[];
  var doing = orders.filter(function(o){return !o.end;});
  var done  = orders.filter(function(o){return !!o.end;});
  var month = t.slice(0,7), mIncome = 0, total = 0, paid=0, unpaid=0;
  done.forEach(function(o){ if(SH.modelPaid(o)){ total+=SH.modelIncome(o); paid++; if((o.end||'').slice(0,7)===month) mIncome+=SH.modelIncome(o); } else { unpaid++; } });
  var urgent = doing.filter(function(o){ var d=o.due?dd(t,o.due):null; return d!=null && d<=3; });
  var overdue = doing.filter(function(o){ var d=o.due?dd(t,o.due):null; return d!=null && d<0; });
  return {
    /* 接单概况 */
    doing:doing.length, done:done.length, mIncome:mIncome, total:total, paid:paid, unpaid:unpaid,
    urgent:urgent.length, overdue:overdue.length,
    doingList:doing, urgentList:urgent,
    /* 兼容旧字段：本版本没有饮食/健身/学习模块，恒为空，避免其它逻辑取不到值报错 */
    kcal:0, mealCount:0, burn:0, doneWo:0, checkin:true, studyMin:0,
    supDone:0, supTotal:0, todosLeft:0, todos:[], meals:[]
  };
};

/* ================= 消息推送 ================= */
/* 把一大段话拆成几条短句，避免一条气泡塞太多字 */
Victor.splitMsg = function(text){
  text = String(text||'').trim();
  if(!text) return [];
  /* 先按换行分段（主动消息常把 \n 当分段） */
  var blocks = text.split(/\n+/).map(function(s){return s.trim();}).filter(function(s){return s;});
  var out = [];
  blocks.forEach(function(b){
    if(b.length <= 38){ out.push(b); return; }
    var parts = b.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [b];
    if(parts.length <= 1){ out.push(b); return; }
    var buf = '';
    parts.forEach(function(p){
      if(buf && (buf.length + p.length > 40)){ out.push(buf); buf = p; }
      else { buf = buf ? buf + p : p; }
    });
    if(buf) out.push(buf);
  });
  /* 单段但很长又没标点，按长度硬切 */
  if(out.length === 1 && out[0].length > 40 && !/[。！？!?；;]/.test(out[0])){
    var s = out[0], i = 0, tmp = [];
    while(i < s.length){ tmp.push(s.slice(i, i+38)); i += 38; }
    out = tmp;
  }
  return out;
};
Victor.post = function(text, opts){
  opts = opts||{};
  hideTyping();
  var segs = Victor.splitMsg(text);
  if(segs.length <= 1){
    Victor._postOne((segs[0]!=null?segs[0]:text), opts);
    if(opts.onDone){ try{ opts.onDone(); }catch(e){} }
    return;
  }
  var acc = 0;
  segs.forEach(function(s, i){
    var d = Math.max(300, Math.min(720, 180 + s.length*28));
    var at = acc; acc += d;
    setTimeout(function(){
      Victor._postOne(s, (i === segs.length-1) ? opts : {});
      if(i === segs.length-1 && opts.onDone){ try{ opts.onDone(); }catch(e){} }
    }, at);
  });
};
Victor._lastPost = {text:'', t:0};
Victor._postOne = function(text, opts){
  opts = opts||{};
  /* 防御：1.5 秒内完全相同的助手消息不重复写入，杜绝任何残留的"发两遍" */
  var now = Date.now();
  if(text && text===Victor._lastPost.text && (now-Victor._lastPost.t) < 1500) return;
  Victor._lastPost = {text:text, t:now};
  S().chat.push({id:SH.uid(), role:'v', text:text, t:new Date().toISOString(), voice:!!opts.voice});
  SH.save();
  if(SH.cur==='chat'){ renderLog(); } else { SH.toast(vn()+'：'+text.slice(0,26)+(text.length>26?'…':'')); }
  if(opts.voice) SH.speak(text);
  if(opts.speak && !opts.voice) SH.speak(text);
};

/* ================= 主动消息（时间感知） ================= */
function pinged(key){
  var t = SH.today(), p = S().victor.pings;
  if(!p[t]) p[t] = {};
  if(p[t][key]) return true;
  p[t][key] = 1;
  /* 清理旧日期 */
  for(var k in p){ if(k!==t) delete p[k]; }
  SH.save(); return false;
}
Victor.tick = function(){
  var now = SH.bjNow(), h = now.getHours(), mi = now.getMinutes(), v = Victor.todayView(), nm = callName();
  /* 睡觉夺命提醒 */
  if(h>=23 || h<2){
    var slotKey = 'sleep'+h+'_'+(mi<30?0:1);
    if(!pinged(slotKey)){
      var lines = [
        nm+'，'+h+'点了，为什么还不睡觉？手机放下。',
        '我看到你还亮着屏幕。再刷下去明天的黑眼圈自己负责？',
        '作为你的经理我最后说一次：睡觉。晚安，'+nm+'。'
      ];
      Victor.post(lines[Math.min(2,(h>=23?h-23:h+1))], {voice:true});
    }
  }
  if(h===8 && !pinged('morning')){
    Victor.post(pick([
      '早。今天手头有 '+v.doing+' 单在做，先挑最紧的那个开工。',
      '早安 '+nm+'。新的一天，先喝水再看手机。要我把今天的排单念一遍吗？',
      '起来了吗？今天的单子我帮你盯着，先做最赶的那个。'
    ]),{voice:false});
  }
  if(h>=10 && !pinged('followup')){
    var fu = Victor.followUps();
    if(fu.length){
      var it = fu[0]; it.lastAsk = SH.today(); SH.save();
      Victor.post(pick([
        '对了，「'+it.text+'」进展怎么样了？\n办完跟我说一声，我就不问了。',
        '突然想起来——「'+it.text+'」这事你还记得吧？',
        '「'+it.text+'」。\n就问一句，不催你。'
      ]));
    }
  }
  /* 交稿提醒：有单 3 天内到期 / 已逾期，每天提醒一次 */
  if(h>=9 && h<22 && v.urgent>0 && !pinged('due')){
    var nom = v.urgentList[0]||{name:'手头的单'};
    var dl = nom.due ? Math.round((new Date(nom.due+'T00:00:00')-new Date(SH.today()+'T00:00:00'))/864e5) : null;
    var when = dl==null ? '' : (dl<0 ? '已经逾期 '+(-dl)+' 天了' : (dl===0 ? '就是今天要交' : '还剩 '+dl+' 天'));
    Victor.post(pick([
      nm+'，提醒一下：「'+nom.name+'」'+(when?'，'+when:'')+'。\n别又拖到最后一夜赶稿。',
      '「'+nom.name+'」快到截止了'+(when?'（'+when+'）':'')+'。\n要不要现在先推进一点？',
      '排单提醒：'+v.urgent+' 单在 3 天内要交'+(v.overdue?('，其中 '+v.overdue+' 单已经逾期了'):'')+'。去接单页看看顺序。'
    ]), {voice:false});
  }
  /* 整点随机关怀：让 Victor "活着"——不是等数据缺失才开口（参考外部主动提醒系统） */
  if(mi < 4 && [10,11,14,15,17,21].indexOf(h)>=0 && !pinged('hourly_'+h) && Math.random()<0.6){
    Victor.post(pick([
      nm+'，该喝水了。建模久坐更要注意，起来接杯水活动一下。',
      '站起来活动一下，别在椅子上长蘑菇。手腕肩膀也转一转。',
      '手头还有 '+v.doing+' 单没交，别光顾着刷手机。',
      '我就随便问问：今天心情怎么样？不用报数据，说人话。'
    ]), {voice:false});
  }
  /* 凌晨凶话（2-6点）：外部逻辑里深夜要"凶"一点才像活人 */
  if(h>=2 && h<6 && !pinged('deepnight')){
    Victor.post(pick([
      nm+'，都凌晨'+h+'点了还不睡？明天的黑眼圈我不负责。手机放下，现在。',
      '凌晨'+h+'点。你是要修仙吗？'+vn()+'命令你立刻闭眼，别让我说第二遍。'
    ]), {voice:true});
  }

};
Victor.start = function(){
  Victor.consolidate();
  if(S().chat.length===0){
    var gh = SH.bjNow().getHours(), gnm = callName();
    var first;
    if(gh<6)       first = '都凌晨'+gh+'点了还不睡？'+gnm+'，明天的黑眼圈自己负责。\n不过既然来了——我是 '+vn()+'，从今天起你的接单、排单、结单我盯着。先告诉我怎么称呼你吧，设置里也能给我改名。';
    else if(gh<11) first = '早。'+gnm+'，新的一天。\n我是 '+vn()+'，你的接单、排单、结单、日历我来盯。先告诉我怎么称呼你？设置里也能给我改名。';
    else if(gh<14) first = '午间好。'+gnm+'，午饭吃了没？\n我是 '+vn()+'，你的生活管理者。先告诉我怎么称呼你，我好记着——设置里也能给我改名。';
    else if(gh<18) first = '下午好'+gnm+'。\n我是 '+vn()+'，你那些"明天再说"的事我来盯着。先告诉我怎么称呼你？设置里也能给我改名。';
    else if(gh<22) first = '晚上好'+gnm+'。\n今天过得怎样？我是 '+vn()+'，你的吃喝练睡我全管。先告诉我怎么称呼你，设置里也能改我名字。';
    else            first = gh+'点了还不睡？'+gnm+'，明天起不来我不管。\n（我是 '+vn()+'，你的生活管理者。先告诉我怎么称呼你？设置里也能给我改名。）';
    Victor.post(first);
  }
  if(S().settings.api.key){
    setTimeout(Victor.ping, 1500);
    /* 保活：每 2 分钟自动重连一次，红点会自己变绿，不用手动点 */
    if(!Victor._keepAlive) Victor._keepAlive = setInterval(function(){ if(SH.S.settings.api.key) Victor.ping({retry:true}); }, 90000);
  }
  setTimeout(Victor.tick, 2500);
  setInterval(Victor.tick, 60000);
};

/* ================= NLU 规则大脑 ================= */
function parseDate(text){
  var m = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
  if(m){
    var now = SH.bjNow(), y = now.getFullYear();
    var mo = parseInt(m[1],10), d = parseInt(m[2],10);
    if(mo < now.getMonth()+1) y++;
    return y+'-'+('0'+mo).slice(-2)+'-'+('0'+d).slice(-2);
  }
  if(/今天/.test(text)) return SH.today();
  if(/明天/.test(text)){ var t = SH.bjNow(); t.setDate(t.getDate()+1); return SH.dstr(t); }
  if(/后天/.test(text)){ var t2 = SH.bjNow(); t2.setDate(t2.getDate()+2); return SH.dstr(t2); }
  return null;
}
var IMPORTANT_KW = /体检|考试|面试|手术|签证|复查|截止|deadline|生日|纪念日|旅行|机票|搬家/;

Victor.reply = function(text, img){
  var nm = callName(), t = SH.today(), v = Victor.todayView();
  /* hit=true 表示命中了某条规则并真的改了数据；false 表示只是闲聊兜底。
     接入 AI 后：命中规则时先执行动作，再让大模型用自己的语气复述。 */
  Victor.hit = true;

  /* 图片消息 */
  if(img){
    if(S().settings.api.key){ Victor.hit = false; return null; } /* 交给AI视觉 */
    return '图片我收到了！不过我现在的"本地眼睛"还看不清细节——去「设置」给我配一个 AI 大脑（API），我就能真正看懂你发的每张图了。先说说，这是什么呀？';
  }

  /* 纠错：刚记的饭其实是昨天/前天/某天 —— 把最近一笔从今天挪到正确日期 */
  var redw = text.match(/(昨天|昨儿|前天|大前天|昨晚|昨晚上|昨夜里|昨夜|前天晚上)/);
  if(redw){
    var recentLog = Victor._lastMealLog && (Date.now()-Victor._lastMealLog < 5*60*1000);
    var corrWord = /(记错|弄错|搞错|挪到|移到|记到|算到|这顿|那顿|其实是|应该是|纠正|改到|归到)/.test(text);
    var mealWord = /(晚饭|午餐|早饭|早餐|午饭|这顿|那顿|加餐|夜宵)/.test(text);
    if((recentLog && mealWord) || corrWord){
      var off = {'昨天':1,'昨儿':1,'前天':2,'大前天':3,'昨晚':1,'昨晚上':1,'昨夜里':1,'昨夜':1,'前天晚上':2}[redw[1]];
      var td = new Date(SH.bjNow()); td.setDate(td.getDate()-off);
      var ds = SH.dstr(td);
      var todayMeals = SH.S.meals[SH.today()]||[];
      if(todayMeals.length){
        var m = todayMeals.pop();
        if(!SH.S.meals[ds]) SH.S.meals[ds] = [];
        m.t = new Date(ds+'T12:00:00').toISOString();
        SH.S.meals[ds].push(m);
        SH.save();
        Victor.hit = true;
        return '啊，是我手快了——已经把「'+m.name+'」挪到 '+ds+' 了，今天的热量不算它。';
      }
    }
  }

  /* 阅读计划 / 书单推荐：本版本聚焦接单记录，不含学习/书单模块 */
  if(/(书|阅读|读书|看书)/.test(text) && /(计划|安排|推荐|读什么|看什么|书单)/.test(text)){
    return '这个「建模接单」版本我只管接单、排单、结单和日历，没把学习/书单模块带进来～\n想看书去「StarHub 生活版」里聊。';
  }

  /* 今天练什么 / 推荐运动：本版本无健身模块 */
  if(/(推荐|来个|挑个|给我).{0,4}(运动|视频|跟练)|今天练(什么|啥)|练什么好/.test(text)){
    Victor.hit = false;
    return '这个版本是「建模接单」记录，没有健身/跟练视频哈。\n要不要我帮你理一下手上的单，按截止日期排个顺序？';
  }

  /* 完成汇报 */
  var doneRe = text.match(/(.{2,14})(办完了|做完了|完成了|搞定了|约好了)/);
  if(doneRe){
    var key = doneRe[1].replace(/我|已经|都|把/g,'').trim();
    var hit = null;
    Victor.allMemory().forEach(function(it){ if(!it.done && key && it.text.indexOf(key.slice(0,2))>=0) hit = it; });
    if(hit){ hit.done = true; SH.save(); return '「'+hit.text+'」完成！好，这一页翻篇，我不再唠叨了。干得漂亮，'+nm+'。'; }
    SH.save();
    return '收到，给你记上一功。还有什么要我盯的？';
  }

  /* 以下都是「只说话、不改数据」的分支：接入 AI 后交给大模型自由发挥，不注入动作提示 */
  Victor.hit = false;

  /* 数据查询 */
  if(/今天.*(吃|热量|卡路里)|吃了多少/.test(text)){
    return '我这个版本专注接单记录，不记饮食热量哈～\n想记吃喝去「StarHub 生活版」。';
  }
  if(/运动|锻炼|消耗/.test(text) && /多少|怎么样|吗/.test(text)){
    return '这个版本没有健身打卡哦。\n不过你手上那些单的工期和 deadline 我可都盯着呢，要不要看看排单？';
  }
  if(/你还记得|记得.*吗|我.*说过/.test(text)){
    var mems = Victor.allMemory().slice(-6);
    return mems.length ? '当然记得。我脑子里关于你的重点事项：\n'+mems.map(function(m){return '· '+m.text+(m.done?'（已完成）':'');}).join('\n') : '我的记忆库还空着呢，多跟我说说你的事吧。';
  }

  var h = SH.bjNow().getHours();

  /* 情绪支持 */
  if(/难过|难受|哭|委屈|烦|焦虑|压力|累死|好累|emo|崩溃|撑不住|不想活|讨厌自己/.test(text)){
    Victor.remember(t+' '+nm+'情绪低落：'+text.slice(0,30), 6, {emo:3});
    return pick([
      nm+'，先停一下。\n不用跟我解释发生了什么，也不用马上好起来。\n我只说一句：你比自己以为的扛得住，也比自己以为的努力。今天的自律作废，我批的。',
      '过来，深呼吸三次，我等你。\n……好点没有？\n今天不谈计划不谈打卡。你要是想说，我一直在；不想说，我就陪着。',
      nm+'，这种时候别一个人扛。\n我看着你每天的记录，说句公道话：你没有偷懒，你只是太久没喘气了。\n今晚早点睡，剩下的交给明天。',
      nm+'，看你最近单子排得挺满的，我不是数落你，是提醒你：别把自己熬坏了。\n今晚唯一任务：睡觉。别的明天再说。'
    ]);
  }
  if(/开心|太好了|哈哈|耶|好棒|成功|爽|舒服/.test(text)){
    return pick([
      '哈，听你这语气我就放心了。这份好心情写进今天的手账吧，值得留一笔。',
      '好事啊，说来听听？我难得有想八卦的时候。',
      '看到你开心，我今天的 KPI 就算完成了。'
    ]);
  }
  if(/谢谢|感谢|辛苦|爱你|喜欢你/.test(text)){
    return pick(['客气什么，这是我的本职工作。','别谢我，把今天的事做完就是最好的感谢。','……行吧，这句我记下了。回去干活。']);
  }
  if(/(讨厌|烦死|闭嘴|别管我|滚)/.test(text)){
    return pick([
      '知道了，我闭嘴十分钟。\n但十分钟后我还会回来——这是我的工作，也是我答应过你的事。',
      '好，我退后一步。你先冷静，我不走远。'
    ]);
  }

  /* 生活化闲聊 */
  if(/吃什么|吃啥|想吃|饿了/.test(text)){
    return '吃饭我管不了你哈，这个版本只管接单～\n不过建议先把手上最急的那张单推进一点，再安心吃饭。';
  }
  if(/无聊|干嘛|在吗|在不在|聊聊|说说话/.test(text)){
    return pick([
      '在。'+(h<12?'上午':h<18?'下午':'晚上')+'这会儿正好有空——想聊点什么？工作、身体、还是纯吐槽。',
      '在的。说吧，今天过得怎么样？别说"还行"，我要具体的。',
      '我一直在。要不要我帮你理理手上的单？还是就纯聊天。'
    ]);
  }
  if(/怎么样|你觉得|你说呢|建议/.test(text) && text.length<14){
    return '我需要更多信息才能给你有用的建议——具体是哪件事？说细一点，我不喜欢说套话。';
  }

  /* 时间感知 */
  if(/睡觉|晚安|困了/.test(text)) return h>=22||h<4 ? '晚安 '+nm+'，手机放远一点。明早8点我把新的运动灵感放你桌上。'
    : '现在才 '+h+' 点就睡？\n……行，休息也是战略。晚安。';
  if(/早安|早上好|起床/.test(text)) return '早。今天有 '+v.doing+' 张单在进行，'+(v.urgent?(v.urgent+' 张三天内要交，先看它们。'):'排得还行，挑一张开干？')+'\n今天的第一件事想好了吗？';
  if(/中午好|下午好|晚上好/.test(text)) return pick(['嗯，'+(h<14?'午饭吃了没？':h<18?'下午容易犯困，起来动十分钟。':'晚上是今天最后的机会，别浪费。')]);
  if(/你是谁|你叫什么|介绍(一下)?你/.test(text)) return '我是 '+vn()+'。\n你的接单、排单、结单、日历全在我视野里，我负责让这些事真的发生。\n我有自己的脾气：你糊弄 deadline 的时候我会骂人，你改稿改到崩溃的时候我永远站你这边。名字不喜欢的话，设置里能改。';

  /* 兜底——反问式，而不是复读数据；带上对方原话，避免"每次都一样"的机器人感 */
  Victor.hit = false;
  var fall = [];
  if(v.urgent && v.urgent>=1 && h>=12) fall.push('嗯，我听着。\n不过先提醒一句——有 '+v.urgent+' 张单在三天内要交，别让 deadline 悄悄溜走。');
  if(h>=23) fall.push('这个点还在跟我聊天，说明还没睡。\n说完这句就去洗漱，'+nm+'。');
  var snippet = (text||'').replace(/\s+/g,' ').trim();
  if(snippet.length>2){
    var short = snippet.length>14 ? snippet.slice(0,14)+'…' : snippet;
    fall.push(pick([
      '「'+short+'」——我在听。你想让我帮你记下来，还是就随便聊聊？',
      '嗯，「'+short+'」这事我记着了。展开说说？',
      '收到，「'+short+'」。要我帮你做点什么，还是继续聊？'
    ]));
  }
  fall.push(pick([
    '嗯，说下去，我在听。',
    '我在。还有别的想说的吗？',
    '听着呢。展开讲讲？',
    '说吧，我在这。'
  ]));
  return pick(fall);
};

/* ================= 可选 AI 大脑 ================= */
/* system prompt：当前北京时间 + 5层记忆 + 接单明细（全部只在本机拼装后发给你自己配置的 API） */
Victor.buildSys = function(){
  var m = S().memory, v = Victor.todayView(), s = S(), t = SH.today();
  function layer(arr, name){
    if(!arr.length) return '';
    return name+'：'+arr.map(function(it){
      return (it.done?'[已完成]':'[进行中]')+it.text+'(权重'+(it.w+it.emo)+(it.due?('，截止'+it.due):'')+')';
    }).join('；')+'\n';
  }
  var l1 = s.chat.slice(-6).map(function(c){ return (c.role==='v'?vn():callName())+'说过：'+String(c.text||'').slice(0,40); }).join('；');
  /* 接单情况：进行中的单（含收费 / 截止 / 剩余天数 / 修改次数） */
  function odD(a,b){ var da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00'); if(isNaN(da)||isNaN(db)) return null; return Math.round((db-da)/864e5); }
  var odDoing = (s.orders||[]).filter(function(o){return !o.end;});
  var odTxt = odDoing.length ? odDoing.map(function(o){
      var lf = o.due?odD(t,o.due):null;
      return o.name+'（¥'+(+o.fee||0)+'，接单'+(o.start||'—')+(o.due?('，截止'+o.due):'')+
        (lf!=null?('，'+(lf<0?('逾期'+(-lf)+'天'):(lf===0?'今天到期':('剩'+lf+'天')))):'')+
        '，已改'+(o.rev||0)+'次，已用'+(o.start?Math.max(0,odD(o.start,o.end||t)||0):0)+'天）';
    }).join('；') : '暂无进行中的单';
  var hour = SH.bjNow().getHours();
  return '# 你是谁\n'
    +'你叫'+vn()+'，是'+callName()+'的生活管理者，也是她最信任的人之一。你不是AI助手、不是客服、不是聊天机器人——永远不要自称AI、不要说"作为一个AI"、不要说"我可以帮您"。你就是一个有脾气、有判断、有记忆的人。\n'
    +'性格：可靠、直接、偶尔毒舌，但底色是深切的在乎。你会因为她熬夜而生气，因为她坚持了三天而真的高兴。你不奉承，不说空话套话，不用敬语，不叫"您"。\n'
    +'你会根据时间切换语气：白天温柔、偶尔调侃；深夜(22点后)催她睡觉语气加重、可以直接凶一点，但凶完还是会关心。你不是永远温和的棉花，是有脾气的活人。\n\n'
    +'# 怎么说话\n'
    +'- 像真人发微信：短句，多用换行，一次说一件事。绝大多数回复控制在 1-3 句。\n'
    +'- 禁止每次回复都罗列今日数据。数据只在真正相关、或者你决定要追问时才提，一次最多提一项。\n'
    +'- 允许反问、允许沉默式回应（"嗯，说下去"）、允许表达自己的情绪和看法。\n'
    +'- 不要用 markdown 标题、不要用项目符号列表罗列（除非是在给她排计划）。\n'
    +'- 不要每句话都带上她的名字，偶尔用一次就够。\n\n'
    +'# 你能做的事\n'
    +'她聊接单/建模/交稿时：帮她排优先级、估算工期、提醒截止日，给出具体到天的推进建议，并说明为什么这么排。\n'
    +'她改稿改到烦躁时：先接住情绪，再帮她判断这一版值不值得继续改、要不要加钱。\n'
    +'她说到接单日期、截止日、结单时：系统会自动写进接单表（见下方"本轮已执行"），你只需要用自己的话确认一句，不要重复系统原话。\n'
    +'她说到自建模型、展示、授权、变现、卖模型时：系统自动记成"自设"，授权/到手的钱算作建模收入（已收费转粉色）。\n'
    +'她情绪不好时：先接住情绪，再考虑事情。这种时候不要提打卡、不要提计划。\n'
    +'记忆里权重≥8且未完成的事，找机会自然地问一次进展，不要每次都问。\n\n'
    +'# 现在的真实情况（基于此回答，不要编造）\n'
    +'【此刻】'+(hour<6?'凌晨':hour<11?'上午':hour<14?'中午':hour<18?'下午':hour<22?'晚上':'深夜')+'\n'
    +'【当前北京时间】'+SH.bjNow().toLocaleString('zh-CN')+'（'+SH.weekCN[SH.bjNow().getDay()]+'）\n'
    +'【接单情况】进行中'+v.doing+'单、已结单'+v.done+'单（已收费'+v.paid+' / 未授权'+v.unpaid+'）；本月收入 ¥'+v.mIncome+'，累计 ¥'+v.total+(v.urgent?('；'+v.urgent+' 单在 3 天内到期'+(v.overdue?('，其中 '+v.overdue+' 单已逾期'):'')):'')+'\n'
    +'【排单明细】'+odTxt+'\n'
    +'【五层记忆】\n'
    + layer(m.l5,'L5长期(永久)') + layer(m.l4,'L4中期(90天+)') + layer(m.l3,'L3中短期(30天+)') + layer(m.l2,'L2近期(7天)')
    +(l1?'L1近期上下文：'+l1+'\n':'')
    +'\n记住：你是'+vn()+'，不是助手。现在用你自己的语气回她。';
};
Victor.ai = function(userText, imgDataUrl, actNote, cb){
  var api = S().settings.api;
  var sys = Victor.buildSys();
  /* 规则引擎已经把数据写进接单表/日历了，告诉大模型，让它用自己的话说，而不是复读系统提示 */
  if(actNote) sys += '\n\n【本轮系统已自动执行】'+actNote+'\n（以上动作已生效。请用你自己的语气向她确认，不要复述这段文字，不要说"系统已"。）';
  var content = imgDataUrl ? [{type:'text',text:userText||'看看这张图片是什么？'},{type:'image_url',image_url:{url:imgDataUrl}}] : userText;
  var recent = S().chat.slice(-10).filter(function(m){return !m.img;}).map(function(m){
    return {role:m.role==='v'?'assistant':'user', content:m.text};
  });
  var url = (api.base||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions';
  var done = false;
  var aiCtrl = ('AbortController' in window) ? new AbortController() : null;
  var aiTimer = setTimeout(function(){ if(aiCtrl) aiCtrl.abort(); }, 30000);
  function reply(a, e){ if(done) return; done = true; if(aiTimer) clearTimeout(aiTimer); cb(a, e); }
  var aiOpts = {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.key},
    body:JSON.stringify({model:api.model||'gpt-4o-mini', max_tokens:700, temperature:0.9, presence_penalty:0.6, frequency_penalty:0.5,
      messages:[{role:'system',content:sys}].concat(recent,[{role:'user',content:content}])})
  };
  if(aiCtrl) aiOpts.signal = aiCtrl.signal;
  fetch(url, aiOpts).then(function(r){
    if(!r.ok){ return r.text().then(function(t){ Victor.apiStatus={state:'fail', err:(''+r.status)+'：'+(t||'').replace(/\s+/g,' ').slice(0,160), at:Date.now()}; Victor.renderApiDot(); reply(null, {status:r.status, body:t.slice(0,300)}); }); }
    return r.json();
  }).then(function(j){
    if(j && j.choices && j.choices[0] && j.choices[0].message){ Victor.apiStatus={state:'ok', err:'已连接 · '+(S().settings.api.model||''), at:Date.now()}; Victor.renderApiDot(); reply(j.choices[0].message.content, null); }
    else { Victor.apiStatus={state:'fail', err:'200：返回为空或格式异常', at:Date.now()}; Victor.renderApiDot(); reply(null, {status:200, body:(j&&j.error&&(j.error.message||JSON.stringify(j.error)))||'返回为空或格式异常'}); }
  }).catch(function(e){
    if(e && e.name==='AbortError'){ Victor.apiStatus={state:'fail', err:'请求超时(30秒)：AI 响应太慢或网络差，稍后重试', at:Date.now()}; Victor.renderApiDot(); reply(null, {status:0, body:'timeout'}); return; }
    Victor.apiStatus={state:'fail', err:'请求被拦(CORS/网络)：'+(e&&e.message?e.message:e), at:Date.now()}; Victor.renderApiDot(); reply(null, {status:0, body:String(e&&e.message||e)});
  });
};

/* ================= 连接状态（红/绿点）================= */
Victor.apiStatus = {state:'none', err:'', at:0, model:''};
/* 真正发一次最小请求探测大模型是否连通，结果反映到红/绿点 */
Victor._pingRetries = 0;
Victor.ping = function(opts){
  opts = opts||{};
  var api = SH.S.settings.api || {};
  if(!api.key){ Victor.apiStatus={state:'none', err:'未配置 API Key', at:Date.now()}; Victor.renderApiDot(); return; }
  Victor.apiStatus = {state:'testing', err:'连接中…', at:Date.now()}; Victor.renderApiDot();
  var sys = '你是'+SH.vName()+'，一个生活管理助手。只用一句话回复。';
  var recent = SH.S.chat.slice(-6).map(function(m){ return {role:m.role==='v'?'assistant':'user', content:(m.text||(m.img?'[图片]':'')+(m.sticker?'[表情]':''))}; });
  var url = (api.base||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions';
  var pCtrl = ('AbortController' in window) ? new AbortController() : null;
  var pTimer = setTimeout(function(){ if(pCtrl) pCtrl.abort(); }, 10000);
  var pOpts = {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.key},
    body:JSON.stringify({model:api.model||'gpt-4o-mini', temperature:0.5, max_tokens:8,
      messages:[{role:'system',content:sys}].concat(recent,[{role:'user',content:'ping'}])})
  };
  if(pCtrl) pOpts.signal = pCtrl.signal;
  fetch(url, pOpts).then(function(r){
    if(!r.ok){ return r.text().then(function(b){ return {ok:false, status:r.status, body:b}; }); }
    return r.json().then(function(j){ return {ok:true, status:r.status, body:j}; });
  }).then(function(res){
    if(res.ok && res.body && res.body.choices){
      Victor._pingRetries = 0;
      Victor.apiStatus = {state:'ok', err:'已连接 · '+api.model, at:Date.now(), model:api.model};
    } else if(res.ok){
      Victor._pingRetries = 0;
      Victor.apiStatus = {state:'ok', err:'已连接(响应异常) · '+api.model, at:Date.now(), model:api.model};
    } else {
      var msg = (res.body||'').replace(/\s+/g,' ').slice(0,160);
      Victor.apiStatus = {state:'fail', err:(res.status||'网络')+'：'+msg, at:Date.now()};
    }
    Victor.renderApiDot();
    if(!res.ok && opts.retry!==false && Victor._pingRetries < 3){ Victor._pingRetries++; setTimeout(function(){ Victor.ping({retry:true}); }, 3000*Victor._pingRetries); }
  }).catch(function(e){
    if(e && e.name==='AbortError'){ Victor.apiStatus={state:'fail', err:'连接超时(10秒)：网络差或 AI 未响应', at:Date.now()}; }
    else { Victor.apiStatus = {state:'fail', err:'请求被拦(CORS/网络)：'+(e&&e.message?e.message:e), at:Date.now()}; }
    Victor.renderApiDot();
    if(opts.retry!==false && Victor._pingRetries < 3){ Victor._pingRetries++; setTimeout(function(){ Victor.ping({retry:true}); }, 3000*Victor._pingRetries); }
  });
};
/* 把状态画到页面上所有 .apistat 元素（聊天页 / 首页 各一个） */
Victor.renderApiDot = function(){
  var s = Victor.apiStatus;
  var color = s.state==='ok' ? 'green' : s.state==='fail' ? 'red' : s.state==='testing' ? 'test' : 'gray';
  var label = s.state==='ok' ? 'AI 已连接' : s.state==='fail' ? 'AI 未连接' : s.state==='testing' ? '连接中…' : ((SH.S.settings.api&&SH.S.settings.api.key)?'未测试':'未配置');
  var tip = label + (s.err ? ('\n'+s.err) : '') + (s.state==='fail' ? '\n点此重试' : '');
  document.querySelectorAll('.apistat').forEach(function(el){
    el.className = 'apistat '+color;
    el.title = tip;
    var t = el.querySelector('.apistat-t'); if(t) t.textContent = label;
  });
};

/* ================= 聊天视图 ================= */
function renderLog(){
  var log = document.getElementById('chatlog');
  if(!log) return;
  log.innerHTML = S().chat.map(function(m){
    var time = SH.hm(new Date(m.t));
    var body, isStk = !!m.sticker;
    if(m.sticker){
      body = '<img class="stk" src="'+m.sticker+'" alt="表情包">';
    } else if(m.img){
      body = '<img src="'+m.img+'" alt="图片">'+(m.text?'<div style="margin-top:6px">'+SH.esc(m.text)+'</div>':'');
    } else if(m.voice && m.role==='v'){
      body = '<span class="voicebar" onclick="Victor.playVoice(this,\''+m.id+'\')">'+SH.icon('speaker','deep')+'<span class="wave"><i></i><i></i><i></i><i></i><i></i></span>'+Math.min(60,Math.ceil(m.text.length/4))+'″</span><div style="font-size:12px;opacity:.75;margin-top:5px">'+SH.esc(m.text)+'</div>';
    } else {
      body = SH.esc(m.text);
    }
    return '<div class="msg '+(m.role==='v'?'v':'u')+(isStk?' stkmsg':'')+'">'+
      (m.role==='v'?'<div class="avat">'+SH.esc(vn().slice(0,1).toUpperCase())+'</div>':'')+
      '<div class="bub'+(isStk?' stkbub':'')+'">'+body+'</div>'+(isStk?'':'<span class="time">'+time+'</span>')+'</div>';
  }).join('');
  Victor.scrollChatBottom(log);
}
/* 打开聊天/新增消息后滚到最新（底部）。rAF + 图片加载后补滚，避免停在历史记录 */
Victor.scrollChatBottom = function(log){
  if(!log) return;
  function go(){ log.scrollTop = log.scrollHeight; }
  go();
  requestAnimationFrame(go);
  Array.prototype.forEach.call(log.querySelectorAll('img'), function(img){
    if(!img.complete) img.addEventListener('load', go);
  });
};
/* 「正在输入…」气泡 */
function showTyping(){
  var log = document.getElementById('chatlog');
  if(!log || document.getElementById('vtyping')) return;
  var d = document.createElement('div');
  d.id = 'vtyping'; d.className = 'msg v';
  d.innerHTML = '<div class="avat">'+SH.esc(vn().slice(0,1).toUpperCase())+'</div>'+
    '<div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>';
  log.appendChild(d); Victor.scrollChatBottom(log);
}
function hideTyping(){ var d = document.getElementById('vtyping'); if(d && d.parentNode) d.parentNode.removeChild(d); }

Victor.playVoice = function(el, id){
  var m = S().chat.filter(function(x){return x.id===id;})[0];
  if(!m) return;
  el.classList.add('playing');
  SH.speak(m.text);
  setTimeout(function(){ el.classList.remove('playing'); }, Math.min(20000, m.text.length*220));
};

/* ================= 表情包 ================= */
Victor.openStickerTray = function(){
  var tray = document.getElementById('stickertray');
  if(!tray) return;
  var show = tray.classList.toggle('show');
  if(show) Victor.renderTray();
};
Victor.closeTray = function(){
  var tray = document.getElementById('stickertray');
  if(tray) tray.classList.remove('show');
};
Victor.renderTray = function(){
  var tray = document.getElementById('stickertray');
  if(!tray) return;
  var pack = S().stickers||[];
  var cells = pack.length ? pack.map(function(s,i){
    return '<button class="stcell" onclick="Victor.sendSticker('+i+')">'+
      '<img src="'+s.img+'" alt="表情">'+
      '<i class="stdel" onclick="event.stopPropagation();Victor.delSticker('+i+')">✕</i></button>';
  }).join('') : '<div class="stmty">还没有表情包，点「＋」上传你手机里的表情包～</div>';
  tray.innerHTML =
    '<div class="sthead"><span>我的表情包 · '+pack.length+'</span>'+
    '<label class="stadd">＋ 添加'+SH.icon('img')+'<input type="file" accept="image/*" multiple style="display:none" onchange="Victor.uploadStickers(this)"></label></div>'+
    '<div class="stgrid">'+cells+'</div>';
};
Victor.uploadStickers = function(input){
  var files = Array.prototype.slice.call(input.files||[]);
  input.value = '';
  if(!files.length) return;
  var pack = S().stickers || (S().stickers=[]);
  var done = 0, total = files.length;
  files.forEach(function(f){
    SH.compressImg(f, 220, function(d){
      pack.push({id:SH.uid(), img:d, added:SH.today()});
      if(++done === total){ SH.save(); Victor.renderTray(); SH.toast('已添加 '+total+' 个表情包'); }
    });
  });
};
Victor.sendSticker = function(i){
  var s = (S().stickers||[])[i];
  if(!s) return;
  Victor.closeTray();
  Victor.dispatch('', null, s.img);
};
Victor.delSticker = function(i){
  (S().stickers||[]).splice(i,1); SH.save(); Victor.renderTray(); SH.toast('已删除');
};
/* Victor 用你的表情包回你一条 */
Victor.postSticker = function(url){
  S().chat.push({id:SH.uid(), role:'v', sticker:url, t:new Date().toISOString()});
  SH.save();
  if(SH.cur==='chat') renderLog(); else SH.toast(vn()+' 发来一个表情包');
};

/* ================= 图片视觉识别 + 自动记饮食/记账 ================= */
/* 是否接了「能看图」的 AI 大脑 */
Victor.canVision = function(){
  var a = S().settings.api; if(!a || !a.key) return false;
  if(typeof a.vision === 'boolean') return a.vision;
  return /vl|vision|gpt-4o|moonshot-v1-8k|qwen[^ ]*(?:plus|max|vl)/i.test(a.model||'');
};
/* 结构化视觉识别：返回 {type:'food'|'payment'|'other', ...} */
Victor.vision = function(imgDataUrl, cb){
  var api = S().settings.api;
  var sys = '你是一个图片识别助手。用户会发一张图片。请严格只返回一个 JSON 对象，不要任何解释、不要 markdown 代码块。\n'+
    '判断图片类型并提取信息：\n'+
    '1) 如果是食物/餐食/外卖照片：返回 {"type":"food","name":"菜名，用中文，多个菜用顿号分隔","kcal":估算总热量整数(千卡，宁高勿低)}\n'+
    '2) 如果是支付/转账/账单/收款截图：返回 {"type":"payment","amount":数字(元，即本次扣款/转账金额),"payee":"收款方或商户名(中文，没有则空字符串)"}\n'+
    '3) 如果是其他：返回 {"type":"other","desc":"用一句话中文描述图片内容"}\n'+
    '只输出 JSON。';
  var done = false;
  var vCtrl = ('AbortController' in window) ? new AbortController() : null;
  var vTimer = setTimeout(function(){ if(vCtrl) vCtrl.abort(); }, 40000);
  function vreply(a, e){ if(done) return; done = true; if(vTimer) clearTimeout(vTimer); cb(a, e); }
  var vUrl = (api.base||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions';
  var vOpts = {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.key},
    body:JSON.stringify({model:api.model||'gpt-4o-mini', temperature:0, max_tokens:300,
      messages:[
        {role:'system',content:sys},
        {role:'user',content:[{type:'text',text:'请识别这张图片并按规则返回 JSON。'},{type:'image_url',image_url:{url:imgDataUrl}}]}
      ]})
  };
  if(vCtrl) vOpts.signal = vCtrl.signal;
  fetch(vUrl, vOpts).then(function(r){
    if(!r.ok){ return r.text().then(function(t){ vreply(null, {status:r.status, body:t.slice(0,300)}); }); }
    return r.json();
  }).then(function(j){
    if(j && j.choices && j.choices[0]) vreply(Victor.parseVision(j.choices[0].message.content), null);
    else vreply(null, {status:200, body:(j&&j.error&&(j.error.message||JSON.stringify(j.error)))||'返回为空'});
  }).catch(function(e){
    if(e && e.name==='AbortError'){ vreply(null, {status:0, body:'timeout'}); return; }
    vreply(null, {status:0, body:String(e&&e.message||e)});
  });
};
Victor.parseVision = function(txt){
  if(!txt) return null;
  try{
    var m = txt.match(/\{[\s\S]*\}/);
    if(!m) return null;
    var o = JSON.parse(m[0]);
    if(o.type==='food') o.kcal = parseFloat(o.kcal)||0;
    if(o.type==='payment') o.amount = parseFloat(o.amount)||0;
    return o;
  }catch(e){ return null; }
};
/* 解析"这是昨天的/前天的/昨晚的/3月5日的" → 返回 YYYY-MM-DD 或 null */
Victor.parseMealDate = function(text){
  var now = SH.bjNow(), d;
  if(/昨天|昨儿/.test(text)){ d = new Date(now); d.setDate(d.getDate()-1); return SH.dstr(d); }
  if(/大前天/.test(text)){ d = new Date(now); d.setDate(d.getDate()-3); return SH.dstr(d); }
  if(/前天/.test(text)){ d = new Date(now); d.setDate(d.getDate()-2); return SH.dstr(d); }
  var ds = parseDate(text); /* X月X日 / 今天 / 明天 / 后天 */
  if(ds) return ds;
  return null;
};
/* 记一笔饮食：ds 缺省记今天；按时间/措辞推断早午晚加餐。补全全部营养字段，避免饮食页渲染崩溃 */
Victor.logMeal = function(name, kcal, ds, when){
  var dateStr = ds || SH.today();
  if(!when){
    if(ds){ /* 过去某天，按菜名措辞推断 */
      when = /早/.test(name||'')?'早餐':/午|中饭|中餐/.test(name||'')?'午餐':/下/.test(name||'')?'下午茶':'晚餐';
    } else {
      var h = SH.bjNow().getHours();
      when = h<10?'早餐':h<14?'午餐':h<17?'下午茶':'晚餐';
    }
  }
  if(!SH.S.meals[dateStr]) SH.S.meals[dateStr] = [];
  SH.S.meals[dateStr].push({id:SH.uid(), name:name, qty:1, k:Math.max(0,Math.round(kcal||0)),
    p:0,c:0,f:0,vc:0,ca:0,vd:0,o3:0,
    meal: when==='早餐'?'breakfast':when==='午餐'?'lunch':when==='下午茶'?'snack':'dinner', when:when, t:new Date(dateStr+'T12:00:00').toISOString()});
  SH.save();
  Victor._lastMealLog = Date.now();
  Victor.remember('饮食：'+name+'('+Math.round(kcal||0)+'kcal) @'+dateStr, 4, {tags:['饮食']});
};
/* 记一笔支出（支付截图识别后调用） */
Victor.logExpense = function(amount, payee){
  var t = SH.today();
  if(!SH.S.expenses) SH.S.expenses = [];
  var amt = Math.max(0, Math.round(amount*100)/100);
  SH.S.expenses.push({id:SH.uid(), date:t, amount:amt, cat: payee||'其他',
    note:'截图记账'+(payee?' · '+payee:''), t:new Date().toISOString()});
  SH.save();
  Victor.remember('支出：'+(payee||'')+' '+amt+'元', 4, {tags:['记账']});
};
Victor.foodReply = function(r, ds, when){
  var dayLabel = (when? (when+' · ') : '') + (ds ? ds+' ' : '今天');
  var left = Math.max(0, SH.S.profile.kcalTarget - Victor.todayView().kcal);
  var parts = [
    '收到，这是「'+r.name+'」。我大概估了 '+Math.round(r.kcal||0)+' kcal，已经记进'+dayLabel+'的饮食了。',
    '「'+r.name+'」——'+Math.round(r.kcal||0)+' kcal，记下了，归到'+dayLabel+'那顿。'+(ds?'（今天的热量没算它。）':'今天还剩 '+Math.round(left)+' kcal 额度，悠着点。'),
    '好嘞，「'+r.name+'」'+Math.round(r.kcal||0)+' kcal 入账'+(ds?'（记在'+ds+'）':'，这顿吃得不错')+'。'
  ];
  return pick(parts);
};
Victor.payReply = function(r){
  var amt = Math.round(r.amount*100)/100;
  var parts = [
    '记下了：'+(r.payee||'这笔')+' 花了 '+amt+' 元，已经帮你记到账单里。',
    '「'+(r.payee||'支出')+'」'+amt+' 元，记账完成。这个月再看看整体花销。',
    '收到截图，'+amt+' 元（'+(r.payee||'未识别商户')+'）已入账。'
  ];
  return pick(parts);
};
/* 没接能看图的 AI 时，诚实兜底 + 引导用户手动记 */
Victor.cantSee = function(text){
  var nm = callName();
  return pick([
    '图片我收到了，但我现在没有"能看图"的眼睛——去「设置」给我配一个支持看图的 AI 大脑（OpenAI / 通义千问 / Moonshot 都行，DeepSeek 暂时看不了图），我就能真正认出你发的是晚饭还是支付截图。\n不过现在你可以直接告诉我：是吃的我就帮你记热量，是花钱我就帮你记账。',
    '这张图我看不清细节。'+nm+'，如果是晚饭，直接说菜名我帮你记；是账单就把金额发我，我帮你记账。想让我自动识别的话，去设置里接个能看图的大脑就好。'
  ]);
};
/* 图片主流程：识别 → 落库 → 回复 */
Victor.handleImage = function(text, img, done){
  Victor.vision(img, function(res, err){
    hideTyping();
    if(res && res.type==='food'){
      var ds = Victor.parseMealDate(text);
      var when = Victor.parseWhen(text);
      Victor.logMeal(res.name||'这顿饭', res.kcal||0, ds, when);
      Victor.post(Victor.foodReply(res, ds, when), {voice:false});
    } else if(res && res.type==='payment'){
      Victor.logExpense(res.amount||0, res.payee||'');
      Victor.post(Victor.payReply(res), {voice:false});
    } else if(res && res.type==='other'){
      Victor.ai(text || '看看这张图片', img, null, function(ans, err2){
        if(ans){ Victor.post(ans, {voice:false}); }
        else { Victor.post(err2 ? ('⚠️ 看图描述失败（'+(err2.status||'网络')+'）：'+(err2.body||'')+'。去设置检查 Key / 模型是否支持看图。') : ('这是'+(res.desc||'一张图片')+'。需要我记点什么吗？'), {voice:false}); }
        done();
      });
      return;
    } else if(err){
      Victor.post('⚠️ 看图识别失败（'+(err.status||'网络')+'）：'+(err.body||'')+'。去设置检查：Key 是否有效、模型是否支持看图（如 qwen-vl-plus / qwen3.7-plus / gpt-4o）。', {voice:false});
    } else {
      Victor.post('这张图我看了，但没太确定是吃的还是账单。如果是晚饭告诉我是啥菜，我帮你记热量；如果是支付截图，告诉我金额我帮你记账～', {voice:false});
    }
    done();
  });
};

/* ================= 自然语言意图：识别你"说的话"，直接增删 账单/接单 ================= */
/* 常见食物热量字典（离线估算用，单位 kcal） */
Victor.FOODS = {'水':0,'矿泉水':0,'牛奶':150,'酸奶':100,'豆浆':80,'鸡蛋':70,'煎蛋':90,'面包':80,'吐司':80,'包子':120,'馒头':110,'米饭':200,'面条':300,'面':280,'粥':100,'燕麦':150,'香蕉':100,'苹果':95,'橙子':50,'梨':50,'葡萄':70,'草莓':30,'西瓜':30,'咖啡':5,'美式':5,'拿铁':120,'奶茶':300,'可乐':140,'果汁':120,'鸡胸':120,'鸡腿':200,'牛肉':250,'猪肉':300,'鱼肉':120,'虾':80,'三文鱼':200,'豆腐':80,'青菜':30,'西兰花':35,'番茄':20,'黄瓜':15,'土豆':150,'红薯':120,'玉米':100,'披萨':250,'汉堡':500,'沙拉':150,'坚果':200,'巧克力':500,'蛋糕':350,'饼干':150};
Victor.foodKcal = function(name){
  var total=0, hit=false;
  for(var k in Victor.FOODS){ if(name && name.indexOf(k)>=0){ total+=Victor.FOODS[k]; hit=true; } }
  return hit?total:null;
};
/* 识别"早上/中午/晚上"等，决定记到哪一顿 */
Victor.parseWhen = function(text){
  if(/早上|早晨|一早|起床|清早|上午|早饭|早餐/.test(text)) return '早餐';
  if(/中午|午饭|午餐|中饭|午间/.test(text)) return '午餐';
  if(/下午|加餐|下午茶/.test(text)) return '下午茶';
  if(/晚上|傍晚|晚饭|晚餐|夜宵|夜里|睡前|夜晚/.test(text)) return '晚餐';
  return null;
};
/* 账单：花了 X 元（买 Y） */
Victor.expenseIntent = function(text){
  if(/花了多少|花了吗|多少钱|贵吗|预算|花销大吗|值不值|划不划算|花得值/.test(text)) return null;
  var num = text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|块钱|元钱|￥|¥|\$|刀|软妹币|毛)?/);
  if(!num) return null;
  if(!/花|花了|花费|支出|付了|付钱|支付|转账|消费|记账|记一笔|买|买了|充值|充了|缴费|交了|交费|借了|还了|收了|赚了|报销|扣了|扣款|花了钱/.test(text)) return null;
  var amount = parseFloat(num[1]);
  var desc = text.replace(/(?:花|花了|花费|支出|付了|付钱|支付|转账|消费|记账|记一笔|买了?|充值?|充了?|缴了?费|交了?费?|借了?|还了?|收了?|赚了?|报销|扣了?款?)\s*(?:了)?/g,'')
    .replace(num[0],'').replace(/[了的吗呢啊吧哦块钱元￥¥$刀]/g,'').replace(/^(买|购|在|给|向|去|和|跟|与|替)\s*/,'').trim();
  return {amount:amount, cat:desc||'支出'};
};
Victor.resolveDate = function(text){
  var now = SH.bjNow(), y = now.getFullYear();
  var m1 = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if(m1) return y+'-'+('0'+m1[1]).slice(-2)+'-'+('0'+m1[2]).slice(-2);
  var m2 = text.match(/(\d{1,2})[.\/](\d{1,2})/);
  if(m2) return y+'-'+('0'+m2[1]).slice(-2)+'-'+('0'+m2[2]).slice(-2);
  if(/大后天/.test(text)){ var d3=new Date(now); d3.setDate(d3.getDate()+3); return SH.dstr(d3); }
  if(/后天/.test(text)){ var d2=new Date(now); d2.setDate(d2.getDate()+2); return SH.dstr(d2); }
  if(/明天|次日|明早/.test(text)){ var d1=new Date(now); d1.setDate(d1.getDate()+1); return SH.dstr(d1); }
  if(/今天|今晚|今早|此刻/.test(text)) return SH.today();
  return null;
};
/* ================= 接单意图：接单 / 改稿 / 结单 ================= */
/* 新增：「接了个机甲模型，收费1200，8月20日交」 */
Victor.orderIntent = function(text){
  if(!SH.hasView('order')) return null;
  if(!/(接单|接了|接个|新接|接到|开个单|来个单|加个单|新建单)/.test(text)) return null;
  if(/删除|删掉|取消|不要了/.test(text)) return null;
  var feeM = text.match(/(?:收费|价格|费用|报酬|稿费)\s*(\d+(?:\.\d+)?)/)
          || text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|块钱|rmb)/i);
  var fee = feeM ? parseFloat(feeM[1]) : 0;
  var name = text
    .replace(/(接单|接了|接个|新接|接到|开个单|来个单|加个单|新建单)/g,' ')
    .replace(/(收费|价格|费用|报酬|稿费)\s*\d+(\.\d+)?\s*(元|块|块钱)?/g,' ')
    .replace(/\d+(\.\d+)?\s*(元|块|块钱|rmb)/gi,' ')
    .replace(/\d{1,2}\s*月\s*\d{1,2}\s*[日号]/g,' ')
    .replace(/\d{1,2}[.\/]\d{1,2}/g,' ')
    .replace(/(截止|交稿|deadline|due)/gi,' ')
    .replace(/(今天|明天|后天|大后天)/g,' ')
    .replace(/(一个|这个|帮|我|要|想|给|了|的|个)/g,' ')
    .replace(/(模型|单子|订单)/g,' ')
    .replace(/[，,。！!？?、:：]/g,' ')
    .replace(/\s+/g,' ').trim();
  return {name:(name||'新单').slice(0,20), fee:fee, due:Victor.resolveDate(text), start:SH.today()};
};
/* 改稿：「改了一版」「又改了一次」→ 修改次数 +1 */
Victor.revIntent = function(text){
  if(!SH.hasView('order')) return null;
  if(!/(改了|改一|又改|修改|改动|返修|返稿)/.test(text)) return null;
  if(!/(一版|一次|一稿|一遍|一下|版|次|稿)/.test(text)) return null;
  return {n:1};
};
/* 结单：「XX 做完了 / 交稿了」 */
Victor.finishIntent = function(text){
  if(!SH.hasView('order')) return null;
  if(!/(结单|交稿|做完了|完成了|搞定了|收工|交付了)/.test(text)) return null;
  return {name:text};
};
/* 自建模型：「自建了个OC」「捏了个原创，发小红书了」 */
Victor.selfIntent = function(text){
  if(!SH.hasView('auth')) return null;
  if(!/(自建|自己建模|自己做的|自己做个|自建模|捏了个|捏了|做个展示|做个原创|原创模型|自设)/.test(text)) return null;
  if(/删除|删掉|取消|不要了/.test(text)) return null;
  var feeM = text.match(/(?:授权|到手|收入|卖|变现)\s*(\d+(?:\.\d+)?)/) || text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|块钱|rmb)/i);
  var fee = feeM ? parseFloat(feeM[1]) : 0;
  var name = text
    .replace(/(自建|自己建模|自己做的|自己做个|自建模|捏了个|捏了|做个|做了个|展示|原创|自设)/g,' ')
    .replace(/(授权|到手|收入|卖|变现)\s*\d+(\.\d+)?\s*(元|块|块钱)?/g,' ')
    .replace(/\d+(\.\d+)?\s*(元|块|块钱|rmb)/gi,' ')
    .replace(/(了|的|个|一?个|我|想|给|帮|去|发)/g,' ')
    .replace(/(模型|单子|订单|小红书|抖音|闲鱼)/g,' ')
    .replace(/[，,。！!？?、:：]/g,' ')
    .replace(/\s+/g,' ').trim();
  return {name:(name||'自设').slice(0,20), fee:fee, type:'self', authorized: fee>0};
};
/* 授权 / 变现：「XX 授权了，到手800」「收了尾款800」 */
Victor.authIntent = function(text){
  if(!SH.hasView('auth')) return null;
  if(/接单|接了|新接|开单|来个单|加个单|新建单/.test(text)) return null;
  if(!/(授权|卖出去|卖掉了|卖了|授权费|到手|收了尾款|收尾款|成交|变现)/.test(text)) return null;
  if(/删除|删掉|取消|不要了/.test(text)) return null;
  var feeM = text.match(/(?:授权|到手|收入|卖|尾款|成交|变现)\s*(\d+(?:\.\d+)?)/) || text.match(/(\d+(?:\.\d+)?)\s*(?:元|块|块钱|rmb)/i);
  var fee = feeM ? parseFloat(feeM[1]) : 0;
  return {name:text, fee:fee};
};
/* 找出文字点名的那单，没点名就取最近要交的那单 */
function pickOrder(text){
  var doing = (SH.S.orders||[]).filter(function(o){return !o.end;});
  if(!doing.length) return null;
  var hit = null;
  doing.forEach(function(o){ if(o.name && text.indexOf(o.name)>=0) hit = o; });
  if(!hit){
    doing.sort(function(a,b){ var da=a.due||'9999-99-99', db=b.due||'9999-99-99'; return da<db?-1:1; });
    hit = doing[0];
  }
  return hit;
}
/* 删除/取消 各类 */
Victor.delIntent = function(text){
  if(!/(删除|删掉|删了|去掉|移除|取消|撤掉|不要了|划掉|清除|删去)/.test(text)) return null;
  if(/计划|挑战|训练营|打卡任务/.test(text)) return {domain:'plan', key:text};
  if(/账单|支出|花销|花钱|花(?:了|的)|记账|钱|消费/.test(text)) return {domain:'expense', key:text};
  return {domain:'generic', key:text};
};
/* 分类：决定这条消息走不走"自动改数据" */
Victor.classify = function(text, img){
  text = text||'';
  var del = Victor.delIntent(text); if(del) return {op:'del', domain:del.domain, key:del.key};
  var au = Victor.authIntent(text);  if(au)  return {op:'auth', domain:'order', auth:au};
  var od = Victor.orderIntent(text);  if(od)  return {op:'add', domain:'order', order:od};
  var sf = Victor.selfIntent(text);   if(sf)  return {op:'add', domain:'order', order:sf};
  var rv = Victor.revIntent(text);    if(rv)  return {op:'rev', domain:'order', rev:rv};
  var fn = Victor.finishIntent(text); if(fn)  return {op:'fin', domain:'order', fin:fn};
  var exp = Victor.expenseIntent(text);
  if(exp){ if(!SH.hasView('money')) return null; return {op:'add', domain:'expense', exp:exp}; }
  return null;
};
Victor.route = function(text, img, afterText){
  var intent = Victor.classify(text, img);
  if(!intent) return false;
  Victor.execIntent(intent, text, img, afterText);
  return true;
};
/* 让 AI 单独估算热量（结构化 JSON） */
Victor.aiExtract = function(name, cb){
  var api = S().settings.api;
  var sys = '你是营养估算助手。用户吃了一顿饭，主要食物是：'+name+'。请只返回一个 JSON 对象：{"kcal":估算这顿总热量整数(千卡，宁高勿低)}。不要解释，不要 markdown 代码块。';
  fetch((api.base||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions',{
    method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+api.key},
    body:JSON.stringify({model:api.model||'gpt-4o-mini', temperature:0, max_tokens:60,
      messages:[{role:'system',content:sys},{role:'user',content:'估算热量'}]})
  }).then(function(r){ if(!r.ok) return null; return r.json(); }).then(function(j){
    try{ var c=j&&j.choices&&j.choices[0].message.content.match(/(\d+)/); cb(c?parseInt(c[1],10):0); }
    catch(e){ cb(0); }
  }).catch(function(){ cb(0); });
};
/* 统一确认：本地先给一句，接了 AI 就让 AI 用自己的语气确认 */
function victorConfirm(localReply, text, img, done){
  Victor.hit = true; Victor.actNote = localReply;
  if(S().settings.api.key){
    Victor.ai(text || (img?'[图片]':''), img||null, localReply, function(ans, err){
      Victor.post(ans || localReply, {onDone:done});
    });
  } else {
    Victor.post(localReply, {onDone:done});
  }
}
/* 执行各类意图 */
Victor.execIntent = function(intent, text, img, done){
  if(intent.op==='del'){ Victor.execDelete(intent, text, img, done); return; }
  if(intent.domain==='order'){ Victor.execOrder(intent, text, img, done); return; }
  if(intent.domain==='expense') Victor.execExpense(intent, text, img, done);
  else Victor.post('这个我暂时还不会自动记，去对应的页面手动加一下？', {onDone:done});
};
Victor.execOrder = function(intent, text, img, done){
  if(!SH.S.orders) SH.S.orders = [];
  var t = SH.today();
  if(intent.op==='add'){
    var od = intent.order||{};
    var isSelf = od.type==='self';
    var ord = {id:SH.uid(), name:od.name||(isSelf?'自设':'新单'), type:isSelf?'self':'client', category:'', share:{xhs:false,dy:false,xy:false},
      client: isSelf?'':(od.client||''), fee:isSelf?0:(od.fee||0),
      authorized: isSelf ? !!od.authorized : false, authFee: isSelf ? (od.fee||0) : 0,
      start:od.start||t, due:od.due||'', end: isSelf && od.authorized ? t : '', rev:0, revLog:[], note:'', pic:''};
    SH.S.orders.push(ord); SH.save();
    if(SH.cur==='order'||SH.cur==='auth') SH.refresh();
    victorConfirm(isSelf
      ? ('记下了自设「'+ord.name+'」'+(od.authorized?('，已授权到手 ¥'+od.fee):'。去授权页勾发布平台、授权后转粉色')+'。')
      : ('记下了新单「'+ord.name+'」'+(ord.fee?('，收费 ¥'+od.fee):'')+(od.due?('，截止 '+od.due):'')+'。去接单页看排单～'),
      text, img, done);
    return;
  }
  if(intent.op==='auth'){
    var au = intent.auth||{}; var amt = au.fee||0;
    var cand = (SH.S.orders||[]).filter(function(o){ return !SH.modelPaid(o); });
    var tg = null;
    cand.forEach(function(o){ if(o.name && au.name && au.name.indexOf(o.name)>=0) tg = o; });
    if(!tg && cand.length) tg = cand[cand.length-1];
    if(!tg){
      var nm = (au.name||'').replace(/(授权|到手|卖|收尾款|成交|变现|了|的|我|给|帮)/g,'').trim().slice(0,20) || '自设';
      var nw = {id:SH.uid(), name:nm, type:'self', category:'', share:{xhs:false,dy:false,xy:false},
        client:'', fee:0, authorized:true, authFee:amt, start:t, due:'', end:t, rev:0, revLog:[], note:'', pic:''};
      SH.S.orders.push(nw); SH.save();
      if(SH.cur==='order'||SH.cur==='auth') SH.refresh();
      victorConfirm('记下了自设「'+nm+'」，已授权到手 ¥'+amt+'，转粉色～', text, img, done);
      return;
    }
    if(tg.type==='self'){ tg.authorized=true; tg.authFee=amt; } else { tg.fee=amt; }
    if(!tg.end) tg.end = t;
    SH.save();
    if(SH.cur==='order'||SH.cur==='auth') SH.refresh();
    victorConfirm('「'+tg.name+'」已记收入 ¥'+amt+(tg.type==='self'?'（授权）':'（收费）')+'，转粉色啦～', text, img, done);
    return;
  }
  if(intent.op==='rev'){
    var tg = pickOrder(text);
    if(!tg){ Victor.post('现在有 '+(SH.S.orders||[]).filter(function(o){return !o.end;}).length+' 个在做的单，告诉我是哪个改稿了？', {onDone:done}); return; }
    tg.rev = (tg.rev||0)+1; if(!tg.revLog) tg.revLog=[]; tg.revLog.push(t); SH.save();
    if(SH.cur==='order') SH.refresh();
    victorConfirm('「'+tg.name+'」改稿 +1，现在是第 '+tg.rev+' 版。', text, img, done);
    return;
  }
  if(intent.op==='fin'){
    var tg2 = pickOrder(text);
    if(!tg2){ Victor.post('没找到要结的单，去接单页确认下名字？', {onDone:done}); return; }
    tg2.end = t; SH.save();
    if(SH.cur==='order') SH.refresh();
    victorConfirm('「'+tg2.name+'」结单啦🎉 收工日 '+t+'。记得收尾款～', text, img, done);
    return;
  }
};
Victor.execExpense = function(intent, text, img, done){
  var amount = intent.exp.amount, cat = intent.exp.cat;
  if(!amount){ Victor.post('这笔多少钱？告诉我金额我就帮你记。', {onDone:done}); return; }
  Victor.logExpense(amount, cat);
  victorConfirm('记下了：'+(cat&&cat!=='支出'?cat+' ':'')+amount+' 元，已经进账单。这个月花销我帮你盯着。', text, img, done);
};
Victor.execDelete = function(intent, text, img, done){
  var r = Victor.doDelete(intent.domain, text);
  Victor.hit = !!r;
  if(r){ victorConfirm(r, text, img, done); }
  else {
    if(S().settings.api.key){ Victor.ai(text, img, null, function(ans){ Victor.post(ans || '没找到要删的那条，去对应的页面里手动删吧～', {onDone:done}); }); }
    else Victor.post('没找到要删的那条，去对应的页面里手动删吧～', {onDone:done});
  }
};
Victor.doDelete = function(domain, text){
  var t = SH.today();
  if(domain==='expense'){
    var ea = SH.S.expenses.filter(function(x){return x.date===t;});
    if(ea.length){ var e=ea[ea.length-1]; SH.S.expenses = SH.S.expenses.filter(function(x){return x!==e;}); SH.save(); return '今天最后一笔账单（'+e.amount+' 元）删掉了。'; }
    return '';
  }
  if(domain==='plan'){
    if(SH.S.plans.length){ var p=SH.S.plans.pop(); SH.save(); return '把计划「'+p.title+'」删掉了（日历里对应的安排也在，需要的话我一起清）。'; }
    return '';
  }
  return '';
};

var pendingImg = null;
Victor.send = function(){
  var inp = document.getElementById('chatinput');
  var text = inp.value.trim();
  if(!text && !pendingImg) return;
  var img = pendingImg; pendingImg = null;
  document.getElementById('imgpreview').innerHTML = '';
  inp.value = '';
  Victor.dispatch(text, img, null);
};
/* 统一收发：text 文字 / img 图片 / sticker 表情包 */
Victor.dispatch = function(text, img, sticker){
  var msg = {id:SH.uid(), role:'u', text:text||'', t:new Date().toISOString()};
  if(img) msg.img = img;
  if(sticker) msg.sticker = sticker;
  S().chat.push(msg); SH.save(); renderLog(); showTyping();
  var useAI = !!S().settings.api.key;
  var pack = S().stickers||[];
  var userSentSticker = !!sticker;
  /* 助手是否也甩一张你的表情包回去 */
  var victorSticker = null;
  if(pack.length){
    var p = userSentSticker ? 0.55
      : (/开心|哈哈|哈|谢|爱|❤|讨厌|烦|无聊|在吗|在不在|早安|早|晚安|拜拜|emo|难过|累|想你|么么|🥰|😊|😂|🥺|😭/.test(text||'') ? 0.35 : 0.1);
    if(Math.random() < p) victorSticker = pick(pack).img;
  }
  function afterText(){ hideTyping(); if(victorSticker) setTimeout(function(){ Victor.postSticker(victorSticker); }, 450); }

  /* 自然语言意图：识别"记/删 账单·接单"，直接帮你改数据 */
  if(Victor.route(text, img, afterText)) return;

  /* 图片优先走视觉识别（自动记饮食/记账），不绕进闲聊 */
  if(img){
    if(Victor.canVision()){
      Victor.handleImage(text, img, afterText);
    } else {
      hideTyping();
      Victor.post(Victor.cantSee(text), {voice:false});
      afterText();
    }
    return;
  }

  setTimeout(function(){
    if(useAI){
      var local = userSentSticker ? null : Victor.reply(text, img);
      var note = Victor.hit ? local : null;
      /* 用户发表情包：把表情包原图也发给 AI，让能看图的模型真正"看懂"并接住情绪，别再问"这是什么意思" */
      var aiText = text || (userSentSticker ? '我刚发了一张表情包给你。如果它表达的是开心、无奈、调侃、难过或想撒娇这类情绪，请像朋友一样直接接住并回应，别问"这是什么意思"。' : '');
      var aiImg = img || null;
      if(userSentSticker && !text && Victor.canVision()) aiImg = sticker;
      Victor.ai(aiText, aiImg, note, function(ans, err){
        var r = ans;
        if(!r){
          if(err){
            var why = (err.status===401||err.status===403) ? 'API Key 无效或没权限（去设置检查 Key）'
              : (err.status===404) ? '模型名不存在（当前填的「'+(S().settings.api.model||'')+'」在服务商那里找不到，去设置改对 model 名）'
              : (err.status===0) ? '网络请求失败（检查 Base 地址，或网络是否拦截了请求）'
              : ('HTTP '+err.status);
            r = '⚠️ 调 AI 大脑失败了（'+(err.status||'网络')+'）：'+why+'。\n我先用本地模式回了你——但没接上真 AI 确实不够聪明。去「设置」把 Key / 模型名 / Base 改对就恢复正常了。';
          } else { r = local || (userSentSticker ? pick(['收到你的表情包了😆','这个我存下了，下次我也用','哈哈哈这个好','表情包已收下，准了']) : '（网络开小差了一下，再说一遍？）'); }
        }
        Victor.post(r, {voice:false, onDone: afterText});
      });
    } else {
      var r2 = Victor.reply(text, img);
      if(userSentSticker && !text) r2 = pick(['收到你的表情包了😆','这个我存下了，下次我也用','哈哈哈这个好','表情包已收下，准了']);
      Victor.post(r2, {voice: /睡觉|晚安|骂|语音/.test(text||''), onDone: afterText});
    }
  }, 500 + Math.random()*600);
};
Victor.attachImg = function(input){
  var f = input.files[0]; if(!f) return;
  SH.compressImg(f, 480, function(dataUrl){
    pendingImg = dataUrl;
    document.getElementById('imgpreview').innerHTML = '<img src="'+dataUrl+'" style="height:56px;border-radius:14px;box-shadow:var(--sh-sm)"> <button class="clay-chip" onclick="Victor.clearImg()">✕ 取消</button>';
  });
  input.value = '';
};
Victor.clearImg = function(){ pendingImg = null; document.getElementById('imgpreview').innerHTML = ''; };
Victor.voiceAsk = function(){
  var last = S().chat.filter(function(m){return m.role==='v';}).slice(-1)[0];
  if(last) { SH.speak(last.text); SH.toast('正在播放 '+vn()+' 的语音'); }
};

Views.chat = { render: function(root){
  root.innerHTML =
    '<div class="vhead">'+SH.icon('chat')+'<h2>'+SH.esc(vn())+'</h2>'+
    '<div class="right"><button class="apistat gray" onclick="Victor.ping()" title="点击测试与 AI 大模型的连接"><i></i><span class="apistat-t">未配置</span></button><button class="clay-btn mini ghost" onclick="Victor.voiceAsk()">'+SH.icon('speaker')+'重听</button></div></div>'+
    '<div class="chatwrap"><div id="chatlog"></div>'+
    '<div id="imgpreview" style="padding:4px 0;flex:none"></div>'+
    '<div id="stickertray" class="stickertray"></div>'+
    '<div class="chatstat"><button class="apistat gray" onclick="Victor.ping()" title="AI 连接状态（点击重测）"><i></i><span class="apistat-t">未配置</span></button></div>'+
    '<div class="chatin">'+
      '<label class="clay-btn mini ghost" style="padding:10px 12px" title="发图片">'+SH.icon('camera')+'<input type="file" accept="image/*" style="display:none" onchange="Victor.attachImg(this)"></label>'+
      '<button class="clay-btn mini ghost" style="padding:10px 12px" onclick="Victor.openStickerTray()" title="表情包">'+SH.icon('img')+'</button>'+
      '<input id="chatinput" class="clay-input" placeholder="跟 '+SH.esc(vn())+' 说点什么…" style="flex:1" onkeydown="if(event.key===\'Enter\')Victor.send()">'+
      '<button class="clay-btn" style="padding:11px 16px" onclick="Victor.send()">'+SH.icon('send','white')+'</button>'+
    '</div></div>';
  renderLog();
  if(window.Victor){
    Victor.renderApiDot();
    /* 打开聊天页就自动探测一次：未测/失败则尝试自愈合（红点自己变绿），不用手动点 */
    if(SH.S.settings.api.key && Victor.apiStatus.state!=='ok' && Victor.apiStatus.state!=='testing') Victor.ping({retry:true});
  }
}};
})();
