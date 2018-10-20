import * as React from 'react';
import { addChild, createItem, Item } from "../Item";
import { isSubPathOf, Path } from "../path";
import { DraftHandleValue, Editor, EditorState } from 'draft-js';
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import classNames from 'classnames';


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





export class ItemContainer extends React.Component<Props, State> {
  editor: React.RefObject<Editor>;
  children: { [position: number]: ItemContainer | null };
  focus = () => {
    if (this.editor.current) {
      this.onFocus();
      this.editor.current.focus();
    }
    else {
      console.log('not found ref');
    }
  };
  down = () => {
    const { edit, next, item, path } = this.props;
    if (item.children.size !== 0)
      edit(path.push(0)); // enter next level
    else if (!path.isEmpty() && next.isEmpty())
      return;
    else
      edit(next);
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
  private removeChild = (path: Path, prev?: Path) => {
    const index = path.last(undefined);
    if (index === undefined) return;

    const { item, modifying, edit } = this.props;
    const { update } = modifying;

    update(
      { ...item, children: item.children.remove(index) },
      () => edit(prev),
    )
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
  private handleKeyCommand = (command: string): DraftHandleValue => {
    console.log('command:', command);
    const { item, modifying, path, prev } = this.props;
    switch (command) {
      case 'backspace':
        if (!item.editor.getCurrentContent().hasText()) {
          modifying.remove(path, prev);
          return 'handled'
        }
        break
    }
    return 'not-handled';
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
    const { item, edit, prev } = this.props;
    return (
      <div className={ className }>
        <div onClick={ () => this.focus() }>
          <Editor editorState={ item.editor }
                  onTab={ this.onTab }
                  ref={ this.editor }
                  handleReturn={ this.onEnter }
                  handleKeyCommand={ this.handleKeyCommand }
                  onUpArrow={ () => edit(prev) }
                  onDownArrow={ this.down }
                  onBlur={ this.onBlur }
                  onFocus={ this.onFocus }
                  onChange={ this.handleChange }/>
        </div>
        <div className='children'>
          { item.children.map(this.displayChild) }
        </div>
      </div>
    );
  }
}
