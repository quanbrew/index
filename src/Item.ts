import { List } from "immutable";

const uuid1 = require('uuid/v1');

export interface Item {
  id: string;
  children: List<Item>;
  text: string;
  expand: boolean;
}


export const createItem = (text: string = ''): Item => ({
  id: uuid1(),
  children: List(),
  text,
  expand: true,
});


export const addChild = (parent: Item, child: Item, position?: number): Item => {
  const children = position === undefined ? parent.children.push(child) : parent.children.insert(position, child);
  return { ...parent, children }
};

