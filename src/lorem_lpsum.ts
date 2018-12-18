// Markdown Lorem Ipsum
// Thanks to 张大锤

import * as _ from "lodash";


const random = (max: number) => Math.floor(Math.random() * max);

const link = (text: string) => `[${text}](https://ioover.net)`;

const strong = (text: string) => `**${text}**`;

const em = (text: string) => `*${text}*`;


const corpus: Array<string> = [
  "greater", "beauty", "there is", "indefinable", "meaningless",
  "to", "a", "significance", "世界", "夏花", "的", "将", "之", "猫",
  "一个", "一只", "拖鞋", "烧饼", "土豆", "油条", "你", "不见", "又", "了",
  "ココナ", "パピか", "Flip Flappers", "まどか", "ほむら", "of", "the",
  "world", "all", "去", "明天", "devil", "可是", "! ", ",", "变大", "夜", "常见",
  "光", "歌", "不会", "昨天", "宇宙", "事件"
].map((word: string) => {
  const start = /^\w/.test(word);
  const end = /\w$/.test(word);
  if (start)
    word = " ".concat(word);
  if (end)
    word = word.concat(" ");
  return word;
});


export const word = (): string => {
  return _.sample(corpus) as string;
};

const paragraph_ = (): string => {
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

export const paragraph = (): string => {
  return paragraph_().replace("  ", " ").trim();
};
