import { baseKeymap } from 'prosemirror-commands';
import { undo, redo, history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { buildInputRules, buildKeymap } from 'prosemirror-example-setup';
import { liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';

import ItemList from 'flarum/common/utils/ItemList';
import disabledPlugin from './disabledPlugin';
import placeholderPlugin from './placeholderPlugin';

export default class ProseMirrorEditorDriver {
  constructor(target, attrs) {
    this.build(target, attrs);
  }

  build(target, attrs) {
    console.log('fdsfsadf');
    this.attrs = attrs;
    this.schema = new Schema(this.buildSchemaConfig());
    this.state = EditorState.create(this.buildEditorStateConfig());
    this.view = new EditorView(target, this.buildEditorProps());

    const cssClasses = attrs.classNames || [];
    cssClasses.forEach((className) => this.view.dom.classList.add(className));
  }

  buildSchemaConfig() {
    const newSpec = {
      nodes: schema.spec.nodes,
      marks: schema.spec.marks,
    };

    return newSpec;
  }

  buildEditorStateConfig() {
    return {
      doc: defaultMarkdownParser.parse(this.attrs.value),
      disabled: this.attrs.disabled,
      schema: this.schema,
      plugins: this.buildPluginItems().toArray(),
    };
  }

  buildPluginItems() {
    const items = new ItemList();

    items.add('markdownInputrules', buildInputRules(schema));

    items.add(
      'listIndentationKeybinds',
      keymap({ 'Ctrl-m': sinkListItem(schema.nodes.list_item), 'Ctrl-Shift-m': liftListItem(schema.nodes.list_item) })
    );

    items.add('markdownKeybinds', keymap(buildKeymap(schema)));

    items.add('submit', keymap({ 'Mod-Enter': this.attrs.onsubmit }));

    items.add('baseKeymap', keymap(baseKeymap));

    items.add('shiftEnterSameAsEnter', keymap({ 'Shift-Enter': baseKeymap['Enter'] }));

    items.add('placeholder', placeholderPlugin(this.attrs.placeholder));

    items.add('history', history());

    items.add('historyKeymap', keymap({ 'Mod-z': undo, 'Mod-y': redo }));

    items.add('disabled', disabledPlugin());

    items.add('dropCursor', dropCursor());

    return items;
  }

  buildEditorProps() {
    const self = this;

    return {
      state: this.state,
      dispatchTransaction(transaction) {
        let newState = this.state.apply(transaction);
        this.updateState(newState);

        const newDoc = this.state.doc;
        const newDocPlaintext = self.serializeContent(newDoc, self.schema);
        self.attrs.oninput(newDocPlaintext);
      },
    };
  }

  parseInitialValue(text, schema) {
    return defaultMarkdownParser.parse(text);
  }

  serializeContent(doc, schema) {
    return defaultMarkdownSerializer.serialize(doc);
  }

  // External Control Stuff

  /**
   * Focus the textarea and place the cursor at the given index.
   *
   * @param {number} position
   */
  moveCursorTo(position) {
    this.setSelectionRange(position, position);
  }

  /**
   * Get the selected range of the textarea.
   *
   * @return {Array}
   */
  getSelectionRange() {
    return [this.view.state.selection.from, this.view.state.selection.to];
  }

  /**
   * Insert content into the textarea at the position of the cursor.
   *
   * @param {String} text
   */
  insertAtCursor(text) {
    this.insertAt(this.getSelectionRange()[0], text);
  }

  /**
   * Insert content into the textarea at the given position.
   *
   * @param {number} pos
   * @param {String} text
   */
  insertAt(pos, text) {
    this.insertBetween(pos, pos, text);
  }

  /**
   * Insert content into the textarea between the given positions.
   *
   * If the start and end positions are different, any text between them will be
   * overwritten.
   *
   * @param start
   * @param end
   * @param text
   */
  insertBetween(start, end, text) {
    const nodes = defaultMarkdownParser.parse(text);

    this.view.dispatch(this.view.state.tr.insert(start, nodes, end));

    // Move the textarea cursor to the end of the content we just inserted.
    this.moveCursorTo(start + text.length);
  }

  /**
   * Replace existing content from the start to the current cursor position.
   *
   * @param start
   * @param text
   */
  replaceBeforeCursor(start, text) {
    this.insertBetween(start, this.getSelectionRange()[0], text);
  }

  /**
   * Set the selected range of the textarea.
   *
   * @param {number} start
   * @param {number} end
   * @private
   */
  setSelectionRange(start, end) {
    const $start = this.view.state.tr.doc.resolve(start);
    const $end = this.view.state.tr.doc.resolve(end);

    this.view.dispatch(this.view.state.tr.setSelection(new TextSelection($start, $end)));
    this.focus();
  }

  getCaretCoordinates(position, options) {
    return { left: 0, top: 0, height: 0 };
  }

  focus() {
    this.view.focus();
  }
  destroy() {
    this.view.destroy();
  }

  disabled(disabled) {
    this.view.dispatch(this.view.state.tr.setMeta('disabled', disabled));
  }
}
