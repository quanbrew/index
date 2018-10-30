import * as React from 'react';
import {createItem, insert, isSubPathOf, Item, remove, update} from "../item";
import { Path } from "../item";
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
  updateTree: (mapper: (prev: Item) => Item, callback?: () => void) => void;
}


interface State {
  caret?: number;
  isFocus: boolean;
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
    if (!this.editor.current) {
      return console.warn('editor ref not found');
    }
    const { item } = this.props;
    const editor = EditorState.moveFocusToEnd(item.editor);
    this.update({ ...item, editor }, () => {

      if (!this.editor.current) {
        return console.warn('editor ref not found');
      }
      this.editor.current.focus();
      this.onFocus();
    });
    if (this.selfDiv.current) {
      const options: ScrollIntoViewOptions = { behavior: "smooth", block: "nearest", inline: "nearest" };
      this.selfDiv.current.scrollIntoView(options);
    }
  };
  private indent = () => {
    const { updateTree, path, item, edit, prev } = this.props;
    let next = prev;
    if (prev.size === path.size) {
      next = prev.push(0);
    }
    else if (prev.size > path.size) {
      next = prev.slice(0, path.size + 1).update(path.size, x => x + 1);
    }
    else {
      return;
    }
    updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
  };
  private unIndent = () => {
    const { updateTree, path, item, edit } = this.props;
    if (path.size < 2) return;
    const parent = path.pop();
    const next = parent.update(parent.size - 1, x => x + 1);
    updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
  };
  private remove = () => {
    const { updateTree, path, edit, prev } = this.props;
    const index = path.last(null);
    if (index === null) return;
    updateTree(tree => remove(tree, path), () => edit(prev));
  };
  private displayChild = (currentItem: Item, index: number) => {
    const { path, item, prev, next } = this.props;

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


    return (
      <ItemContainer
        item={ currentItem } key={ currentItem.id }
        path={ itemPath } prev={ prevPath } next={ nextPath } edit={ this.handleEdit }
        ref={ child => this.children[index] = child } updateTree={ this.props.updateTree }
      />
    );
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
  private handleChange = (editor: EditorState) => {
    const { item } = this.props;
    this.update({ ...item, editor });
  };
  private onEnter = (): DraftHandleValue => {
    // if content is empty and item is last item in siblings, indent it.
    const { item, path, next, updateTree, edit } = this.props;
    const isLastItem = next.size < path.size;
    if (isLastItem && path.size > 1 && !item.editor.getCurrentContent().hasText()) {
      this.unIndent();
    }
    else {
      const createPath = path.set(path.size - 1, path.last(-1) + 1);
      updateTree(tree => insert(tree, [createItem()], createPath), () => edit(createPath));
    }
    return 'handled';
  };
  private onTab = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      return this.unIndent()
    }
    else {
      return this.indent()
    }
  };
  private handleKeyCommand = (command: string): DraftHandleValue => {
    console.log('command:', command);
    const { item } = this.props;
    switch (command) {
      case 'backspace':
        if (!item.editor.getCurrentContent().hasText() && item.children.isEmpty()) {
          this.remove();
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
  private onFocus = () => {
    console.log('focus', this.props.item.editor.getCurrentContent().getPlainText());
    this.setState({ isFocus: true })
  };
  private onBlur = () => {
    console.log('blur', this.props.item.editor.getCurrentContent().getPlainText());
    this.setState({ isFocus: false });
  };
  private onUp = (e: React.KeyboardEvent) => {
    const { edit, prev, path, item, updateTree } = this.props;
    // swap with previous item.
    if (e.metaKey) {
      e.preventDefault();
      if (path.last(0) === 0)
        return;
      updateTree(tree => insert(remove(tree, path), [item], prev), () => edit(prev))
    }
    // navigate to previous item.
    else {
      this.navigatePrev();
    }
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
  private onDown = (e: React.KeyboardEvent) => {
    const { edit, next, item, path, updateTree } = this.props;
    // swap with previous item.
    if (e.metaKey) {
      e.preventDefault();
      // last item
      if (path.size > next.size)
        return;
      updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
    }
    // navigate to next item.
    else {
      this.navigateNext();
    }
  };
  private toggle = (setExpand?: boolean) => {
    const { item } = this.props;
    const expand = setExpand === undefined ? !item.expand : setExpand;
    this.update({ ...item, expand }, this.focus);
  };

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      this.props.item.expand !== nextProps.item.expand
      || !this.props.item.children.equals(nextProps.item.children)
      || this.state.isFocus !== nextState.isFocus
      || ItemContainer.isEditorStateChange(this.props.item.editor, nextProps.item.editor)
      || this.props.updateTree !== nextProps.updateTree
    );
  }

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

  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => update(tree, item, path), callback)
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
