import * as React from 'react';
import { addChild, createItem, Item } from "../item";
import { isSubPathOf, Path } from "../path";
import { DraftHandleValue, Editor, EditorState, getDefaultKeyBinding } from 'draft-js';
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import classNames from 'classnames';
import { Bullet } from "./Bullet";


interface Props {
  item: Item,
  path: Path;
  next: Path;
  prev: Path;
  edit: (path?: Path) => void;
  modifying: Modification;
}


interface State {
  caret?: number;
  isFocus: boolean;
}


export interface Modification {
  editing?: Path;
  insert: (path: Path, items: Array<Item>, callback?: () => void) => void;
  indent: (path: Path) => void;
  unIndent: (path: Path) => void;
  remove: (path: Path, callback?: () => void) => void;
  update: (next: Item, callback?: () => void) => void;
  create: (item?: Item, after?: number) => void;
}


// Get last descendant item
const itemTail = (path: Path, item: Item): Path => {
  const last = item.children.last(null);
  if (last === null) return path;
  else return itemTail(path.push(item.children.size - 1), last);
};


export class ItemContainer extends React.Component<Props, State> {
  editor: React.RefObject<Editor>;
  children: { [position: number]: ItemContainer | null };
  focus = () => {
    if (this.editor.current) {
      this.onFocus();
      this.editor.current.focus();
      const editor = EditorState.moveFocusToEnd(this.props.item.editor);
      this.props.modifying.update({ ...this.props.item, editor })
    }
    else {
      console.log('not found ref');
    }
  };
  private createChildItem = (child = createItem(), after?: number) => {
    const { path, item, modifying, edit } = this.props;
    const { update } = modifying;
    const size = item.children.size;

    // compute insert position
    let position = size;
    if (after !== undefined) {
      if (after + 1 < size) position = after + 1;
    }

    update(addChild(item, child, position), () => edit(path.push(position)));
  };
  insertBefore = (target: Path, items: Array<Item>, callback: () => void) => {
    const { path, modifying } = this.props;

    // make a updated item
    function next(item: Item, relative: Path, beInserted: Array<Item>): Item {
      // console.log(item, relative.toJS(), beInserted);
      const index = relative.first(null);
      if (index === null) {
        console.warn('unexpected relative path!');
        return item;
      }
      if (relative.size === 1) {
        const children = item.children.splice(index, 0, ...beInserted);
        return { ...item, children }
      }
      else {
        const child = item.children.get(index, undefined);
        if (child === undefined) {
          console.warn('unexpected child index', index, item.children.toJS());
          return item;
        }
        const nextChild = next(child, relative.rest(), items);
        const children = item.children.set(index, nextChild);
        return { ...item, children };
      }
    }

    if (target.isEmpty()) {
      console.warn('try move item to before root.');
    }
    else if (path.equals(target)) {
      // console.warn('unexpected target', target.toJS());
      modifying.insert(target, items);
    }
    else if (isSubPathOf(path, target)) {
      const item = next(this.props.item, target.slice(path.size), items);
      this.props.modifying.update(item, callback);
    }
    else {
      // go to parent.
      modifying.insert(target, items);
    }
  };
  private indentChild = (path: Path) => {
    const index = path.last(0);

    // first item or root item can't indent
    if (index === 0) return;

    const { item, modifying } = this.props;
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
      () => this.handleEdit(this.props.path.push(index - 1, prevItem.children.size))
    );
  };
  private unIndentChild = (path: Path) => {
    // root's children can't un-indent
    if (path.size < 2) return;

    const index = path.last() as number;
    const { item, modifying } = this.props;
    const { update, create } = modifying;
    const currentItem = item.children.get(index);
    // make type checker happy
    if (currentItem === undefined) return console.error('unexpected index', index);
    update(
      { ...item, children: item.children.remove(index) },
      () => create(currentItem, this.props.path.last())
    );
  };
  private removeChild = (path: Path, callback?: () => void) => {
    const index = path.last(undefined);
    if (index === undefined) return;

    const { item, modifying } = this.props;
    const { update } = modifying;

    update({ ...item, children: item.children.remove(index) }, callback)
  };

  handleEdit = (target?: Path) => {
    const { path } = this.props;
    if (target === undefined) {
      return;
    }
    else if (target.equals(path)) {
      // console.info(this.props.item.editor.getCurrentContent().getPlainText());
      this.focus();
    }
    else if (!isSubPathOf(path, target)) {
      this.props.edit(target);
    }
    else {
      const index = target.get(path.size, null);
      if (index === null)
        return console.warn('unexpected index', index, target.toJS());
      const child = this.children[index];
      if (child === undefined || child === null) {
        console.trace("can't found child", target.toJS(), path.toJS(), this.children);
        return;
      }
      child.handleEdit(target);
    }
  };
  private displayChild = (currentItem: Item, index: number) => {
    const { modifying, path, item, prev, next } = this.props;

    let itemPrev = prev;
    const prevItem = item.children.get(index - 1);

    if (index === 0) itemPrev = path; // move to parent
    else if (prevItem !== undefined)
      itemPrev = itemTail(path.push(index - 1), prevItem);

    const itemNext = index < item.children.size - 1 ? path.push(index + 1) : next;

    const itemPath = path.push(index);

    const update: typeof modifying.update = (next, callback) =>
      modifying.update({ ...item, children: item.children.set(index, next) }, callback);
    const itemModifying: Modification = {
      ...modifying,
      update,
      create: this.createChildItem,
      remove: this.removeChild,
      indent: this.indentChild,
      unIndent: this.unIndentChild,
      insert: this.insertBefore,
    };


    return (
      <ItemContainer
        item={ currentItem } key={ currentItem.id } modifying={ itemModifying }
        path={ itemPath } prev={ itemPrev } next={ itemNext } edit={ this.handleEdit }
        ref={ child => this.children[index] = child }
      />
    );
  };
  private handleChange = (editor: EditorState) => {
    const { modifying, item } = this.props;
    modifying.update({ ...item, editor });
  };
  private onEnter = (): DraftHandleValue => {
    // if content is empty and item is last item in siblings, indent it.
    const { item, path, next, modifying } = this.props;
    const isLastItem = next.size < path.size;
    if (isLastItem && path.size > 1 && !item.editor.getCurrentContent().hasText()) {
      modifying.unIndent(path);
    }
    else {
      modifying.create(createItem(), path.last());
    }
    return 'handled';
  };
  private onTab = (e: React.KeyboardEvent) => {
    const { path, modifying } = this.props;
    e.preventDefault();
    if (e.shiftKey) {
      return modifying.unIndent(path)
    }
    else {
      return modifying.indent(path)
    }
  };
  private onFocus = () => {
    // console.log('focus');
    this.setState({ isFocus: true })
  };
  private onBlur = () => {
    // console.log('blur');
    this.setState({ isFocus: false });
  };

  private handleKeyCommand = (command: string): DraftHandleValue => {
    console.log('command:', command);
    const { item, modifying, path, prev, edit } = this.props;
    switch (command) {
      case 'backspace':
        if (!item.editor.getCurrentContent().hasText()) {
          modifying.remove(path, () => edit(prev));
          return 'handled'
        }
        break;
      case 'toggle-list':
        this.toggle();
        return 'handled';
    }
    return 'not-handled';
  };

  private keyBindingFn = (e: React.KeyboardEvent): string | null => {
    console.log(e.key, e.keyCode);
    const DOT = 190;
    switch (e.keyCode) {
      case DOT:
        if (e.metaKey) return 'toggle-list';
        else break
    }
    return getDefaultKeyBinding(e);
  };

  private onUp = (e: React.KeyboardEvent) => {
    const { edit, prev, path, item } = this.props;
    // swap with previous item.
    if (e.metaKey) {
      e.preventDefault();
      if (path.last(0) === 0)
        return;
      const { remove, insert } = this.props.modifying;
      remove(path, () => insert(prev, [item], () => edit(prev)));
    }
    // navigate to previous item.
    else {
      edit(prev);
    }
  };

  private onDown = (e: React.KeyboardEvent) => {
    const { edit, next, item, path } = this.props;
    // swap with previous item.
    if (e.metaKey) {
      e.preventDefault();
      // last item
      if (path.size > next.size)
        return;
      const { remove, insert } = this.props.modifying;
      remove(path, () => insert(next, [item], () => edit(next)));
    }
    // navigate to next item.
    else {
      if (item.children.size !== 0)
        edit(path.push(0)); // enter next level
      else if (!path.isEmpty() && next.isEmpty())
        return;
      else
        edit(next);
    }
  };

  private toggle = () => {
    const { item, modifying } = this.props;
    const expand = !item.expand;
    modifying.update({ ...item, expand });
  };



  constructor(props: Props) {
    super(props);
    this.state = { isFocus: false };
    this.children = {};
    this.editor = React.createRef();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
  }

  render() {
    const className = classNames('ItemContainer', { editing: this.state.isFocus });
    const { item } = this.props;

    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    return (
      <div className={ className }>
        <div>
          <Bullet onClick={ this.toggle } expand={ item.expand } hasChild={ !item.children.isEmpty() }/>
          <Editor editorState={ item.editor }
                  onTab={ this.onTab }
                  ref={ this.editor }
                  handleReturn={ this.onEnter }
                  keyBindingFn={ this.keyBindingFn }
                  handleKeyCommand={ this.handleKeyCommand }
                  onUpArrow={ this.onUp }
                  onDownArrow={ this.onDown }
                  onBlur={ this.onBlur }
                  onFocus={ this.onFocus }
                  onChange={ this.handleChange }/>
        </div>
        { children }
      </div>
    );
  }
}
