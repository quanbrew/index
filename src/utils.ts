import { EditorState } from "draft-js";

export const empty = () => {};

export interface Position {
  row: number,
  column: number,
}


export interface Select {
  anchor?: Position,
  focus: Position,
}


export const scrollInto = (element: Element) => {
  if (isElementInViewport(element))
    return;
  const options: ScrollIntoViewOptions = {
    behavior: "smooth",
    block: "center",
    inline: "center",
  };
  element.scrollIntoView(options);
};


export function isElementInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  const rootElement = document.documentElement as HTMLElement;
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || rootElement.clientHeight) &&
    rect.right <= (window.innerWidth || rootElement.clientWidth)
  );
}


export const isEditorStateChange = (current: EditorState, next: EditorState): boolean => {
  // @ts-ignore
  if (current.getImmutable) {
    // NOTICE:
    // This is a ugly workaround.
    // `getImmutable` not in documents nor in type definition.
    // @ts-ignore
    return !current.getImmutable().equals(next.getImmutable());
  }
  else {
    return current !== next;
  }
};
