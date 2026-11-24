import type { Card } from './types';

export const CARDS: Card[] = [
 { id:'lightning-rain',name:'閃電雨',subtitle:'範圍法術',description:'直徑 3 公尺內的鬥士受到 1 點傷害',cost:{generic:0,colored:{red:1}},target:'area',areaRadius:1.5,damage:1,color:'#df776a',icon:'ϟ' },
 { id:'divine-wrath',name:'神怒',subtitle:'範圍法術',description:'直徑 5 公尺內的鬥士受到 3 點傷害',cost:{generic:0,colored:{red:4}},target:'area',areaRadius:2.5,damage:3,color:'#e8b16a',icon:'✹' },
 { id:'stone',name:'石頭',subtitle:'一次性投擲',description:'直線投擲，命中造成 1 點傷害；最遠 5 公尺',cost:{generic:1,colored:{}},target:'ground',throwRange:5,color:'#a6adb5',icon:'●' },
 { id:'pot',name:'陶罐',subtitle:'一次性投擲',description:'命中造成 3 點傷害，無視防禦；最遠 2 公尺',cost:{generic:2,colored:{}},target:'ground',throwRange:2,color:'#c58f67',icon:'▱' },
 { id:'dung',name:'屎',subtitle:'一次性投擲',description:'射程 5 公尺，命中造成 1 點傷害。存活者虛弱 5 秒，每秒再扣 1 點生命。再次命中刷新效果。',cost:{generic:0,colored:{black:1}},target:'ground',throwRange:5,color:'#ad907a',icon:'●' },
 { id:'spike-pit',name:'刺洞',subtitle:'地面陷阱',description:'放置 0.6 秒後生效。首位踩中的鬥士受到 3 點傷害，陷阱隨即消失，或於生效 12 秒後失效。',cost:{generic:2,colored:{}},target:'trap',color:'#b59980',icon:'⌄' },
 { id:'bear-trap',name:'捕獸夾',subtitle:'地面陷阱',description:'放置 0.6 秒後生效，首位踩中的鬥士受到 1 點傷害並定身 3 秒，仍可攻擊與防禦。生效 12 秒後失效。',cost:{generic:2,colored:{}},target:'trap',color:'#87c6bd',icon:'⋈' },
 { id:'sword',name:'直劍',subtitle:'投送裝備',description:'單手劍；落地後可被任何鬥士拾取',cost:{generic:2,colored:{}},target:'ground',color:'#b7c9d0',icon:'†' },
 { id:'spear',name:'長矛',subtitle:'投送裝備',description:'單手長矛；比直劍出手更快、攻擊距離更遠',cost:{generic:1,colored:{}},target:'ground',color:'#b7c9d0',icon:'↑' },
 { id:'hatchet',name:'短斧',subtitle:'投送裝備',description:'單手。近戰遇到普通格擋時先減傷再碎盾，成功招架或場邊投送則保留盾牌。',cost:{generic:2,colored:{yellow:1}},target:'ground',color:'#d8b573',icon:'⌙' },
 { id:'club',name:'木棍',subtitle:'投送裝備',description:'雙手重擊可擊飛，兩次有效命中後斷裂',cost:{generic:2,colored:{}},target:'ground',color:'#c59b72',icon:'╱' },
 { id:'shield',name:'圓盾',subtitle:'投送裝備',description:'單手盾；消耗體力格擋或短窗招架',cost:{generic:3,colored:{}},target:'ground',color:'#dfbc70',icon:'⛨' },
 { id:'bow',name:'長弓',subtitle:'雙手遠程',description:'雙手弓；附三支箭，射完後回到徒手',cost:{generic:1,colored:{}},target:'ground',color:'#9eb98c',icon:'⌒' },
 { id:'lightning',name:'閃電劍',subtitle:'紅色法術',description:'目標受到 3 點傷害，無視盾與方向',cost:{generic:0,colored:{red:1}},target:'fighter',color:'#df776a',icon:'ϟ' },
 { id:'bloodlust',name:'殺紅眼',subtitle:'紅色法術',description:'攻擊力 +3，持續 5 秒',cost:{generic:1,colored:{red:1}},target:'fighter',color:'#df776a',icon:'✦' },
 { id:'deliberate',name:'謹慎思考',subtitle:'藍色法術',description:'抽最多三張，選一張加入手牌，其餘棄掉',cost:{generic:0,colored:{blue:1}},target:'self',color:'#79a9ce',icon:'◇' },
 { id:'intuition',name:'直覺',subtitle:'藍色法術',description:'補牌後，看見接下來最多兩張牌',cost:{generic:0,colored:{blue:1}},target:'self',color:'#79a9ce',icon:'◈' },
 { id:'growth',name:'野性成長',subtitle:'綠色法術',description:'恢復 10 點生命，不超過生命上限',cost:{generic:2,colored:{green:1}},target:'fighter',color:'#86b18b',icon:'✚' },
];
