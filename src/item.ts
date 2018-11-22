import { List } from "immutable";
import { ContentBlock, ContentState, EditorState, SelectionState } from "draft-js";
import { Select } from "./utils";
import { LocationDescriptorObject } from "history";

const uuid1 = require('uuid/v1');

export interface Item {
  id: string;
  children: List<Item>;
  expand: boolean;
  editor: EditorState;
}


export const buildEditor = (text: string) => EditorState.createWithContent(ContentState.createFromText(text));

export const createItem = (source: string = ''): Item => ({
  id: uuid1(),
  children: List(),
  editor: buildEditor(source),
  expand: true,
});


export const addChild = (parent: Item, child: Item, position?: number): Item => {
  const children = position === undefined ? parent.children.push(child) : parent.children.insert(position, child);
  return { ...parent, children }
};


export const findItemById = (item: Item, id: string): { item: Item, path: Path } | null => {
  let path = List();
  if (item.id === id)
    return { item, path };
  for (let i = 0; i < item.children.size; i++) {
    const result = findItemById(item.children.get(i) as Item, id);
    if (result !== null)
      return { item: result.item, path: path.push(i).concat(result.path) };
  }
  return null;
};


export const findItemByPath = (item: Item, path: Path): Item | null => {
  const index = path.first(null);
  if (index === null) {
    return item;
  }
  else {
    const child = item.children.get(index, null);
    if (child === null)
      return null;
    return findItemByPath(child, path.rest());
  }
};

export const randomTree = (threshold: number = 0.2, n: number = 19, level = 0): Item => {
  const rnd1 = Math.random();
  const source = String(Math.random() * 100);
  let children = List();
  if (rnd1 > threshold && level < 10) {
    for (let i = 0; i < Math.random() * 100; i++) {
      children = children.push(randomTree(threshold * 2, n, level + 1));
    }
  }
  return ({
    id: uuid1(),
    children: children,
    editor: buildEditor(source),
    expand: true,
  })
};


export type Path = List<number>;
export const isSubPathOf = (subPath?: Path, path?: Path): boolean => {
  if (subPath === undefined || path === undefined)
    return false;
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


// Get last descendant item
export const itemTail = (path: Path, item: Item): Path => {
  const last = item.children.last(null);
  if (last === null) return path;
  else return itemTail(path.push(item.children.size - 1), last);
};


export function applySelectionToItem(item: Item, selection?: Select): Item {
  interface KeyAndOffset {
    key: string,
    offset: number
  }

  function getKeyAndOffset(row: number, column: number): KeyAndOffset {
    const blockList = item.editor.getCurrentContent().getBlocksAsArray();
    const blockListLen = blockList.length;
    let index = row;
    if (row >= blockListLen || row < 0)
      index = blockListLen - 1;
    const block: ContentBlock = blockList[index];
    const key = block.getKey();
    const blockLen = block.getLength();
    let offset = column;
    if (column > blockLen || column < 0) {
      offset = blockLen;
    }
    return { key, offset }
  }


  let selectionState;
  if (selection !== undefined) {
    let { anchor, focus } = selection;
    if (anchor === undefined)
      anchor = { ...focus };
    const anchorResult = getKeyAndOffset(anchor.row, anchor.column);
    const focusResult = getKeyAndOffset(focus.row, focus.column);
    selectionState = SelectionState
      .createEmpty(focusResult.key)
      .merge({
        'hasFocus': true,
        'anchorKey': anchorResult.key,
        'focusKey': focusResult.key,
        'anchorOffset': anchorResult.offset,
        'focusOffset': focusResult.offset,
      });
  }
  else {
    selectionState = item.editor.getSelection().set('hasFocus', true);
  }
  const editor = EditorState
    .forceSelection(item.editor, selectionState as SelectionState);
  return { ...item, editor }
}


export const pathItem = (path: Path, item: Item): List<Item> => {
  const items = List().push(item);
  const index = path.first(null);
  if (index === null)
    return items;
  else {
    const child = item.children.get(index, null);
    if (child === null) {
      throw Error('wrong path index')
    }
    const subPath = pathItem(path.rest(), child);
    return items.concat(subPath);
  }
};


export const itemLinkLocation = (id: string, path: Path): LocationDescriptorObject<{ targetPathArray: Array<number> }> => {
  return ({
    pathname: `/id/${ id }`,
    state: { targetPathArray: path.toJS() }
  })
};

