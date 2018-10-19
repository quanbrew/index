import * as React from 'react';
import { addChild, createItem, Item } from "../Item";
import { Path } from "./App";
import { Editor, EditorState } from 'draft-js';
import './ItemContainer.css';
import classNames from 'classnames';


interface Props {
  item: Item,
  path: Path;
  next: Path;
  prev: Path;
  edit: (path?: Path) => void;
  modifying?: Modification;
}


interface State {
  caret?: number;
}


export interface Modification {
  editing?: Path;
  indent: (path: Path) => void;
  unIndent: (path: Path) => void;
  remove: (path: Path, prev?: Path) => void;
  update: (next: Item, callback?: () => void) => void;
  create: (item?: Item, after?: number) => void;
}


// Get last descendant item
const itemTail = (path: Path, item: Item): Path => {
  const last = item.children.last(null);
  if (last === null) return path;
  else return itemTail(path.push(item.children.size - 1), last);
};


const isSubPath = (path: Path, subPath: Path): boolean => {
  // TODO: replace recursion with loop.
  if (subPath.isEmpty())
    return true;
  else if (path.first(NaN) === subPath.first(NaN))
    return isSubPath(path.rest(), subPath.rest());
  else
    return false;
};



export class ItemContainer extends React.Component<Props, State> {
  editor: React.RefObject<Editor>;
  createChildItem = (child = createItem(), after?: number) => {
    const { path, item, modifying, edit } = this.props;
    if (!modifying)
      return ItemContainer.modifyWarn();
    const { update } = modifying;
    const size = item.children.size;

    // compute insert position
    let position = size;
    if (after !== undefined) {
      if (after + 1 < size) position = after + 1;
    }

    update(addChild(item, child, position), () => edit(path.push(position)));
  };
  removeChild = (path: Path, prev?: Path) => {
    const index = path.last(undefined);
    if (index === undefined) return;

    const { item, modifying, edit } = this.props;
    if (!modifying)
      return ItemContainer.modifyWarn();
    const { update } = modifying;

    update(
      { ...item, children: item.children.remove(index) },
      () => edit(prev),
    )
  };
  indentChild = (path: Path) => {
    const index = path.last(0);

    // first item or root item can't indent
    if (index === 0) return;

    const { item, modifying, edit } = this.props;
    if (!modifying)
      return ItemContainer.modifyWarn();
    const { update } = modifying;
    const prevItem = item.children.get(index - 1, null);
    const indentItem = item.children.get(index, null);
    // make type checker happy
    if (prevItem === null || indentItem === null)
      return console.error('unexpected index', index);

    // move indent item as previous item's child.
    const children = item.children
      .splice(index - 1, 2, addChild(prevItem, indentItem));

    // update children
    update(
      { ...item, children },
      () => edit(this.props.path.push(index - 1, prevItem.children.size))
    );
  };
  unIndentChild = (path: Path) => {
    // root's children can't un-indent
    if (path.size < 2) return;

    const index = path.last() as number;
    const { item, modifying } = this.props;
    if (!modifying)
      return ItemContainer.modifyWarn();
    const { update, create } = modifying;
    const currentItem = item.children.get(index);
    // make type checker happy
    if (currentItem === undefined) return console.error('unexpected index', index);
    update(
      { ...item, children: item.children.remove(index) },
      () => create(currentItem, this.props.path.last())
    );
  };
  displayChild = (currentItem: Item, index: number) => {
    const { modifying, path, item, prev, next, edit } = this.props;

    let itemPrev = prev;
    const prevItem = item.children.get(index - 1);

    if (index === 0) itemPrev = path; // move to parent
    else if (prevItem !== undefined)
      itemPrev = itemTail(path.push(index - 1), prevItem);

    const itemNext = index < item.children.size - 1 ? path.push(index + 1) : next;

    const itemPath = path.push(index);

    let itemModifying = undefined;
    if (modifying && modifying.editing && isSubPath(modifying.editing, itemPath)) {
      const update: typeof modifying.update = (next, callback) =>
        modifying.update({ ...item, children: item.children.set(index, next) }, callback);
      itemModifying = {
        ...modifying,
        update,
        create: this.createChildItem,
        remove: this.removeChild,
        indent: this.indentChild,
        unIndent: this.unIndentChild,
      }
    }


    return (
      <ItemContainer
        item={ currentItem } key={ currentItem.id } modifying={ itemModifying }
        path={ itemPath } prev={ itemPrev } next={ itemNext } edit={ edit }
      />
    );
  };
  // handleKeyDown = (e: React.KeyboardEvent) => {
  //   // console.log(e.key, e.keyCode);
  //   const { item, indent, unIndent, create, path, edit, prev, remove } = this.props;
  //   e.stopPropagation(); // don't propagate to parent.
  //   switch (e.key) {
  //     case 'ArrowUp':
  //       return edit(prev);
  //     case 'ArrowDown':
  //       return this.down();
  //     case 'Enter':
  //       // if content is empty and item is last item in siblings, indent it.
  //       if (item.text === '' && this.isLastItem() && path.size > 1)
  //         return unIndent(path);
  //       else
  //         return create(createItem(), path.last());
  //     // exit edit
  //     case 'Escape':
  //       return this.props.edit();
  //     // indent or un-indent
  //     case 'Tab':
  //       e.preventDefault();
  //       if (e.shiftKey) {
  //         return unIndent(path)
  //       }
  //       else {
  //         return indent(path)
  //       }
  //     case 'Backspace':
  //       if (item.text === '') {
  //         e.preventDefault();
  //         return remove(path, prev);
  //       }
  //   }
  // };
  // handleContentClick = () => {
  //   if (this.isEditing()) return;
  //   const { edit, path } = this.props;
  //   const selection = window.getSelection();
  //   this.setState({ caret: selection.anchorOffset });
  //   edit(path);
  // };
  handleChange = (editor: EditorState) => {
    const { modifying, item, edit, path } = this.props;
    if (modifying)
      modifying.update({ ...item, editor });
    else
      edit(path);
  };

