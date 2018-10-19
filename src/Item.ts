import { List } from "immutable";
import { ContentState, EditorState } from "draft-js";

const uuid1 = require('uuid/v1');

export interface Item {
  id: string;
  children: List<Item>;
  editor: EditorState;
  expand: boolean;
}


const content = (text: string) => EditorState.createWithContent(ContentState.createFromText(text));

export const createItem = (text: string = ''): Item => ({
  id: uuid1(),
  children: List(),
  editor: content(text),
  expand: true,
});


export const addChild = (parent: Item, child: Item, position?: number): Item => {
  const children = position === undefined ? parent.children.push(child) : parent.children.insert(position, child);
  return { ...parent, children }
};


export const randomTree = (threshold: number = 0.7, n: number = 4, level = 0): Item => {
  const rnd1 = Math.random();
  const rnd2 = String(Math.random() * 100);
  let children = List();
  if (rnd1 > threshold && level < 10) {
    for (let i = 0; i < Math.random() * 10; i++) {
      children = children.push(randomTree(threshold, n, level + 1));
    }
  }
  return ({
    id: uuid1(),
    children: children,
    editor: content(rnd2),
    expand: true,
  })
};
