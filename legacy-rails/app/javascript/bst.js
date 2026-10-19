/*
 * bst.js — page wiring for the plain Binary Search Tree visualizer.
 *
 * The BST page uses the BSTVisualizer parent class directly. The AVL page
 * (avl_tree.js) extends this same class as AVLVisualizer — the search walk,
 * node drawing, animation engine and insert/delete skeletons are shared via
 * inheritance; only the rebalancing is added by the subclass.
 */

import { BSTVisualizer } from 'bst_visualizer';

let activeBST = null;

function initBSTPage() {
  const $ = id => document.getElementById(id);
  const container = $('container');
  if (!container || typeof Konva === 'undefined') return;
  if (activeBST && activeBST.container === container) return;
  container.querySelectorAll('.konvajs-content').forEach(el => el.remove()); // stale Turbo snapshot

  const viz = activeBST = new BSTVisualizer(container);
  viz.status('Ready', 'Insert values one by one, or run a sequence like 10, 5, 15, 3.');

  const okValue = v => Number.isInteger(v) && v >= -999 && v <= 9999;

  // 🧩 Insert: single value OR comma/space-separated sequence (sequence wins)
  const handleInsert = async () => {
    const arrayVal = $('arrayInput')?.value.trim();
    if (arrayVal) {
      const vals = arrayVal.split(/[\s,]+/).filter(Boolean).map(Number).filter(okValue);
      if (!vals.length) {
        viz.status('Enter whole numbers', 'Separate values with commas or spaces, e.g. 10, 5, 15, 3.', 'danger');
        return;
      }
      if (await viz.insertMany(vals)) { if ($('arrayInput')) $('arrayInput').value = ''; }
      return;
    }
    const raw = $('nodeInput')?.value.trim();
    const v = Number(raw);
    if (!raw || !okValue(v)) {
      viz.status('Enter a whole number', 'Use a value between -999 and 9999.', 'danger');
      return;
    }
    if (await viz.insert(v)) { if ($('nodeInput')) $('nodeInput').value = ''; }
  };

  // 🗑️ Delete
  const handleDelete = () => {
    const v = Number($('deleteInput')?.value.trim());
    if (okValue(v)) viz.delete(v);
    if ($('deleteInput')) $('deleteInput').value = '';
  };

  // 🔍 Find
  const handleFind = () => {
    const v = Number($('findInput')?.value.trim());
    if (okValue(v)) viz.search(v);
    if ($('findInput')) $('findInput').value = '';
  };

  // 🔎 Zoom controls
  $('zoomIn')?.addEventListener('click', () => viz.zoom(1.1));
  $('zoomOut')?.addEventListener('click', () => viz.zoom(1 / 1.1));

  $('insertNodeBtn')?.addEventListener('click', handleInsert);
  $('deleteNodeBtn')?.addEventListener('click', handleDelete);
  $('findNodeBtn')?.addEventListener('click', handleFind);
  $('nodeInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleInsert(); } });
  $('arrayInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleInsert(); } });
  $('deleteInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleDelete(); } });
  $('findInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleFind(); } });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBSTPage);
else initBSTPage();
document.addEventListener('turbo:load', initBSTPage);
