import { mergeAttributes, Node } from "@tiptap/vue-3";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    title: {
      setTitle: () => ReturnType;
    };
  }
}

export default Node.create({
  name: "title",
  content: "inline*",

  group: "block",

  defining: true,
  addAttributes() {
    return {};
  },
  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "heading-0" }), 0];
  },
  addCommands(): Partial<any> {
    return {
      setTitle:
        (attributes?: Record<string, any>) =>
        ({ commands }: any) => {
          return commands.setNode(this.name, attributes);
        },
    };
  },
});
