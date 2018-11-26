import { Item, Record, UpdateItem } from "./item";

const HOST: string = process.env.HOST as string;


export const getAllItem = (): Promise<Item> => fetch(HOST.concat("/item/"))
  .then(response => response.json())
  .then(Record.buildTree);


export const postChangedItems = (items: Array<UpdateItem>) => {
  return fetch(
    HOST + "/item/",
    {
      method: "POST",
      body: JSON.stringify(items),
      headers: { 'content-type': 'application/json' }
    },
  );
};




export const deleteItem = (id: string) => {
  return fetch(HOST + "/item/", {
    method: "DELETE",
    body: JSON.stringify({ id }),
    headers: { 'content-type': 'application/json' },
  })
};
