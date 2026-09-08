/* StarHub 数据库：食物 / 运动MET / 视频灵感池 / 书单播客 / 预设计划 */
(function(){
window.DATA = {};

/* 食物库：n名称 u单位 k热量 p蛋白 c碳水 f脂肪 vc维C(mg) ca钙(mg) vd维D(μg) o3鱼油Ω3(mg) */
DATA.FOODS = [
{n:'米饭',u:'1碗(150g)',k:174,p:3.9,c:38.9,f:0.5,ca:7},
{n:'白粥',u:'1碗(300g)',k:138,p:3.3,c:29.7,f:0.9,ca:9},
{n:'馒头',u:'1个(100g)',k:223,p:7,c:47,f:1.1,ca:38},
{n:'全麦面包',u:'2片(70g)',k:174,p:7.4,c:29.4,f:2.4,ca:36},
{n:'燕麦片',u:'1份(40g)',k:151,p:6,c:24.5,f:2.6,ca:74},
{n:'鸡蛋',u:'1个(50g)',k:72,p:6.3,c:0.4,f:4.8,ca:28,vd:1.1},
{n:'牛奶',u:'1杯(250ml)',k:135,p:8,c:12,f:6,ca:260,vd:1.2},
{n:'酸奶',u:'1杯(200g)',k:144,p:5,c:18,f:5.4,ca:236},
{n:'豆浆',u:'1杯(250ml)',k:70,p:6,c:5,f:3,ca:25},
{n:'鸡胸肉',u:'1份(100g)',k:118,p:24.6,c:0.6,f:1.9,ca:11},
{n:'牛肉',u:'1份(100g)',k:125,p:20,c:0,f:4.6,ca:6},
{n:'猪瘦肉',u:'1份(100g)',k:143,p:20.3,c:1.5,f:6.2,ca:6},
{n:'三文鱼',u:'1份(100g)',k:208,p:20,c:0,f:13,ca:13,vd:11,o3:2200},
{n:'虾',u:'1份(100g)',k:93,p:18.6,c:2.8,f:0.8,ca:62},
{n:'豆腐',u:'1份(150g)',k:122,p:12.2,c:2.9,f:7,ca:246},
{n:'西兰花',u:'1份(150g)',k:50,p:6.2,c:6.5,f:0.9,vc:77,ca:75},
{n:'菠菜',u:'1份(150g)',k:42,p:4,c:6.7,f:0.5,vc:47,ca:99},
{n:'番茄',u:'1个(150g)',k:22,p:1.4,c:5,f:0.3,vc:21,ca:15},
{n:'黄瓜',u:'1根(200g)',k:32,p:1.6,c:5.8,f:0.4,vc:18,ca:48},
{n:'生菜沙拉',u:'1份(200g)',k:60,p:2.4,c:6,f:3,vc:26,ca:70},
{n:'胡萝卜',u:'1根(120g)',k:47,p:1.2,c:10.3,f:0.2,vc:16,ca:38},
{n:'玉米',u:'1根(200g)',k:212,p:8,c:45,f:2.4,vc:16,ca:6},
{n:'红薯',u:'1个(200g)',k:198,p:2.8,c:46,f:0.4,vc:52,ca:46},
{n:'土豆',u:'1个(200g)',k:162,p:4,c:35,f:0.4,vc:54,ca:16},
{n:'苹果',u:'1个(200g)',k:104,p:0.4,c:27.2,f:0.4,vc:8,ca:8},
{n:'香蕉',u:'1根(120g)',k:112,p:1.7,c:26.4,f:0.2,vc:10,ca:8},
{n:'橙子',u:'1个(180g)',k:85,p:1.4,c:20,f:0.4,vc:59,ca:36},
{n:'蓝莓',u:'1盒(125g)',k:71,p:0.9,c:18,f:0.4,vc:12,ca:8},
{n:'草莓',u:'1份(150g)',k:48,p:1.5,c:10.7,f:0.3,vc:70,ca:27},
{n:'猕猴桃',u:'1个(100g)',k:61,p:0.8,c:14.5,f:0.6,vc:62,ca:27},
{n:'坚果',u:'1把(25g)',k:150,p:5,c:5,f:12.5,ca:30},
{n:'黑巧克力',u:'2块(20g)',k:110,p:1.6,c:9.2,f:7.6,ca:14},
{n:'拿铁咖啡',u:'1杯(350ml)',k:130,p:7,c:11,f:6.5,ca:220},
{n:'美式咖啡',u:'1杯(350ml)',k:8,p:0.4,c:1.4,f:0,ca:7},
{n:'奶茶',u:'1杯(500ml)',k:340,p:4,c:52,f:12,ca:110},
{n:'可乐',u:'1罐(330ml)',k:142,p:0,c:35,f:0,ca:0},
{n:'薯片',u:'1包(70g)',k:378,p:4.2,c:36,f:24,ca:17},
{n:'蛋糕',u:'1块(90g)',k:312,p:4.5,c:40,f:15,ca:30},
{n:'饼干',u:'4片(40g)',k:186,p:2.8,c:26,f:8,ca:12},
{n:'面条',u:'1碗(生100g)',k:284,p:8.3,c:61,f:0.7,ca:11},
{n:'饺子',u:'10个(200g)',k:420,p:14,c:48,f:18,ca:40},
{n:'包子',u:'1个(100g)',k:227,p:7.5,c:40,f:4,ca:30},
{n:'汉堡',u:'1个(180g)',k:512,p:22,c:44,f:27,ca:110},
{n:'炸鸡',u:'2块(150g)',k:420,p:26,c:16,f:28,ca:20},
{n:'披萨',u:'1块(120g)',k:320,p:13,c:36,f:14,ca:180},
{n:'寿司',u:'6个(180g)',k:255,p:9,c:47,f:3.5,ca:20},
{n:'鸡蛋灌饼',u:'1个(150g)',k:340,p:9,c:42,f:15,ca:35},
{n:'轻食沙拉碗',u:'1份(350g)',k:290,p:20,c:24,f:12,vc:40,ca:90}
];

/* 运动库：MET 值，kcal/min = MET*3.5*体重/200 */
DATA.EXERCISES = [
{n:'快走',met:4,tag:'有氧'},{n:'慢跑',met:7,tag:'有氧'},{n:'跑步',met:9.8,tag:'有氧'},
{n:'跳绳',met:11,tag:'燃脂'},{n:'HIIT高强度间歇',met:8.5,tag:'燃脂'},{n:'开合跳',met:8,tag:'燃脂'},
{n:'帕梅拉全身燃脂',met:8,tag:'燃脂'},{n:'有氧操',met:7.3,tag:'有氧'},{n:'毽子操',met:7,tag:'有氧'},
{n:'舞蹈',met:5.5,tag:'舞蹈'},{n:'瑜伽',met:3,tag:'瑜伽'},{n:'普拉提',met:3.5,tag:'塑形'},
{n:'力量训练',met:5,tag:'塑形'},{n:'核心训练',met:6,tag:'塑形'},{n:'深蹲训练',met:5.5,tag:'塑形'},
{n:'天鹅臂',met:3,tag:'塑形'},{n:'臀腿训练',met:5.5,tag:'塑形'},{n:'马甲线训练',met:6,tag:'塑形'},
{n:'拉伸放松',met:2.5,tag:'拉伸'},{n:'开肩美背',met:3,tag:'拉伸'},{n:'骑行',met:6.8,tag:'有氧'},
{n:'游泳',met:7,tag:'有氧'},{n:'爬楼梯',met:8,tag:'有氧'},{n:'散步',met:3.5,tag:'有氧'}
];
DATA.TAG_STICKER = {'燃脂':'🔥','有氧':'🏃‍♀️','塑形':'💪','瑜伽':'🧘‍♀️','舞蹈':'💃','拉伸':'🎀','打卡':'⭐'};

/* 运动灵感视频池（B站/小红书，链接为平台搜索直达） */
function bl(kw){ return 'https://search.bilibili.com/all?keyword='+encodeURIComponent(kw); }
function xh(kw){ return 'https://www.xiaohongshu.com/search_result?keyword='+encodeURIComponent(kw); }
DATA.VIDEOS = [
{t:'帕梅拉 - 10分钟HIIT燃脂！高强全身燃脂训练 无器械 (Pamela Reif Official)',up:'帕梅拉PamelaReif',pf:'B站',tag:'燃脂',min:11,play:'3250.3万',bv:'BV1Np4y1i7rG',pic:'https://i2.hdslb.com/bfs/archive/1fdbcbef419d87f817f76d5fbe93ec5bb6616a45.jpg',url:'https://www.bilibili.com/video/BV1Np4y1i7rG'},
{t:'Pamela帕梅拉12 分钟瘦腿训练/高效瘦腿/坚持就能瘦',up:'林清心呀',pf:'B站',tag:'塑形',min:13,play:'2728.8万',bv:'BV1eK4y1t7zi',pic:'https://i2.hdslb.com/bfs/archive/bc164010f9020b8dd75925d130d93a48b543d5bf.jpg',url:'https://www.bilibili.com/video/BV1eK4y1t7zi'},
{t:'【自用】周六野瘦手臂+天鹅颈+减斜方肌（去头尾）',up:'你算哪瓶乳酸菌-',pf:'B站',tag:'塑形',min:26,play:'368万',bv:'BV1hE411L7RE',pic:'https://i2.hdslb.com/bfs/archive/0f22a007e40f0c5fffe98643db2dbd785c700ca5.jpg',url:'https://www.bilibili.com/video/BV1hE411L7RE'},
{t:'9分钟瘦大腿+HIIT超燃脂运动，针对大腿内侧！28天比基尼身材挑战Week5【周六野Zoey】',up:'周六野Zoey',pf:'B站',tag:'塑形',min:12,play:'1240.2万',bv:'BV1yx411z7PJ',pic:'https://i2.hdslb.com/bfs/archive/5633628fc855564fe5cb0dfdd8756c97b0b1ace8.jpg',url:'https://www.bilibili.com/video/BV1yx411z7PJ'},
{t:'沙漏腰3.0进阶｜30分钟站立无跑跳核心训练｜髋灵活、胸椎灵活提升',up:'欧阳春晓Aurora',pf:'B站',tag:'塑形',min:30,play:'2139.1万',bv:'BV13DJVzsEkK',pic:'https://i0.hdslb.com/bfs/archive/1392c5d407bd201227264ce39f709544e83da01b.jpg',url:'https://www.bilibili.com/video/BV13DJVzsEkK'},
{t:'每天15分钟get一眼万年的丝滑美背｜纠正圆肩驼背头前伸 口令指导',up:'欧阳春晓Aurora',pf:'B站',tag:'塑形',min:16,play:'952.3万',bv:'BV1Gz421C7G1',pic:'https://i1.hdslb.com/bfs/archive/ea01b2c4258efd02daf1f1a9d77552423d7ca947.jpg',url:'https://www.bilibili.com/video/BV1Gz421C7G1'},
{t:'更新P2！【中字】Ballet Beautiful 美丽芭蕾 P1天鹅臂+P2消灭拜拜肉',up:'pll25586',pf:'B站',tag:'塑形',min:27,play:'1366.6万',bv:'BV1qs411q7wG',pic:'https://i2.hdslb.com/bfs/archive/7b419ae483698e78b9168a78b2aec22b09e27415.jpg',url:'https://www.bilibili.com/video/BV1qs411q7wG'},
{t:'【每天一遍, 想不瘦都难!】30分钟站立无跑跳有氧暴汗燃脂操, 新手/大基数友好（韩小四）',up:'韩小四AprilHan',pf:'B站',tag:'有氧',min:31,play:'3008万',bv:'BV1jF411e7KS',pic:'https://i2.hdslb.com/bfs/archive/6ab6b90364014063ff6fc74b12109426b02efa73.jpg',url:'https://www.bilibili.com/video/BV1jF411e7KS'},
{t:'本草纲目毽子操｜快来雕塑马甲线！',up:'刘畊宏willliu',pf:'B站',tag:'有氧',min:5,play:'1750.5万',bv:'BV1Pa411v7vg',pic:'https://i0.hdslb.com/bfs/archive/c2ed8dd199050ee1ea55c39b11ba2c0a7e3d1d9d.jpg',url:'https://www.bilibili.com/video/BV1Pa411v7vg'},
{t:'跳绳后拉伸（15分钟跟练版）！跳绳不粗腿的关键！',up:'刘小跳-目标99斤',pf:'B站',tag:'拉伸',min:16,play:'315.3万',bv:'BV1zq4y1B7R5',pic:'https://i1.hdslb.com/bfs/archive/fadf8dc0f18348d81a1b8cec4d6359b34c843e70.jpg',url:'https://www.bilibili.com/video/BV1zq4y1B7R5'},
{t:'帕梅拉 - 5min 每日拉伸 - 运动后|睡前|清晨快速拉伸 无器械 (Pamela Reif Official)',up:'帕梅拉PamelaReif',pf:'B站',tag:'拉伸',min:6,play:'1362.6万',bv:'BV1Zz4y1o7Vx',pic:'https://i1.hdslb.com/bfs/archive/3d7d35179f269639bbb7a1ddd81702358c47d274.jpg',url:'https://www.bilibili.com/video/BV1Zz4y1o7Vx'},
{t:'帕梅拉 - 10min 全身拉伸|运动前后 睡前晨起拉伸|缓解肌肉酸痛 提高柔韧性 (Pamela Reif Official)',up:'帕梅拉PamelaReif',pf:'B站',tag:'拉伸',min:11,play:'2507.8万',bv:'BV1ga411w7i3',pic:'https://i0.hdslb.com/bfs/archive/64a46fcd19aeb36e08ccf9ef2f544f624dc83a7d.jpg',url:'https://www.bilibili.com/video/BV1ga411w7i3'},
{t:'10分钟有效缓解肩颈酸痛僵硬 每天一遍告别不良体态 （坐姿拉伸+自我按摩）',up:'范李猿',pf:'B站',tag:'拉伸',min:13,play:'1585.2万',bv:'BV1vu411e7fC',pic:'https://i0.hdslb.com/bfs/archive/a902b9961903db6d795ba9e62ad191ed7d6fa6da.jpg',url:'https://www.bilibili.com/video/BV1vu411e7fC'},
{t:'45分钟 初级入门瑜伽课 一次学会所有基础体式 在家跟练 全身舒展运动 矫正体态 保养关节 适合每天练习',up:'YogaLadyM流瑜伽',pf:'B站',tag:'瑜伽',min:47,play:'24万',bv:'BV1QL411B7B9',pic:'https://i2.hdslb.com/bfs/archive/33a9a43ea62b7d83c2782527f8ee1f1ad2d54642.jpg',url:'https://www.bilibili.com/video/BV1QL411B7B9'},
{t:'长久拥有平坦小腹的秘密：核心力量【初级跟练】',up:'欧阳春晓Aurora',pf:'B站',tag:'塑形',min:10,play:'600.9万',bv:'BV1Da411e7Zi',pic:'https://i2.hdslb.com/bfs/archive/e5e981b9bca2fffc2fd2bc927953a9e3c42f7999.jpg',url:'https://www.bilibili.com/video/BV1Da411e7Zi'},
{t:'6分钟初级腹肌训练 | 新手友好 紧实腹部 无器械',up:'Jackie扬',pf:'B站',tag:'塑形',min:6,play:'402万',bv:'BV1QW4y1U7fY',pic:'https://i0.hdslb.com/bfs/archive/2840096e6dccc969084567235b76fc8ae0b94692.jpg',url:'https://www.bilibili.com/video/BV1QW4y1U7fY'},
{t:'【谁跳谁瘦！】30分钟有氧燃脂舞合集｜零基础/暴汗/新手友好+拉伸',up:'韩小四AprilHan',pf:'B站',tag:'舞蹈',min:30,play:'2125万',bv:'BV1Ct4y1J7zV',pic:'https://i1.hdslb.com/bfs/archive/e636f3b7ef8718fc654b2a33bafb16093a9e8b59.jpg',url:'https://www.bilibili.com/video/BV1Ct4y1J7zV'},
{t:'女团腰腹燃脂舞，T-ara蹦迪风减肥，一首歌练出马甲线小蛮腰',up:'黑妞福大玥',pf:'B站',tag:'舞蹈',min:15,play:'194.5万',bv:'BV1Zv4y1Z7M1',pic:'https://i2.hdslb.com/bfs/archive/3bca6d32e0cdb9f422e5c21a2eda17afcbabdb39.jpg',url:'https://www.bilibili.com/video/BV1Zv4y1Z7M1'},
{t:'【改善体态】5分钟全身体态纠正训练 (起床必备)',up:'帅soserious',pf:'B站',tag:'拉伸',min:6,play:'682.9万',bv:'BV1A54y1S7mn',pic:'https://i1.hdslb.com/bfs/archive/e10d01553f5fe347ac74d7ce2974308299dd1718.jpg',url:'https://www.bilibili.com/video/BV1A54y1S7mn'},
{t:'12min疏通肝胆经｜恢复精力，减轻熬夜伤害，缓解慢性疲劳｜肝好人不老～',up:'瑜伽玛拉_',pf:'B站',tag:'瑜伽',min:12,play:'131.5万',bv:'BV19K411X7B8',pic:'https://i0.hdslb.com/bfs/archive/fa43f28fcfabf92ca4d912d23ea5351988b2e4a6.jpg',url:'https://www.bilibili.com/video/BV19K411X7B8'}
];
/* 按日期种子选4条（每天8点更新） */
DATA.dailyVideos = function(){
  var now = SH.bjNow();
  var d = new Date(now);
  if(now.getHours() < 8) d.setDate(d.getDate()-1);
  var seed = parseInt(SH.dstr(d).replace(/-/g,''),10);
  var arr = DATA.VIDEOS.slice(), out = [];
  for(var i=0;i<6 && arr.length;i++){
    seed = (seed*9301+49297)%233280;
    out.push(arr.splice(seed%arr.length,1)[0]);
  }
  return out;
};

/* 学习推荐 */
DATA.STUDY_VIDEOS = [{t:'【付费课程试看集】《认知世界的经济学》第一章·第1课 经济学世界观（上）',up:'珍大户',pf:'B站',tag:'经济',min:9,play:'27.1万',bv:'BV1sV411h746',pic:'https://i2.hdslb.com/bfs/archive/ad842e658d6f0a675c12142dd12a947301da9d0e.jpg',url:'https://www.bilibili.com/video/BV1sV411h746'},
{t:'【大学生学理财】支付宝基金详解|小白理财入门|快乐学投资',up:'凛冬飘雪mika',pf:'B站',tag:'理财',min:11,play:'279.3万',bv:'BV1PE411Y7qz',pic:'https://i2.hdslb.com/bfs/archive/c4590f785b6bbae6fdb610606e374cf9e94d5b7e.jpg',url:'https://www.bilibili.com/video/BV1PE411Y7qz'},
{t:'费曼学习法----看似最笨的办法常常是最有效的（附实例）',up:'曼鱼的视觉笔记',pf:'B站',tag:'方法',min:6,play:'195.1万',bv:'BV1KL4y1s7jr',pic:'https://i1.hdslb.com/bfs/archive/fca97df89a69f0919f16a3daa6d032756e745e94.jpg',url:'https://www.bilibili.com/video/BV1KL4y1s7jr'},
{t:'「超实用电脑操作教程」Excel基础教学:如何用Excel制作线状图||YouTube搬运|| Michelle Bloom',up:'小鹿温妮',pf:'B站',tag:'技能',min:6,play:'1.3万',bv:'BV1yE41167qE',pic:'https://i1.hdslb.com/bfs/archive/cfb7f2133514464f5538463205be2fe35de3a599.jpg',url:'https://www.bilibili.com/video/BV1yE41167qE'},
{t:'慢速英语,从能听懂开始',up:'ShadowingEnglish',pf:'B站',tag:'英语',min:6,play:'58.3万',bv:'BV181QsBJE5s',pic:'https://i2.hdslb.com/bfs/archive/bfb75b9af181fbcbbd9f376e5f26fe7efd32c72b.jpg',url:'https://www.bilibili.com/video/BV181QsBJE5s'},
{t:'设计师的审美养成？私藏的设计师名单+神仙Up推荐助你打开脑洞、灵感爆棚！| LeonTalk 01',up:'SenbeiLeon',pf:'B站',tag:'审美',min:40,play:'8.4万',bv:'BV1HR4y1s7Ej',pic:'https://i2.hdslb.com/bfs/archive/3f46d40b678c12c47c0cc1a8424bbbc5ebc14dc5.jpg',url:'https://www.bilibili.com/video/BV1HR4y1s7Ej'}
];
DATA.PODCASTS = [
{t:'声动早咖啡',s:'每天15分钟商业新知'},
{t:'商业就是这样',s:'商业逻辑轻松拆解'},
{t:'无人知晓',s:'孟岩·投资与人生'},
{t:'随机波动',s:'女性视角文化对谈'},
{t:'疯投圈',s:'创投行业深度聊天'},
{t:'海马星球',s:'女性成长与勇气'}
];
DATA.BOOKS = {
  '经济理财':[
    {t:'小狗钱钱',a:'博多·舍费尔'},{t:'富爸爸穷爸爸',a:'罗伯特·清崎'},
    {t:'金钱心理学',a:'摩根·豪塞尔'},{t:'纳瓦尔宝典',a:'埃里克·乔根森'},
    {t:'半小时漫画经济学',a:'陈磊'},{t:'薛兆丰经济学讲义',a:'薛兆丰'},
    {t:'穷查理宝典',a:'查理·芒格'},{t:'经济学原理',a:'曼昆'}
  ],
  '女生成长':[
    {t:'被讨厌的勇气',a:'岸见一郎'},{t:'向前一步',a:'谢丽尔·桑德伯格'},
    {t:'成为',a:'米歇尔·奥巴马'},{t:'认知觉醒',a:'周岭'},
    {t:'始于极限',a:'上野千鹤子'},{t:'也许你该找个人聊聊',a:'洛莉·戈特利布'},
    {t:'亲密关系',a:'罗兰·米勒'},{t:'当下的力量',a:'埃克哈特·托利'}
  ]
};

/* 预设训练计划 */
DATA.PLAN_PRESETS = {
  '欧阳春晓14天曼妙计划':[
    '全身燃脂唤醒 20min','腹部核心·马甲线 15min','翘臀训练 20min','全身拉伸放松 15min',
    '手臂+背部塑形 15min','有氧舞蹈燃脂 25min','休息日·轻松散步 30min',
    '下腹+侧腰雕刻 15min','腿部塑形·消除肌肉腿 20min','全身燃脂进阶 25min',
    '开肩美背·体态改善 15min','臀腿综合训练 20min','全身流动拉伸 20min','毕业挑战·全身综合 30min'
  ],
  '帕梅拉7天入门计划':[
    '10分钟全身热身燃脂','15分钟腹部初级','12分钟臀腿激活','10分钟全身拉伸',
    '15分钟手臂背部','20分钟有氧舞蹈','休息日·散步+拉伸'
  ],
  '21天体态改善计划':null /* 由生成器生成 */
};
DATA.genPlan = function(days){
  var pool = ['全身燃脂 20min','核心训练 15min','臀腿塑形 20min','拉伸放松 15min','开肩美背 12min','有氧操 25min','休息日·散步 30min'];
  var out = [];
  for(var i=0;i<days;i++) out.push(pool[i%pool.length]);
  return out;
};
})();
