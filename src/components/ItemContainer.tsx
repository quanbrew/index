import * as React from 'react';
import { createItem, insert, Item, itemTail, Path, remove, update } from "../item";
import { DraftHandleValue, Editor, EditorState, getDefaultKeyBinding } from 'draft-js';
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import classNames from 'classnames';
import { Bullet } from "./Bullet";
import { scrollInto } from "../utils";


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



export class ItemContainer extends React.Component<Props, State> {
  editorRef: React.RefObject<Editor>;
  selfRef: React.RefObject<HTMLDivElement>;
  children: { [position: number]: ItemContainer | null };

  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => update(tree, item, path), callback)
  }

  focus = () => {
    if (!this.editorRef.current)
      return console.warn('Ref of this item is invalid.');
    this.editorRef.current.focus();
    this.onFocus();
    const selfElement = this.selfRef.current;
    if (selfElement) {
      scrollInto(selfElement.getElementsByClassName('bullet')[0]);
    }
  };
  private toggle = (setExpand?: boolean) => {
    const { item } = this.props;
    const expand = setExpand === undefined ? !item.expand : setExpand;
    this.update({ ...item, expand }, this.focus);
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
    const { path, item, prev, next, updateTree, edit } = this.props;

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

    return (
      <ItemContainer
        item={ currentItem } key={ currentItem.id }
        path={ path.push(index) } prev={ prevPath } next={ nextPath } edit={ edit }
        ref={ child => this.children[index] = child } updateTree={ updateTree }
      />
    );
  };
  private onFocus = () => {
    // const { item } = this.props;
    // const selection = item.editor.getSelection().set('anchorOffset', 2).set('focusOffset', 2) as SelectionState;
    // const editor = EditorState.forceSelection(item.editor, selection);
    // this.update({ ...item, editor });
    this.setState({ isFocus: true });
  };

  private onBlur = () => {
    this.setState({ isFocus: false });
  };

  private onEnter = (): DraftHandleValue => {
    // if content is empty and item is last item in siblings, indent it.
    const { item, path, next, updateTree, edit } = this.props;
    const isLastItem = next.size < path.size;
    const notEmpty = item.editor.getCurrentContent().hasText();
    if (isLastItem && path.size > 1 && !notEmpty) {
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

  private handleChange = (editor: EditorState) => {
    const { item } = this.props;
    this.update({ ...item, editor });
  };
  private onUp = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const { edit, prev, path, item, updateTree } = this.props;
    // swap with previous item.
    if (e.metaKey) {
      if (path.last(0) === 0)
        return;
      updateTree(tree => insert(remove(tree, path), [item], prev), () => edit(prev))
    }
    this.navigatePrev();
  };
  private onDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const { edit, next, item, path, updateTree } = this.props;
    // swap with previous item.
    if (e.metaKey) {
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
  private handleKeyCommand = (command: string): DraftHandleValue => {
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
    return "not-handled";
  };
  private keyBindingFn = (e: React.KeyboardEvent): string | null => {
    console.log(e.key, e.keyCode);
    const DOT = 190;
    switch (e.keyCode) {
      case DOT:
        if (e.metaKey) return 'toggle-list';
        break;
    }
    return getDefaultKeyBinding(e);
  };

  private navigateNext() {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0 && item.expand)
      edit(path.push(0)); // enter next level
    else if (!path.isEmpty() && next.isEmpty()) return;
    else {
      edit(next)
    }
  }

  private navigatePrev() {
    const { edit, prev } = this.props;
    edit(prev);
  }

  constructor(props: Props) {
    super(props);
    this.state = { isFocus: false };
    this.children = {};
    this.editorRef = React.createRef();
    this.selfRef = React.createRef();
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      this.props.item.expand !== nextProps.item.expand
      || !this.props.item.children.equals(nextProps.item.children)
      || this.state.isFocus !== nextState.isFocus
      || this.props.item.editor !== nextProps.item.editor
      || this.props.updateTree !== nextProps.updateTree
    );
  }


  render() {
    const className = classNames('ItemContainer', { editing: this.state.isFocus });
    const { item } = this.props;

    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    return (
      <div ref={ this.selfRef } className={ className }>
        <div>
          <Bullet onClick={ () => this.toggle() } expand={ item.expand } hasChild={ !item.children.isEmpty() }/>
          <Editor editorState={ item.editor }
                  ref={ this.editorRef }
                  handleKeyCommand={ this.handleKeyCommand }
                  onUpArrow={ this.onUp }
                  onDownArrow={ this.onDown }
                  handleReturn={ this.onEnter }
                  onTab={ this.onTab }
                  onBlur={ this.onBlur }
                  keyBindingFn={ this.keyBindingFn }
                  onFocus={ this.onFocus }
                  onChange={ this.handleChange }/>
        </div>
        { children }
      </div>
    );
  }

}

