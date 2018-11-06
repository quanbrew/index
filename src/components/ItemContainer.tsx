import * as React from 'react';
import { Item, itemTail, Path, update } from "../item";
import './ItemContainer.css';
import 'draft-js/dist/Draft.css';
import classNames from 'classnames';
import { Bullet } from "./Bullet";
import { Link } from "react-router-dom";
import { Line } from "./Line";


interface Props {
  item: Item,
  path: Path;
  next: Path;
  prev: Path;
  editing?: Path;
  edit: (path?: Path, callback?: () => void) => void;
  updateTree: (mapper: (prev: Item) => Item, callback?: () => void) => void;
}


interface State {
}


export class ItemContainer extends React.Component<Props, State> {
  private update(item: Item, callback?: () => void) {
    const { updateTree, path } = this.props;
    updateTree(tree => update(tree, item, path), callback)
  }

  // private toggle = (setExpand?: boolean) => {
  //   const { item, path, edit } = this.props;
  //   const expand = setExpand === undefined ? !item.expand : setExpand;
  //   this.update({ ...item, expand }, () => edit(path));
  // };
  //
  // private indent = () => {
  //   const { updateTree, path, item, edit, prev } = this.props;
  //   if (prev.size < path.size)
  //     return;
  //   const sibling = prev.slice(0, path.size);
  //   let newIndex = 0;
  //   updateTree(
  //     tree => mapLocation(
  //       remove(tree, path),
  //       sibling,
  //       prevItem => {
  //         newIndex = prevItem.children.size;
  //         const children = prevItem.children.push(item);
  //         return { ...prevItem, children, expand: true }
  //       }
  //     ),
  //     () => edit(sibling.push(newIndex))
  //   );
  // };
  // private unIndent = () => {
  //   const { updateTree, path, item, edit } = this.props;
  //   if (path.size < 2) return;
  //   const parent = path.pop();
  //   const next = parent.update(parent.size - 1, x => x + 1);
  //   updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
  // };
  // private remove = () => {
  //   const { updateTree, path, edit, prev } = this.props;
  //   const index = path.last(null);
  //   if (index === null) return;
  //   updateTree(tree => remove(tree, path), () => edit(prev));
  // };
  private displayChild = (currentItem: Item, index: number) => {
    const { path, item, prev, next, updateTree, edit, editing } = this.props;

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
        item={ currentItem } key={ currentItem.id } editing={ editing }
        path={ path.push(index) } prev={ prevPath } next={ nextPath } edit={ edit }
        updateTree={ updateTree }
      />
    );
  };
  private onFocus = () => {
    // const { item } = this.props;
    // const selection = item.editor.getSelection().set('anchorOffset', 2).set('focusOffset', 2) as SelectionState;
    // const editor = EditorState.forceSelection(item.editor, selection);
    // this.update({ ...item, editor });
  };

  private onBlur = () => {
  };

  // private onEnter = (): DraftHandleValue => {
  //   // if content is empty and item is last item in siblings, indent it.
  //   const { item, path, next, updateTree, edit } = this.props;
  //   const isLastItem = next.size < path.size;
  //   const notEmpty = item.editor.getCurrentContent().hasText();
  //   if (isLastItem && path.size > 1 && !notEmpty) {
  //     this.unIndent();
  //   }
  //   else {
  //     const createPath = path.set(path.size - 1, path.last(-1) + 1);
  //     updateTree(tree => insert(tree, [createItem()], createPath), () => edit(createPath));
  //   }
  //   return 'handled';
  // };
  // private onTab = (e: React.KeyboardEvent) => {
  //   e.preventDefault();
  //   if (e.shiftKey) {
  //     return this.unIndent()
  //   }
  //   else {
  //     return this.indent()
  //   }
  // };
  //
  // private handleChange = (editor: EditorState) => {
  //   const { item } = this.props;
  //   this.update({ ...item, editor });
  // };
  // private onUp = (e: React.KeyboardEvent) => {
  //   e.preventDefault();
  //   const { edit, prev, path, item, updateTree } = this.props;
  //   // swap with previous item.
  //   if (e.metaKey) {
  //     if (path.last(0) === 0)
  //       return;
  //     updateTree(tree => insert(remove(tree, path), [item], prev), () => edit(prev))
  //   }
  //   this.navigatePrev();
  // };
  // private onDown = (e: React.KeyboardEvent) => {
  //   e.preventDefault();
  //   const { edit, next, item, path, updateTree } = this.props;
  //   // swap with previous item.
  //   if (e.metaKey) {
  //     // last item
  //     if (path.size > next.size)
  //       return;
  //     updateTree(tree => insert(remove(tree, path), [item], next), () => edit(next));
  //   }
  //   // navigate to next item.
  //   else {
  //     this.navigateNext();
  //   }
  // };
  // private handleKeyCommand = (command: string): DraftHandleValue => {
  //   const { item } = this.props;
  //   switch (command) {
  //     case 'backspace':
  //       const isEmpty = !item.editor.getCurrentContent().hasText();
  //       if (isEmpty && item.children.isEmpty()) {
  //         this.remove();
  //         return 'handled'
  //       }
  //       break;
  //     case 'toggle-list':
  //       this.toggle();
  //       return 'handled';
  //     case 'navigate-next':
  //       this.navigateNext();
  //       return "handled";
  //     case 'navigate-prev':
  //       this.navigatePrev();
  //       return "handled";
  //     case 'list-expand':
  //       this.toggle(true);
  //       return "handled";
  //     case 'list-fold':
  //       this.toggle(false);
  //       return "handled";
  //   }
  //   return "not-handled";
  // };
  // private keyBindingFn = (e: React.KeyboardEvent): string | null => {
  //   console.log(e.key, e.keyCode);
  //   const DOT = 190;
  //   switch (e.keyCode) {
  //     case DOT:
  //       if (e.metaKey) return 'toggle-list';
  //       break;
  //   }
  //   return getDefaultKeyBinding(e);
  // };

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
  }

  // shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
  //   return (
  //     this.props.item.expand !== nextProps.item.expand
  //     || !this.props.item.children.equals(nextProps.item.children)
  //     || this.props.item.source !== this.props.item.source
  //     || this.props.updateTree !== nextProps.updateTree
  //     || this.props.editing !== nextProps.editing
  //     || isSubPathOf(this.props.path, this.props.editing)
  //   );
  // }


  render() {
    const { item, path, editing, edit } = this.props;
    const isEditing = path.equals(editing);
    const className = classNames('ItemContainer', { editing: isEditing });
    const zoomPath = `/${ item.id }`;
    const children = item.expand ? (<div className='children'>{ item.children.map(this.displayChild) }</div>) : null;
    return (
      <div className={ className }>
        <div>
          <Bullet onClick={ () => {
          } } expand={ item.expand } hasChild={ !item.children.isEmpty() }/>
          <Link to={ zoomPath }>zoom</Link>
          <Line
            source={ item.source }
            onChange={ source => this.update({ ...item, source }) }
            isEditing={ isEditing }
            edit={ callback => edit(path, callback) }
            exit={ callback => edit(undefined, callback) }
          />
        </div>
        { children }
      </div>
    );
  }

}

