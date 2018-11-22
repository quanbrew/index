import { buildEditor, createItem, Item } from "./item";
import { List } from "immutable";

const HOST: string = process.env.HOST as string;


interface Row {
  id: string;
  content: string;
  parent: string | null;
  fold: boolean;
  metadata: object;
  favorite: boolean;
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
      expand: !row.fold,
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

