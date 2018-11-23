import { buildEditor, createItem, Item } from "./item";
import { List } from "immutable";

const HOST: string = process.env.HOST as string;


interface Row {
  id: string;
  content: string;
  parent: string | null;
  expand: boolean;
  metadata: object;
  tags: Array<string>;
  created: string;
  modified: string;
}


type RowMap = { [parent: string]: Array<Row> };


const buildTreeByRowMap = (row: Row, map: RowMap): Item => {
  let children;
  if (map[row.id] !== undefined) {
    children = List(map[row.id].map(row => buildTreeByRowMap(row, map)))
  }
  else {
    children = List()
  }
  return (
    {
      id: row.id,
      children,
      editor: buildEditor(row.content),
      expand: row.expand,
    }
  )
};


const buildTreeFromRows = (data: Array<Row>): Item => {
  let root: Row | null = null;
  let rowMap: RowMap = {};
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
    return createItem('');
  }
  else {
    return buildTreeByRowMap(root, rowMap);
  }
};


export const getAllItem = (): Promise<Item> => fetch(HOST.concat("/item/"))
  .then(response => response.json())
  .then(buildTreeFromRows);


export interface NewItem {
  id: string,
  content: string,
  parent: string | null,
  previous: string | null,
  metadata: object,
  expand: boolean,
}


export const postChangedItems = (items: Array<NewItem>) => {
  return fetch(
    HOST + "/item/",
    {
      method: "POST",
      body: JSON.stringify(items),
      headers: { 'content-type': 'application/json' }
    },
  );
};


export const makeNewItemFromItem = (item: Item, parent: string | null, previous: string | null): NewItem => {
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

export const isSameNewItem = (a: NewItem, b: NewItem) => {
  return (
    a.parent === b.parent &&
    a.content === b.content &&
    a.previous === b.previous &&
    a.id === b.id &&
    a.expand === b.expand
  );
};


export const deleteItem = (id: string) => {
  return fetch(HOST + "/item/", {
    method: "DELETE",
    body: JSON.stringify({ id }),
    headers: { 'content-type': 'application/json' },
  })
};