  // down() {
  //   const { edit, next, item, path } = this.props;
  //   if (item.children.size !== 0)
  //     edit(path.push(0)); // enter next level
  //   else if (this.isFinallyItem())
  //     return;
  //   else
  //     edit(next);
  // }

  constructor(props: Props) {
    super(props);
    this.state = {};
    this.editor = React.createRef();
  }

  static isEditorStateChange(current: EditorState, next: EditorState): boolean {
    // @ts-ignore
    if (current.getImmutable) {
      // NOTICE:
      // This is a ugly workaround.
      // `getImmutable` not in documents nor in type definition.
      // @ts-ignore
      return !current.getImmutable().equals(next.getImmutable());
    }
    else if (current.equals) {
      // `equals` is in the type definition but not in actually object.
      return !current.equals(next);
    }
    else {
      console.warn('Cannot compare editor state!');
      // Always return `true`, avoid bug.
      return true;
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      this.props.modifying !== undefined
      || nextProps.modifying !== undefined
      || this.props.item.expand !== nextProps.item.expand
      || !this.props.item.children.equals(nextProps.item.children)
      || ItemContainer.isEditorStateChange(this.props.item.editor, nextProps.item.editor)
    );
  }

  static modifyWarn() {
    console.warn('call modify method on non-editing item');
    console.trace();
  }

  isEditing(): boolean {
    const { modifying, path } = this.props;

    return modifying !== undefined && modifying.editing !== undefined && modifying.editing.equals(path);
  }


  render() {
    const isEditing = this.isEditing();
    const className = classNames('ItemContainer', { editing: isEditing });
    const { item, edit, path } = this.props;
    return (
      <div className={ className }>
        <div>
          <Editor onFocus={ () => edit(path) } ref={ this.editor } editorState={ item.editor }
                  onChange={ this.handleChange }/>
        </div>
        <div className='children'>
          { item.children.map(this.displayChild) }
        </div>
      </div>
    );
  }
}
