// Markdown Lorem Ipsum
import * as _ from "lodash";


const random = (max: number) => Math.floor(Math.random() * max);

const link = (text: string) => `[${text}](https://ioover.net)`;

const strong = (text: string) => `**${text}**`;

const em = (text: string) => `*${text}*`;


export const word = (): string => {
  return _.sample([
    "血統主義", "非洲人", "ケモミミ", "词典", "亚历山大大帝", "生世",
    "意樣法強主出約以車不灣", "四体不勤", "五谷不分", "機率", "下午安", "光盘", " Handpicked Rust updates",
    " production", " events", " SwissTable", "类型", " Lorem", " Ipsum",
    "嗷", "一个狗", "你国当代", "你球", " Have", " a", " good", " day", "OH", " lambda", "λ", "魔幻现实",
    "赛博朋克", "完了", "Moe", "废萌", "存在", "俄狄浦斯", "一个狗", "不要脸", "毛", "高速率", "挥舞双前手",
    "注视万丈光芒", "在天国之门", "的", "黑暗里闪耀", "时间枯萎", "伟大", "生活", "老张", "老王", " epic",
    " god-heroes", " Third", " wizards", "exists", "None", "nil", "; DROP TABLE worlds; --", "酱肘子",
    "驴肉火烧", "肉酱面", "薯条", " trait", " Œdipus", " Creon", " Ethics", " Good and evil", " ēthikós",
    "この星", "严肃文学", "打死", "将", "往日", "丢掉", "突然", "嗷的叫", "了", "了", "的", "得", "偷吃",
    "温馨感人", " MIND", " FUCKER", "打钱", " The", "好消息不断", "价值观", "三观正", "xswl", "丢人",
    "厉声说", "俯卧", "，", "！", "。", "💊", "四年前的今天", "貓", "不见", "救救我", "圣杯战争", "但是",
    " but", "亢奋", "一切", "你", "洗特了", "白相", "狗屎", "おめでとう"
  ]) as string;
};

export const paragraph = (): string => {
  const r = random(7);
  switch (r) {
    case 0:
      return word() + paragraph();
    case 1:
      return word() + em(word()) + paragraph();
    case 2:
      return word() + link(word().trim()) + paragraph();
    case 3:
      return word() + strong(word()) + paragraph();
  }
  return word() + word() + word() + word();
};
