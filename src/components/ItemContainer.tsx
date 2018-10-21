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
  selfDiv: React.RefObject<HTMLDivElement>;
  children: { [position: number]: ItemContainer | null };
  focus = () => {
    if (this.editor.current) {
      const editor = EditorState.moveFocusToEnd(this.props.item.editor);
      this.props.modifying.update({ ...this.props.item, editor }, () => {
        if (this.editor.current) {
          this.editor.current.focus();
          this.onFocus();
        }
        else {
          console.warn("can't found editor ref")
        }
      });
      if (this.selfDiv.current) {
        const options: ScrollIntoViewOptions = { behavior: "smooth", block: "nearest", inline: "nearest" };
        this.selfDiv.current.scrollIntoView(options);
      }
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
        console.warn("can't found child", target.toJS(), path.toJS(), this.children);
        console.trace();
        return;
      }
      child.handleEdit(target);
    }
  };
  private displayChild = (currentItem: Item, index: number) => {
    const { modifying, path, item, prev, next } = this.props;

    let prevPath = prev;
    const prevItem = item.children.get(index - 1);

    if (index === 0) prevPath = path; // move to parent
    else if (prevItem !== undefined) {
      if (prevItem.expand)
        prevPath = itemTail(path.push(index - 1), prevItem);
      else
        prevPath = path.push(index - 1);
    }

    const nextPath = index < item.children.size - 1 ? path.push(index + 1) : next;

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
        path={ itemPath } prev={ prevPath } next={ nextPath } edit={ this.handleEdit }
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
    console.log('focus', this.props.item.editor.getCurrentContent().getPlainText());
    this.setState({ isFocus: true })
  };
  private onBlur = () => {
    console.log('blur', this.props.item.editor.getCurrentContent().getPlainText());
    this.setState({ isFocus: false });
  };

  private handleKeyCommand = (command: string): DraftHandleValue => {
    console.log('command:', command);
    const { item, modifying, path, prev, edit } = this.props;
    switch (command) {
      case 'backspace':
        if (!item.editor.getCurrentContent().hasText() && item.children.isEmpty()) {
          modifying.remove(path, () => edit(prev));
          return 'handled'
        }
        break;
      case 'toggle-list':
        this.toggle();
        return 'handled';
      case 'navigate-next':
        this.navigateNext();
        return "handled";
      case 'navigate-prev':
        this.navigatePrev();
        return "handled";
      case 'list-expand':
        this.toggle(true);
        return "handled";
      case 'list-fold':
        this.toggle(false);
        return "handled";
    }
    return 'not-handled';
  };

  private keyBindingFn = (e: React.KeyboardEvent): string | null => {
    console.log(e.key, e.keyCode);
    const DOT = 190;
    const J = 74;
    const K = 75;
    const L = 76;
    const H = 72;
    switch (e.keyCode) {
      case DOT:
        if (e.metaKey) return 'toggle-list';
        break;
      case J:
        if (e.metaKey) {
          e.preventDefault();
          return 'navigate-next'
        }
        break;
      case K:
        if (e.metaKey) return 'navigate-prev';
        break;
      case L:
        if (e.metaKey) return 'list-expand';
        break;
      case H:
        if (e.metaKey) return 'list-fold';
        break;
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
      this.navigatePrev();
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
      this.navigateNext();
    }
  };
  private toggle = (setExpand?: boolean) => {
    const { item, modifying } = this.props;
    const expand = setExpand === undefined ? !item.expand : setExpand;
    modifying.update({ ...item, expand }, this.focus);
  };

  constructor(props: Props) {
    super(props);
    this.state = { isFocus: false };
    this.children = {};
    this.editor = React.createRef();
    this.selfDiv = React.createRef();
  }

  render() {
    const className = classNames('ItemContainer', { editing: this.state.isFocus });
    const { item } = this.props;

    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    return (
      <div ref={ this.selfDiv } className={ className }>
        <div>
          <Bullet onClick={ () => this.toggle() } expand={ item.expand } hasChild={ !item.children.isEmpty() }/>
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
      this.props.item.expand !== nextProps.item.expand
      || !this.props.item.children.equals(nextProps.item.children)
      || ItemContainer.isEditorStateChange(this.props.item.editor, nextProps.item.editor)
      || this.state.isFocus !== nextState.isFocus
    );
  }

  private navigateNext() {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0 && item.expand)
      edit(path.push(0)); // enter next level
    else if (!path.isEmpty() && next.isEmpty()) return;
    else edit(next);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
  }

  private navigatePrev() {
    const { edit, prev } = this.props;
    edit(prev);
  }
}
