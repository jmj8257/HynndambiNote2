import { defineStore } from 'pinia';
import { NoteNode, NoteDocument } from 'src/models/NoteNode';


export const useNoteStore = defineStore('notes', {
  state: () => ({
    document: {
      nodes: [],
      rootId: '',
    } as NoteDocument,
  }),
  actions: {
    addNode(node: NoteNode) {
      this.document.nodes.push(node);
      if (!this.document.rootId) this.document.rootId = node.id;
      this.saveToLocal();
    },
    updateNode(id: string, updates: Partial<NoteNode>) {
      const node = this.document.nodes.find((n) => n.id === id);
      if (node) {
        Object.assign(node, updates);
        this.saveToLocal();
      }
    },
    saveToLocal() {
      localStorage.setItem('notes', JSON.stringify(this.document));
    },
    loadFromLocal() {
      const saved = localStorage.getItem('notes');
      if (saved) this.document = JSON.parse(saved);
    },
  },
});
