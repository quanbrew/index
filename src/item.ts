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


export const randomTree = (threshold: number = 0.2, n: number = 19, level = 0): Item => {
  const rnd1 = Math.random();
  const rnd2 = String(Math.random() * 100);
  let children = List();
  if (rnd1 > threshold && level < 10) {
    for (let i = 0; i < Math.random() * 100; i++) {
      children = children.push(randomTree(threshold * 2, n, level + 1));
    }
  }
  return ({
    id: uuid1(),
    children: children,
    editor: content(rnd2),
    expand: true,
  })
};


export type Path = List<number>;
export const isSubPathOf = (subPath: Path, path: Path): boolean => {
  if (path.size < subPath.size) {
    return false;
  }
  else {
    const xs = path.zipWith((a, b) => a === b, subPath);
    return xs.indexOf(false) === -1;
  }
};
export const remove = (item: Item, path: Path, amount: number = 1): Item => {
  const index = path.first(null);
  if (index === null) {
    console.error('unexpected path');
    return item;
  }
  else if (item.children.size <= index) {
    console.error('not found child');
    return item;
  }
  else if (path.size === 1) {
    const children = item.children.splice(index, amount);
    return { ...item, children };
  }
  else {
    const next = item.children.get(index) as Item;
    const children = item.children.set(index, remove(next, path.rest()));
    return { ...item, children };
  }
};


export const append = (tree: Item, items: Array<Item>, parent: Path): Item => {
  const index = parent.first(null);
  if (index === null) {
    const children = tree.children.push(...items);
    return { ...tree, children };
  }
  else {
    const next = tree.children.get(index, null);
    if (next === null) {
      console.error('unexpected path', tree.children.toJS(), parent.toJS());
      return tree;
    }
    const children = tree.children.set(index, append(next, items, parent.rest()));
    return { ...tree, children };
  }
};


export const mapLocation = (tree: Item, path: Path, mapper: (item: Item) => Item): Item => {
  const index = path.first(null);
  if (index === null) {
    return mapper(tree);
  }
  else {
    const child = tree.children.get(index, undefined);
    if (child === undefined) {
      console.error('unexpected index');
      return tree;
    }
    const children = tree.children.set(index, mapLocation(child, path.rest(), mapper));
    return { ...tree, children }
  }
};


export const insert = (tree: Item, items: Array<Item>, path: Path, remove: number = 0): Item => {
  const index = path.first(null);
  if (index === null) {
    console.error('unexpected path');
    return tree;
  }
  else if (path.size === 1) {
    if (tree.children.size < index) {
      console.error('unexpected index');
      return tree;
    }
    else {
      const children = tree.children.splice(index, remove, ...items);
      return { ...tree, children };
    }
  }
  else {
    const next = tree.children.get(index, null);
    if (next === null) {
      console.error('unexpected path', tree.children.toJS(), path.toJS());
      return tree;
    }
    const children = tree.children.set(index, insert(next, items, path.rest(), remove));
    return { ...tree, children };
  }
};


export const update = (tree: Item, item: Item, path: Path): Item => {
  if (path.isEmpty()) {
    return item;
  }
  else {
    return insert(tree, [item], path, 1);
  }
};

// Get last descendant item
export const itemTail = (path: Path, item: Item): Path => {
  const last = item.children.last(null);
  if (last === null) return path;
  else return itemTail(path.push(item.children.size - 1), last);
};
