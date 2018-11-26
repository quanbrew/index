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


export namespace Item {
  export const create = (source: string = ''): Item => ({
    id: uuid1(),
    children: List(),
    editor: buildEditor(source),
    expand: true,
  });


  export const addChild = (parent: Item, child: Item, position?: number): Item => {
    const children = position === undefined ? parent.children.push(child) : parent.children.insert(position, child);
    return { ...parent, children }
  };


  export const buildEditor = (text: string) =>
    EditorState.createWithContent(ContentState.createFromText(text));


  export const findById = (item: Item, id: string): { item: Item, path: Path } | null => {
    let path = List();
    if (item.id === id)
      return { item, path };
    for (let i = 0; i < item.children.size; i++) {
      const result = findById(item.children.get(i) as Item, id);
      if (result !== null)
        return { item: result.item, path: path.push(i).concat(result.path) };
    }
    return null;
  };


  export const findByPath = (item: Item, path: Path): Item | null => {
    const index = path.first(null);
    if (index === null) {
      return item;
    }
    else {
      const child = item.children.get(index, null);
      if (child === null)
        return null;
      return findByPath(child, path.rest());
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

  const randomNode = () => create(String(Math.random()));

  export const randomTree = (amount: number): Item => {
    let root = randomNode();

    while (amount > 1) {
      if (Math.random() < 0.6) {
        root = addChild(root, randomNode());
      }
      else {
        const subAmount = Math.floor(amount * Math.random());
        root = addChild(root, randomTree(subAmount));
        amount -= subAmount;
      }
    }
    return root;
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


  export const modify = (tree: Item, path: Path, mapper: (item: Item) => Item): Item => {
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
      const children = tree.children.set(index, modify(child, path.rest(), mapper));
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
  export const tail = (path: Path, item: Item): Path => {
    const last = item.children.last(null);
    if (last === null) return path;
    else return tail(path.push(item.children.size - 1), last);
  };


  export function select(item: Item, selection?: Select): Item {
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


  export const itemsInPath = (path: Path, item: Item): List<Item> => {
    const items = List().push(item);
    const index = path.first(null);
    if (index === null)
      return items;
    else {
      const child = item.children.get(index, null);
      if (child === null) {
        throw Error('wrong path index')
      }
      const subPath = itemsInPath(path.rest(), child);
      return items.concat(subPath);
    }
  };

  export type ItemLocation = LocationDescriptorObject<{ targetPathArray: Array<number> }>;
  export const linkLocation = (id: string, path: Path): ItemLocation => {
    return ({
      pathname: `/id/${ id }`,
      state: { targetPathArray: path.toJS() }
    })
  };
}


export type Path = List<number>;


export namespace Path {
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
}


export interface MetaData {
}


export interface Record {
  id: string;
  content: string;
  parent: string | null;
  expand: boolean;
  metadata: MetaData;
  tags: Array<string>;
  created: string;
  modified: string;
}


export namespace Record {

  type RecordMap = { [parent: string]: Array<Record> };


  const buildTreeFromRecordMap = (record: Record, map: RecordMap): Item => {
    let children;
    if (map[record.id] !== undefined) {
      children = List(map[record.id].map(row => buildTreeFromRecordMap(row, map)))
    }
    else {
      children = List()
    }
    return (
      {
        id: record.id,
        children,
        editor: Item.buildEditor(record.content),
        expand: record.expand,
      }
    )
  };


  export const buildTree = (data: Array<Record>): Item => {
    let root: Record | null = null;
    let rowMap: RecordMap = {};
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const parent = row.parent;
      if (parent === null) {
        root = row
      }
      else if (rowMap.hasOwnProperty(parent)) {
        rowMap[parent].push(row);
      }
      else {
        rowMap[parent] = [row];
      }
    }
    if (root === null) {
      return Item.create('');
    }
    else {
      return buildTreeFromRecordMap(root, rowMap);
    }
  };
}

export interface UpdateItem {
  id: string,
  content: string,
  parent: string | null,
  previous: string | null,
  metadata: object,
  expand: boolean,
}


export namespace UpdateItem {
  export const fromItem = (item: Item, parent: string | null, previous: string | null): UpdateItem => {
    const { id, expand } = item;
    return (
      {
        id,
        content: item.editor.getCurrentContent().getPlainText(),
        parent, previous,
        metadata: {}, expand,
      }
    )
  };

  export const isSame = (a: UpdateItem, b: UpdateItem) => {
    return (
      a.parent === b.parent &&
      a.content === b.content &&
      a.previous === b.previous &&
      a.id === b.id &&
      a.expand === b.expand
    );
  };
}
